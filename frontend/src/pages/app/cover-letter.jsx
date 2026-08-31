'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import AppTopNav from '@/components/app/AppTopNav';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { MonoButton, MonoChip, Ticks, mono, HAIR } from '@/components/app/v3/kit';
import { listCoverLetters } from '@/services/coverLetterApi';

// ---------------------------------------------------------------------------
// Build the meta map + bodies from the user's real cover letters.
// ---------------------------------------------------------------------------
function normalize(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { meta: {}, bodies: {}, order: [] };
  }
  const meta = {};
  const bodies = {};
  const order = [];
  records.forEach((r, i) => {
    const id = String(r.id || r._id || r.company || `letter-${i}`);
    const company = r.company || r.companyName || 'Company';
    meta[id] = {
      id,
      company,
      role: r.role || r.jobTitle || r.title || '',
      team: r.team || 'Hiring',
      focus: r.focus || 'your work',
      value: r.value || 'your mission',
      status: r.status || 'Draft',
      posting: [r.role || r.jobTitle || r.title, company, r.keywords || r.focus]
        .filter(Boolean)
        .join(' · '),
    };
    bodies[id] = r.body || r.content || '';
    order.push(id);
  });
  return { meta, bodies, order };
}

// compose(): generic scaffold built from the letter's own metadata. Uses
// bracketed placeholders rather than fabricated achievements — the product
// does not invent qualifications the candidate has not claimed.
function compose(meta, id, tone, length) {
  const m = meta[id] || {};
  const company = m.company || 'the company';
  const team = m.team || 'Hiring';
  const role = m.role || 'this role';
  const value = m.value || 'your mission';
  const focus = m.focus || 'your work';
  const greeting = `Dear ${company} ${team} team,`;
  const intro = {
    confident: `I'm excited to apply for the ${role} role at ${company}. Your focus on ${value} is exactly the kind of work I want to do.`,
    warm: `I've admired ${company}'s work for a while, and the ${role} role feels like a natural fit for what I love doing.`,
    concise: `I'm applying for the ${role} role at ${company} — in short, I bring the skills and drive this team needs.`,
  }[tone];
  const b1 = `[Describe a recent accomplishment, with a specific result, that shows the impact you'd bring to ${company}.]`;
  const b2 = `[Connect your experience to ${focus} and explain why it matters for this role.]`;
  const b3 = `[Share what draws you to ${value} and how you'd contribute from day one.]`;
  const close = {
    confident: `I'd love to show you how I'd raise the bar on ${focus}.`,
    warm: `I'd be thrilled to talk about how I could help the team.`,
    concise: `Happy to dive into specifics whenever works.`,
  }[tone];
  const mids = length === 'brief' ? [b1] : length === 'detailed' ? [b1, b2, b3] : [b1, b2];
  return [greeting, intro, ...mids, close, 'Best,\n[Your name]'].join('\n\n');
}

const TONES = [
  { key: 'confident', label: 'Confident' },
  { key: 'warm', label: 'Warm' },
  { key: 'concise', label: 'Concise' },
];
const LENGTHS = { brief: 4, standard: 8, detailed: 12 };

export default function AppCoverLetter() {
  const [data, setData] = useState(() => normalize(null));
  const [selected, setSelected] = useState(null);
  const [tone, setTone] = useState('confident');
  const [length, setLength] = useState('standard');
  const [bodies, setBodies] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await listCoverLetters();
        if (!alive) return;
        const list = res?.coverLetters || res?.letters || (Array.isArray(res) ? res : []);
        const norm = normalize(list);
        setData(norm);
        setBodies(norm.bodies);
        setSelected(norm.order[0] || null);
      } catch (e) {
        if (alive) setError(e || new Error('Could not load your cover letters'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const m = selected ? data.meta[selected] : null;
  const body = selected ? bodies[selected] || '' : '';

  const regenerate = (nextTone = tone, nextLength = length) => {
    if (!selected) return;
    setBodies((prev) => ({ ...prev, [selected]: compose(data.meta, selected, nextTone, nextLength) }));
  };

  /*
   * v3's right rail is "Checks" — measured facts about the draft, not a
   * quality score. Every one of these is computed from the text in front of
   * the user, so none of them can be wrong about the draft.
   */
  const checks = useMemo(() => {
    const words = body.trim() ? body.trim().split(/\s+/).length : 0;
    const paras = body.trim() ? body.trim().split(/\n{2,}/).length : 0;
    const placeholders = (body.match(/\[[^\]]+\]/g) || []).length;
    const named = m?.company && body.includes(m.company);
    return [
      { label: 'Words', val: String(words), ok: words >= 150 && words <= 400 },
      { label: 'Paragraphs', val: String(paras), ok: paras >= 3 },
      { label: 'Placeholders left', val: String(placeholders), ok: placeholders === 0 },
      { label: 'Names the company', val: named ? 'Yes' : 'No', ok: !!named },
    ];
  }, [body, m]);

  return (
    <>
      <Head>
        <title>Cover letter · Jobocate</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', color: 'var(--jb-v3-fg)' }}>
        <AppTopNav />

        {loading && <div style={{ padding: 40 }}><LoadingState label="Loading your letters…" /></div>}
        {!loading && error && (
          <div style={{ padding: 40 }}>
            <ErrorState error={error} onRetry={() => window.location.reload()} />
          </div>
        )}

        {!loading && !error && !selected && (
          <div style={{ padding: 40 }}>
            <EmptyState
              title="No cover letters yet"
              hint="Generate one from a match and it opens here for editing."
              action={
                <MonoButton href="/app/matches" style={{ marginTop: 8 }}>
                  Browse matches
                </MonoButton>
              }
            />
          </div>
        )}

        {!loading && !error && selected && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '300px 1fr 300px',
              minHeight: 'calc(100vh - 56px)',
            }}
          >
            {/* left: the posting and the two knobs */}
            <div style={{ borderRight: HAIR, padding: '24px 20px' }}>
              <div style={{ ...mono(), marginBottom: 12 }}>Posting</div>
              <div
                style={{
                  border: HAIR,
                  borderRadius: 2,
                  padding: 12,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'var(--jb-v3-fg-2)',
                }}
              >
                {m.posting || 'No posting linked to this letter.'}
              </div>

              <div style={{ ...mono(), margin: '24px 0 12px' }}>Tone</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {TONES.map((t) => (
                  <MonoChip
                    key={t.key}
                    on={tone === t.key}
                    onClick={() => {
                      setTone(t.key);
                      regenerate(t.key, length);
                    }}
                  >
                    {t.label}
                  </MonoChip>
                ))}
              </div>

              <div style={{ ...mono(), margin: '24px 0 12px' }}>Length</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {Object.keys(LENGTHS).map((k) => (
                  <MonoChip
                    key={k}
                    on={length === k}
                    onClick={() => {
                      setLength(k);
                      regenerate(tone, k);
                    }}
                  >
                    {k}
                  </MonoChip>
                ))}
              </div>
              <Ticks pct={LENGTHS[length] / 12} n={12} height={12} grow />

              {data.order.length > 1 && (
                <>
                  <div style={{ ...mono(), margin: '24px 0 12px' }}>Letters</div>
                  {data.order.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelected(id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 0,
                        borderTop: HAIR,
                        padding: '11px 0',
                        cursor: 'pointer',
                        fontSize: 12.5,
                        color: id === selected ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)',
                      }}
                    >
                      {data.meta[id].company}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* middle: the letter itself, on paper */}
            <div
              style={{
                padding: 30,
                display: 'flex',
                justifyContent: 'center',
                background: 'var(--jb-v3-sunk)',
              }}
            >
              {/*
               * The sheet is a document, not app chrome: it stays light in both
               * themes because that is what it will be printed and sent as.
               */}
              <textarea
                value={body}
                onChange={(e) => setBodies((prev) => ({ ...prev, [selected]: e.target.value }))}
                spellCheck
                style={{
                  width: '100%',
                  maxWidth: 560,
                  minHeight: 640,
                  resize: 'vertical',
                  background: '#F6F4EE',
                  color: '#16161C',
                  border: HAIR,
                  borderRadius: 2,
                  padding: '46px 48px',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              />
            </div>

            {/* right: checks + the one action */}
            <div style={{ borderLeft: HAIR, padding: '24px 20px' }}>
              <div style={{ ...mono(), marginBottom: 14 }}>Checks</div>
              {checks.map((c) => (
                <div
                  key={c.label}
                  style={{
                    borderTop: HAIR,
                    padding: '11px 0',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      width: 3,
                      height: 12,
                      display: 'block',
                      flex: 'none',
                      background: c.ok ? 'var(--jb-v3-ok)' : 'var(--jb-v3-warn)',
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--jb-v3-fg-2)' }}>
                    {c.label}
                  </span>
                  <span style={mono(10, '0')}>{c.val}</span>
                </div>
              ))}
              <div style={{ borderTop: HAIR, marginBottom: 20 }} />
              <MonoButton block filled onClick={() => regenerate()} style={{ padding: '9px 0' }}>
                Regenerate
              </MonoButton>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
