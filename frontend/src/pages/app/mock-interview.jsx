'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import { getInterviewApplications } from '@/services/interviewApi';

/* ------------------------------------------------------------- sample data ---
 * Ported verbatim from the design's DCLogic `questions()`. Used as the always-on
 * fallback so the page renders faithfully when unauthenticated or offline.
 * ------------------------------------------------------------------------- */
const SAMPLE_QUESTIONS = [
  {
    q: 'Tell me about yourself and what drew you to product design.',
    category: 'Behavioral',
    difficulty: 'Easy',
    hint: 'Keep it to ~90 seconds: a through-line from how you started to why this role, not a résumé recital.',
    followUp: 'What part of that story is most relevant to Stripe specifically?',
    scores: { structure: 70, specificity: 62, pace: 80 },
  },
  {
    q: 'Describe a time you disagreed with an engineer. How did you resolve it?',
    category: 'Behavioral',
    difficulty: 'Medium',
    hint: 'Anchor in one concrete disagreement. Show the data or user signal that moved the decision.',
    followUp: 'What would you do differently if it happened again?',
    scores: { structure: 74, specificity: 68, pace: 72 },
  },
  {
    q: 'Walk me through a project you’re proud of — start to finish.',
    category: 'Craft',
    difficulty: 'Medium',
    hint: 'Use STAR. Lead with the problem and the metric you moved, not the visuals.',
    followUp: 'How did you know the redesign actually caused the +31% activation lift?',
    scores: { structure: 82, specificity: 78, pace: 68 },
  },
  {
    q: 'How would you build a design system from scratch for a 40-person eng org?',
    category: 'Systems',
    difficulty: 'Medium',
    hint: 'Talk sequencing: audit → tokens → core components → adoption → governance.',
    followUp: 'How do you get engineers to actually adopt it?',
    scores: { structure: 80, specificity: 72, pace: 74 },
  },
  {
    q: 'Critique Stripe Checkout. What would you change, and why?',
    category: 'Craft',
    difficulty: 'Hard',
    hint: 'Pick two or three specific, prioritized changes. Tie each to a user or business outcome.',
    followUp: 'Which change would you ship first, and how would you measure it?',
    scores: { structure: 76, specificity: 84, pace: 66 },
  },
  {
    q: 'Tell me about a launch that didn’t go as planned.',
    category: 'Behavioral',
    difficulty: 'Medium',
    hint: 'Own the miss, then focus on the recovery and the system you put in place after.',
    followUp: 'What signal did you miss early that you’d watch for now?',
    scores: { structure: 72, specificity: 70, pace: 78 },
  },
  {
    q: 'How do you balance consistency and flexibility in component APIs?',
    category: 'Systems',
    difficulty: 'Hard',
    hint: 'Name the trade-off explicitly. Use a real prop/variant decision you’ve made.',
    followUp: 'When is an escape hatch worth the inconsistency it allows?',
    scores: { structure: 78, specificity: 74, pace: 70 },
  },
  {
    q: 'How do you measure the success of a design?',
    category: 'Craft',
    difficulty: 'Medium',
    hint: 'Separate leading vs lagging metrics, and qualitative vs quantitative signals.',
    followUp: 'What do you do when the metric improves but users complain?',
    scores: { structure: 80, specificity: 76, pace: 76 },
  },
];

const STAR = [
  { letter: 'S', title: 'Situation', desc: 'Set the context in a sentence.' },
  { letter: 'T', title: 'Task', desc: 'What was your responsibility?' },
  { letter: 'A', title: 'Action', desc: 'The specific moves you made.' },
  { letter: 'R', title: 'Result', desc: 'The measurable outcome.' },
];

/* score-summary constants (ported from design) */
const OVERALL = 84;
const SCORE_VERDICT = 'Strong session.';
const SCORE_SUMMARY =
  'Your structure and specificity were consistently high. Tighten pacing on craft questions — you tend to over-explain the visuals before the impact.';
const CAT_SCORES_RAW = [
  { label: 'Behavioral', value: 88 },
  { label: 'Craft', value: 82 },
  { label: 'Systems', value: 80 },
];

/* ----------------------------------------------------------------- helpers --- */
const catStyle = (cat) => {
  if (cat === 'Behavioral') return { bg: '#EAF6EE', fg: '#157A49', border: '#CDE9D6' };
  if (cat === 'Craft') return { bg: '#F7ECE3', fg: '#C9622E', border: '#EAD0C4' };
  return { bg: '#E8EEF5', fg: '#2A4A6B', border: '#D2DDEB' };
};
const diffDots = (d) => (d === 'Easy' ? '●○○' : d === 'Medium' ? '●●○' : '●●●');
const meterColor = (v) => (v >= 78 ? '#157A49' : v >= 65 ? '#1FA463' : '#C9622E');
const fmtTime = (elapsed) => {
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  return `${mm}:${ss < 10 ? '0' + ss : ss}`;
};

export default function AppMockInterview() {
  const { user } = useAuth();

  /* ---- backend context (graceful fallback to the design's Stripe role) ---- */
  const [role, setRole] = useState({ title: 'Senior Product Designer', company: 'Stripe' });
  const [questions, setQuestions] = useState(SAMPLE_QUESTIONS);

  /* ---- session state (mirrors the DCLogic `state` object) ---- */
  const [q, setQ] = useState(2);
  const [elapsed, setElapsed] = useState(512);
  const [recording, setRecording] = useState(false);
  const [ended, setEnded] = useState(false);
  const [mode, setMode] = useState('voice'); // 'voice' | 'text'
  const [hint, setHint] = useState(false);
  const [draft, setDraft] = useState('');

  const ivRef = useRef(null);

  /* fetch real interview context; never crash, always fall back */
  useEffect(() => {
    let cancelled = false;
    if (!user) return undefined;
    (async () => {
      try {
        const data = await getInterviewApplications();
        const apps = data?.applications || data || [];
        const first = Array.isArray(apps) ? apps[0] : null;
        if (!cancelled && first) {
          const title = first.jobTitle || first.title || first.role || first.position;
          const company = first.company || first.companyName || first.employer;
          if (title || company) {
            setRole((r) => ({ title: title || r.title, company: company || r.company }));
          }
        }
      } catch {
        /* offline / unauthenticated — keep the sample context */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* ticking session timer (componentDidMount / componentWillUnmount port) */
  useEffect(() => {
    ivRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(ivRef.current);
  }, []);

  useEffect(() => {
    if (ended) clearInterval(ivRef.current);
  }, [ended]);

  /* ---- derived render values (renderVals port) ---- */
  const qs = questions;
  const cur = qs[Math.min(q, qs.length - 1)];
  const cs = catStyle(cur.category);
  const live = !ended;
  const timer = fmtTime(elapsed);
  const timerDot = ended ? '#C9BFAC' : '#1FA463';
  const progress = `${((q + 1) / qs.length) * 100}%`;

  const bars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const base = 0.2 + 0.78 * Math.abs(Math.sin(i * 0.9 + 1));
        return {
          scale: base.toFixed(2),
          color: recording ? '#C9622E' : '#D2C9B7',
          anim: recording
            ? `wave ${(0.55 + (i % 5) * 0.07).toFixed(2)}s ease-in-out ${((i % 7) * 0.06).toFixed(2)}s infinite alternate`
            : 'none',
        };
      }),
    [recording]
  );

  const meters = [
    { label: 'Structure', key: 'structure' },
    { label: 'Specificity', key: 'specificity' },
    { label: 'Pace', key: 'pace' },
  ].map((m) => {
    const v = cur.scores[m.key];
    return { label: m.label, value: v, pct: `${v}%`, color: meterColor(v) };
  });

  const catScores = CAT_SCORES_RAW.map((c) => ({
    label: c.label,
    value: c.value,
    pct: `${c.value}%`,
    color: meterColor(c.value),
  }));

  const voiceMode = mode === 'voice';
  const textMode = mode === 'text';
  const micBg = recording ? '#C9622E' : '#1FA463';
  const micFg = recording ? '#FFFFFF' : '#0C2C1C';
  const micAnim = recording ? 'micpulse 1.4s ease-out infinite' : 'none';
  const recordStatus = recording ? 'Recording… tap the mic to stop' : 'Tap the mic to record your answer';
  const modeToggleLabel = mode === 'voice' ? 'Type instead' : 'Record instead';
  const nextLabel = q >= qs.length - 1 ? 'Finish session' : 'Next question';
  const scoreDeg = `${(OVERALL / 100) * 360}deg`;

  /* ---- actions ---- */
  const goNext = () => {
    if (q >= qs.length - 1) {
      setEnded(true);
      setRecording(false);
      return;
    }
    setQ((s) => s + 1);
    setHint(false);
    setRecording(false);
    setDraft('');
    setMode('voice');
  };
  const endSession = () => {
    setEnded(true);
    setRecording(false);
  };
  const toggleRecord = () => setRecording((r) => !r);
  const toggleMode = () => {
    setMode((m) => (m === 'voice' ? 'text' : 'voice'));
    setRecording(false);
  };
  const toggleHint = () => setHint((h) => !h);
  const restart = () => {
    setQ(0);
    setElapsed(0);
    setRecording(false);
    setEnded(false);
    setMode('voice');
    setHint(false);
    setDraft('');
    ivRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  return (
    <>
      <Head>
        <title>Mock interview · {role.title} at {role.company} — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp textarea:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes wave {
          from {
            transform: scaleY(0.18);
          }
          to {
            transform: scaleY(1);
          }
        }
        @keyframes micpulse {
          0% {
            box-shadow: 0 0 0 0 rgba(201, 98, 46, 0.45);
          }
          100% {
            box-shadow: 0 0 0 16px rgba(201, 98, 46, 0);
          }
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="interview" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '13px 32px', background: 'rgba(247,243,234,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.1em', color: '#C9622E', border: '1px solid #EAD0C4', background: '#FBEDE4', padding: '3px 8px', borderRadius: 999 }}>MOCK</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {role.title} <span style={{ color: '#C9BFAC' }}>·</span> <span style={{ color: '#5A544A' }}>{role.company}</span>
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 600, color: '#1B1A16' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: timerDot }} />
              {timer}
            </span>
            <button onClick={endSession} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#C9622E', background: '#FFFEFB', border: '1px solid #EAD0C4', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}>End session</button>
          </header>

          {/* ===== IN-SESSION ===== */}
          {live && (
            <div style={{ display: 'flex', gap: 30, padding: '30px 32px 56px', maxWidth: 1080, width: '100%', margin: '0 auto', alignItems: 'flex-start' }}>
              {/* MAIN */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: '#5A544A', flexShrink: 0 }}>Question {q + 1} of {qs.length}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#E6DECF', overflow: 'hidden' }}>
                    <div style={{ width: progress, height: '100%', background: '#1FA463', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* QUESTION CARD */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 30, marginBottom: 16, animation: 'rbpop 0.25s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: cs.fg, background: cs.bg, border: `1px solid ${cs.border}`, padding: '4px 10px', borderRadius: 999 }}>{cur.category}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>{diffDots(cur.difficulty)} {cur.difficulty}</span>
                  </div>
                  <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 30, lineHeight: 1.18, margin: 0 }}>{cur.q}</h1>
                  {hint && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18, padding: '13px 15px', background: '#FBF9F2', border: '1px dashed #D2C9B7', borderRadius: 12 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', color: '#C9622E', background: '#FBEDE4', border: '1px solid #EAD0C4', padding: '3px 7px', borderRadius: 999, flexShrink: 0 }}>HINT</span>
                      <span style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5A544A' }}>{cur.hint}</span>
                    </div>
                  )}
                </div>

                {/* ANSWER AREA */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24 }}>
                  {voiceMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <button onClick={toggleRecord} style={{ width: 64, height: 64, flexShrink: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', background: micBg, color: micFg, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: micAnim }}>●</button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48, marginBottom: 8 }}>
                          {bars.map((bar, i) => (
                            <span key={i} style={{ flex: 1, height: '100%', borderRadius: 2, background: bar.color, transform: `scaleY(${bar.scale})`, transformOrigin: 'bottom', animation: bar.anim }} />
                          ))}
                        </div>
                        <div style={{ fontSize: 13, color: '#8A8378' }}>{recordStatus}</div>
                      </div>
                    </div>
                  )}

                  {textMode && (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type your answer — aim for Situation → Task → Action → Result…"
                      style={{ width: '100%', minHeight: 150, fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 13, padding: 16, resize: 'vertical' }}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2ECE0' }}>
                    <button onClick={toggleMode} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#157A49', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{modeToggleLabel}</button>
                    <div style={{ flex: 1 }} />
                    <button onClick={toggleHint} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' }}>Hint</button>
                    <button onClick={goNext} style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#8A8378', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer' }}>Skip</button>
                    <button onClick={goNext} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '11px 22px', cursor: 'pointer' }}>{nextLabel} →</button>
                  </div>
                </div>

                {/* AI FOLLOW-UP */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 16, padding: '16px 18px', background: '#15140F', border: '1px solid #2C2A22', borderRadius: 14 }}>
                  <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: '#1E2D24', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✦</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 5 }}>AI follow-up</div>
                    <div style={{ fontSize: 14, lineHeight: 1.5, color: '#E4DECF' }}>{cur.followUp}</div>
                  </div>
                </div>
              </div>

              {/* RIGHT RAIL: COACHING */}
              <div style={{ width: 296, flexShrink: 0, position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463' }} />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#157A49' }}>Live coaching</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {meters.map((m) => (
                      <div key={m.label}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{m.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: m.color }}>{m.value}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden' }}>
                          <div style={{ width: m.pct, height: '100%', background: m.color, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#FBF9F2', border: '1px solid #E6DECF', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 14 }}>STAR method</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {STAR.map((s) => (
                      <div key={s.letter} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                        <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 7, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 12 }}>{s.letter}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B1A16', lineHeight: 1.2 }}>{s.title}</div>
                          <div style={{ fontSize: 12, color: '#8A8378', lineHeight: 1.35 }}>{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== SCORED SUMMARY ===== */}
          {ended && (
            <div style={{ padding: '36px 32px 64px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 20, padding: 36, textAlign: 'center', animation: 'rbpop 0.35s ease' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#157A49', marginBottom: 14 }}>Session complete</div>
                <div style={{ width: 128, height: 128, margin: '0 auto 8px', borderRadius: '50%', background: `conic-gradient(#1FA463 ${scoreDeg}, #EFE8DA 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 104, height: 104, borderRadius: '50%', background: '#FFFEFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 38, fontWeight: 600, lineHeight: 1, color: '#1B1A16' }}>{OVERALL}</span>
                    <span style={{ fontSize: 11, color: '#8A8378' }}>/ 100</span>
                  </div>
                </div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 32, lineHeight: 1.1, margin: '14px 0 6px' }}>{SCORE_VERDICT}</h1>
                <p style={{ fontSize: 14.5, color: '#5A544A', margin: '0 auto 26px', maxWidth: 440 }}>{SCORE_SUMMARY}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left', marginBottom: 28 }}>
                  {catScores.map((c) => (
                    <div key={c.label}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: c.color }}>{c.value}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden' }}>
                        <div style={{ width: c.pct, height: '100%', background: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href={appRoute('App Interview.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1B1A16', color: '#F7F3EA', fontSize: 14.5, fontWeight: 600, padding: '13px 24px', borderRadius: 999, textDecoration: 'none' }}>Review answers →</Link>
                  <button onClick={restart} style={{ fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '13px 24px', cursor: 'pointer' }}>Practice again</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
