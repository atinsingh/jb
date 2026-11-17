'use client';

import { useEffect, useRef, useState } from 'react';

const COLS = 16;
const ROWS = 11;
const DIRS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};
const PAD = [
  ['Left', { x: -1, y: 0 }],
  ['Up', { x: 0, y: -1 }],
  ['Down', { x: 0, y: 1 }],
  ['Right', { x: 1, y: 0 }],
];
const PAUSE_MS = 3200;

function clip(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length < 2 ? '' : text;
}

function isHeaderLine(text) {
  return /location:|client:|duration:|responsibilities:/i.test(text);
}

function factsFrom(resume) {
  const notes = [];
  const pushNote = (value) => {
    const text = clip(value);
    if (text && !notes.includes(text)) notes.push(text);
  };
  (resume?.experience || []).forEach((job) => {
    pushNote(job?.description);
    (job?.achievements || []).forEach(pushNote);
  });
  (resume?.achievements || []).forEach(pushNote);
  const summary = clip(resume?.summary);
  const facts = [];
  const seen = new Set();
  const add = (label, detail) => {
    const name = clip(label);
    if (!name || isHeaderLine(name) || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase());
    const more = clip(detail);
    facts.push({ label: name, detail: more || name });
  };
  (resume?.experience || []).forEach((job) => {
    (job?.achievements || []).forEach((item) => {
      const text = clip(item);
      if (text.length >= 20) add(text, text);
    });
    const role = [job?.title, job?.company].filter(Boolean).join(' at ');
    add(role, clip(job?.description) || summary);
  });
  (resume?.skills || []).forEach((skill) => {
    const name = clip(skill);
    const hit = notes.find((note) => name && note.toLowerCase().includes(name.toLowerCase()));
    add(name, hit || summary);
  });
  (resume?.achievements || []).forEach((item) => add(item, summary));
  if (summary) add(summary, notes[0] || '');
  return facts.slice(0, 24);
}

function board(factIndex = 0) {
  return {
    snake: [{ x: 3, y: 5 }, { x: 2, y: 5 }, { x: 1, y: 5 }],
    dir: { x: 1, y: 0 },
    queued: [],
    food: { x: 6, y: 5 },
    factIndex,
    pausedUntil: 0,
    holdFood: false,
  };
}

function queueDir(state, dir) {
  if (!state || !dir || state.pausedUntil > Date.now()) return;
  const last = state.queued.length ? state.queued[state.queued.length - 1] : state.dir;
  if (last.x + dir.x === 0 && last.y + dir.y === 0) return;
  if (state.queued.length < 2) state.queued.push(dir);
}

function openCell(snake) {
  const head = snake[0];
  const taken = new Set(snake.map((part) => `${part.x},${part.y}`));
  const free = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  const far = free.filter((cell) => Math.abs(cell.x - head.x) + Math.abs(cell.y - head.y) > 4);
  const pool = far.length ? far : free;
  return pool[Math.floor(Math.random() * pool.length)] || { x: 0, y: 0 };
}

function paint(canvas, state) {
  const width = canvas.parentElement?.clientWidth || 0;
  if (width < 32) return;
  const cell = Math.max(18, Math.floor(width / COLS));
  const cssW = cell * COLS;
  const cssH = cell * ROWS;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }
  const ctx = canvas.getContext('2d');
  const style = getComputedStyle(canvas);
  const sunk = style.getPropertyValue('--jb-v3-sunk').trim() || '#08080a';
  const accent = style.getPropertyValue('--jb-v3-accent').trim() || '#2a5bff';
  const warn = style.getPropertyValue('--jb-v3-warn').trim() || '#d9a03f';
  const fg = style.getPropertyValue('--jb-v3-fg').trim() || '#f5f5f4';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = sunk;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.fillStyle = accent;
  state.snake.forEach((part, index) => {
    const pad = index === 0 ? 2 : 3;
    ctx.beginPath();
    ctx.roundRect(part.x * cell + pad, part.y * cell + pad, cell - pad * 2, cell - pad * 2, 6);
    ctx.fill();
  });
  const head = state.snake[0];
  ctx.fillStyle = fg;
  ctx.fillRect(head.x * cell + cell * 0.62, head.y * cell + cell * 0.34, 3, 3);
  const foodX = state.food.x * cell + cell / 2;
  const foodY = state.food.y * cell + cell / 2;
  if (state.holdFood) {
    ctx.strokeStyle = warn;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(foodX, foodY, cell * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = warn;
  ctx.beginPath();
  ctx.arc(foodX, foodY, cell * 0.26, 0, Math.PI * 2);
  ctx.fill();
}

function releaseHold(current) {
  if (!current.holdFood && !current.pausedUntil) return false;
  if (current.holdFood) {
    current.food = openCell(current.snake);
    current.holdFood = false;
  }
  current.pausedUntil = 0;
  return true;
}

function openingFacts(resume, bites) {
  const refined = (Array.isArray(bites) ? bites : []).filter((bite) => bite?.label && bite?.detail && !isHeaderLine(bite.label) && !isHeaderLine(bite.detail));
  if (refined.length) return refined;
  const lines = factsFrom(resume);
  return lines.length ? lines : [{ label: 'A specific line beats a vague one', detail: 'A number you can explain beats a number you rounded up.' }];
}

export default function CompareWaitActivity({ resume, bites }) {
  const facts = useRef(openingFacts(resume, bites)).current;
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const [factIndex, setFactIndex] = useState(0);
  const [kept, setKept] = useState([]);
  const [length, setLength] = useState(3);
  const [crashed, setCrashed] = useState(false);
  const [reading, setReading] = useState(null);
  const fact = facts[factIndex % facts.length];

  const resumePlay = () => {
    const current = stateRef.current;
    if (!current || !releaseHold(current)) return;
    setReading(null);
    setFactIndex(current.factIndex);
    const canvas = canvasRef.current;
    if (canvas) paint(canvas, current);
  };

  useEffect(() => {
    const state = board();
    stateRef.current = state;
    setFactIndex(0);
    setKept([]);
    setLength(3);
    setCrashed(false);
    setReading(null);
    const tickMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 280 : 150;
    const step = () => {
      const current = stateRef.current;
      const canvas = canvasRef.current;
      if (!current || !canvas) return;
      if (current.pausedUntil) {
        if (Date.now() < current.pausedUntil) {
          paint(canvas, current);
          return;
        }
        if (releaseHold(current)) {
          setReading(null);
          setFactIndex(current.factIndex);
          paint(canvas, current);
        }
        return;
      }
      if (current.queued.length) current.dir = current.queued.shift();
      const head = current.snake[0];
      const next = { x: head.x + current.dir.x, y: head.y + current.dir.y };
      const hitWall = next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS;
      const hitSelf = current.snake.some((part) => part.x === next.x && part.y === next.y);
      if (hitWall || hitSelf) {
        stateRef.current = board(current.factIndex);
        setCrashed(true);
        setLength(3);
        paint(canvas, stateRef.current);
        return;
      }
      current.snake.unshift(next);
      if (next.x === current.food.x && next.y === current.food.y) {
        const eaten = facts[current.factIndex % facts.length];
        current.factIndex += 1;
        current.holdFood = true;
        current.pausedUntil = Date.now() + PAUSE_MS;
        setReading(eaten);
        setKept((previous) => [...previous, eaten.label].slice(-4));
        setLength(current.snake.length);
        setCrashed(false);
      } else {
        current.snake.pop();
      }
      paint(canvas, current);
    };
    const onKey = (event) => {
      const dir = DIRS[event.key];
      if (!dir) return;
      event.preventDefault();
      queueDir(stateRef.current, dir);
      setCrashed(false);
    };
    paint(canvasRef.current, state);
    const timer = setInterval(step, tickMs);
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [facts]);

  return (
    <section
      data-testid="compare-snake"
      data-paused={reading ? 'true' : 'false'}
      aria-label="Résumé snake"
      style={{
        background: 'var(--jb-v3-sunk)',
        color: 'var(--jb-v3-fg)',
        border: '1px solid var(--jb-v3-line)',
        borderRadius: 8,
        padding: 18,
        display: 'grid',
        gap: 14,
        boxShadow: '0 14px 32px rgba(0, 0, 0, 0.28)',
      }}
    >
      <style>{`
        .snake-pad button { border: 1px solid var(--jb-v3-line-2); background: var(--jb-v3-panel); color: var(--jb-v3-fg); min-width: 64px; min-height: 40px; border-radius: 6px; cursor: pointer; }
        .snake-pad button:hover { background: var(--jb-v3-accent-soft); }
        .snake-pad button:focus-visible { outline: 2px solid var(--jb-v3-accent); outline-offset: 2px; }
        .snake-detail { position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 16px 16px 14px; background: var(--jb-v3-panel); color: var(--jb-v3-fg); border: 1px solid var(--jb-v3-line-2); border-radius: 10px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38); animation: snake-detail-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1); }
        .snake-detail p { margin: 0; }
        .snake-detail-label { font-family: var(--jb-v3-font-display), system-ui, sans-serif; font-size: 1.35rem; letter-spacing: -0.03em; line-height: 1.15; font-weight: 600; }
        .snake-detail-body { margin-top: 8px; font-size: 15px; line-height: 1.45; color: var(--jb-v3-fg-2); max-width: 62ch; }
        .snake-detail button { margin-top: 12px; border: 1px solid var(--jb-v3-line-2); background: var(--jb-v3-sunk); color: var(--jb-v3-fg); border-radius: 6px; min-height: 36px; padding: 0 12px; cursor: pointer; }
        .snake-detail button:focus-visible { outline: 2px solid var(--jb-v3-accent); outline-offset: 2px; }
        @keyframes snake-detail-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .snake-detail { animation: none; } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end' }}>
        <p data-testid="snake-fact" style={{ margin: 0, maxWidth: '68ch', fontFamily: 'var(--jb-v3-font-display), system-ui, sans-serif', fontSize: 'clamp(1.15rem, 2vw, 1.45rem)', lineHeight: 1.35, letterSpacing: '-0.02em', fontWeight: 600 }}>{fact.label}</p>
        <div style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--jb-v3-fg-2)', fontSize: 14 }}>Length {length}</div>
      </div>
      <p style={{ margin: 0, color: 'var(--jb-v3-fg-2)', fontSize: 15 }}>Steer into that line. Arrow keys, or the buttons.</p>
      <div style={{ position: 'relative', width: '100%', lineHeight: 0 }}>
        <canvas ref={canvasRef} data-testid="snake-board" role="img" aria-label={`Snake chasing ${fact.label}`} />
        {reading && (
          <div className="snake-detail" data-testid="snake-detail" role="status">
            <p className="snake-detail-label">{reading.label}</p>
            {reading.detail !== reading.label && <p className="snake-detail-body">{reading.detail}</p>}
            <button type="button" onClick={resumePlay}>Keep playing</button>
          </div>
        )}
      </div>
      <div className="snake-pad" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PAD.map(([label, dir]) => (
          <button key={label} type="button" aria-label={label} onClick={() => { queueDir(stateRef.current, dir); setCrashed(false); }}>{label}</button>
        ))}
      </div>
      {crashed && <p style={{ margin: 0, color: 'var(--jb-v3-warn)' }}>Hit the wall. The line is still there.</p>}
      {kept.length > 0 && <p data-testid="snake-kept" style={{ margin: 0, color: 'var(--jb-v3-fg-2)', fontSize: 14 }}>Kept {kept.join(' · ')}</p>}
    </section>
  );
}
