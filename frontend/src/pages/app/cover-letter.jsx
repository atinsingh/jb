'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { listCoverLetters } from '@/services/coverLetterApi';

// ---------------------------------------------------------------------------
// Sample data — faithful port of the design's Component.meta() + initialBodies()
// ---------------------------------------------------------------------------
const SAMPLE_META = {
  stripe: {
    id: 'stripe', company: 'Stripe', role: 'Senior Product Designer', team: 'Design',
    focus: 'Checkout', value: 'craft and measurable impact',
    logo: 'St', logoBg: '#EAF6EE', logoFg: '#157A49', status: 'Final', edited: 'Edited Jun 18',
  },
  figma: {
    id: 'figma', company: 'Figma', role: 'Product Designer, Design Systems', team: 'Design Systems',
    focus: 'the component platform', value: 'tools that empower other designers',
    logo: 'Fi', logoBg: '#F4EFE4', logoFg: '#1B1A16', status: 'Draft', edited: 'Edited Jun 22',
  },
  linear: {
    id: 'linear', company: 'Linear', role: 'Design Engineer', team: 'Design Engineering',
    focus: 'the app’s interaction quality', value: 'speed and obsessive polish',
    logo: 'Li', logoBg: '#F4EFE4', logoFg: '#1B1A16', status: 'Draft', edited: 'Edited Jun 24',
  },
};

const SAMPLE_BODIES = {
  stripe:
    "Dear Stripe Design team,\n\nI've spent the last seven years shaping 0→1 fintech and B2B SaaS products, most recently leading the onboarding redesign at Plaid that lifted activation 31% across 2M users. Stripe's focus on craft and measurable impact is exactly where I do my best work.\n\nI'd bring deep design-systems experience — I built the system adopted by 40+ engineers at Plaid — and a bias for shipping tested, data-backed work. I'd love to help raise the bar on Checkout.\n\nBest,\nSarah Chen",
  figma:
    "Dear Figma Design Systems team,\n\nI've admired Figma for years — it's the tool my teams live in. The Product Designer, Design Systems role is the rare opening where what I love doing and what you need line up almost exactly.\n\nAt Plaid I built and scaled the design system adopted by 40+ engineers across six teams, balancing consistency with the flexibility product teams actually need. I'd bring that same systems thinking to the component platform.\n\nBest,\nSarah Chen",
  linear:
    "Dear Linear team,\n\nLinear sets the bar for interaction quality, and that's exactly the kind of work I care most about. I'm excited about the Design Engineer role and the chance to work where design and front-end meet.\n\nI prototype in code, sweat motion and detail, and have shipped 0→1 fintech products end to end. I'd love to help keep the app's polish obsessive as it grows.\n\nBest,\nSarah Chen",
};

// Build the meta map + bodies from real backend data, falling back to sample.
function normalize(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { meta: SAMPLE_META, bodies: SAMPLE_BODIES, order: Object.keys(SAMPLE_META) };
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
      team: r.team || 'Design',
      focus: r.focus || 'your mission',
      value: r.value || 'craft and measurable impact',
      logo: r.logo || company.slice(0, 2),
      logoBg: r.logoBg || '#F4EFE4',
      logoFg: r.logoFg || '#1B1A16',
      status: r.status || 'Draft',
      edited: r.edited || (r.updatedAt ? `Edited ${new Date(r.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Draft'),
    };
    bodies[id] = r.body || r.content || '';
    order.push(id);
  });
  return { meta, bodies, order };
}

// compose(): faithful port of Component.compose(id, tone, length)
function compose(meta, id, tone, length) {
  const m = meta[id];
  const greeting = 'Dear ' + m.company + ' ' + m.team + ' team,';
  const intro = {
    confident: "I've spent seven years shipping 0→1 fintech and B2B SaaS products that move real numbers, and " + m.company + "'s focus on " + m.value + " is exactly where I do my best work.",
    warm: "I've followed " + m.company + "'s work for a long time, and the " + m.role + " role feels like the rare opening where what I love doing and what you need line up.",
    concise: "I'm applying for the " + m.role + " role. In short: I ship measurable, well-crafted product design — and " + m.company + " is where I want to do it next.",
  }[tone];
  const b1 = "Most recently I led the onboarding redesign at Plaid that lifted activation 31% across two million users — equal parts systems thinking and relentless attention to craft.";
  const b2 = "I also built the design system adopted by 40+ engineers across six teams, so I know how to keep " + m.focus + " coherent as it scales.";
  const b3 = "Beyond the metrics, I care about " + m.value + ", and I'd bring that bias to " + m.company + " from day one.";
  const close = {
    confident: "I'd love to show you how I'd raise the bar on " + m.focus + ".",
    warm: "I'd be thrilled to talk about how I could help the team.",
    concise: "Happy to dive into specifics whenever works.",
  }[tone];
  const mids = length === 'brief' ? [b1] : (length === 'detailed' ? [b1, b2, b3] : [b1, b2]);
  return [greeting, intro, ...mids, close, 'Best,\nSarah Chen'].join('\n\n');
}

const statusStyle = (s) =>
  s === 'Final'
    ? { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' }
    : { color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };

const TONES = [
  { key: 'confident', label: 'Confident' },
  { key: 'warm', label: 'Warm' },
  { key: 'concise', label: 'Concise' },
];
const LENGTHS = [
  { key: 'brief', label: 'Brief' },
  { key: 'standard', label: 'Standard' },
  { key: 'detailed', label: 'Detailed' },
];

export default function AppCoverLetter() {
  // data: { meta, bodies, order } — starts on sample, replaced by backend on success
  const [data, setData] = useState(() => normalize(null));
  const [selected, setSelected] = useState('stripe');
  const [tone, setTone] = useState('confident');
  const [length, setLength] = useState('standard');
  const [bodies, setBodies] = useState(SAMPLE_BODIES);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // ---- backend fetch with graceful fallback to the design's sample data ----
  useEffect(() => {
    let alive = true;
    listCoverLetters()
      .then((records) => {
        if (!alive) return;
        const norm = normalize(records);
        // Only adopt backend data if it actually returned letters.
        if (norm.order.length && norm !== SAMPLE_META) {
          setData(norm);
          setBodies(norm.bodies);
          setSelected(norm.order[0]);
        }
      })
      .catch(() => {
        /* unauthenticated or request failed — keep faithful sample data */
      });
    return () => {
      alive = false;
    };
  }, []);

  // ---- save indicator (port of markSaving / saveTimer) ----
  const markSaving = () => {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaving(false), 700);
  };
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const setBody = (id, body) => {
    setBodies((b) => ({ ...b, [id]: body }));
    markSaving();
  };

  const recompose = (nextTone = tone, nextLength = length) => {
    setBody(selected, compose(data.meta, selected, nextTone, nextLength));
  };

  const pickTone = (key) => {
    setTone(key);
    setBody(selected, compose(data.meta, selected, key, length));
  };
  const pickLength = (key) => {
    setLength(key);
    setBody(selected, compose(data.meta, selected, tone, key));
  };

  const m = data.meta[selected] || Object.values(data.meta)[0];

  // ---- AI suggestion edits (port of editParas + suggestions) ----
  const editParas = (transform) => {
    const paras = (bodies[selected] || '').split('\n\n');
    setBody(selected, transform(paras.slice()).join('\n\n'));
  };
  const metricPara = "Earlier, I cut time-to-first-payment by 24% at Plaid — proof I optimize for outcomes, not just output.";
  const valuesPara = "What draws me to " + m.company + " specifically is " + m.value + " — it's how I already try to work.";
  const conciseIntro = "I'm applying for the " + m.role + " role at " + m.company + ", where I believe my design-systems and fintech background fit cleanly.";

  const suggestions = [
    { label: 'Add a metric', apply: () => editParas((p) => { const i = Math.max(1, p.length - 2); p.splice(i, 0, metricPara); return p; }) },
    { label: 'Tighten intro', apply: () => editParas((p) => { if (p.length > 1) p[1] = conciseIntro; return p; }) },
    { label: 'Mirror their values', apply: () => editParas((p) => { p.splice(p.length - 1, 0, valuesPara); return p; }) },
  ];

  const letters = useMemo(
    () =>
      data.order.map((id) => {
        const L = data.meta[id];
        const on = id === selected;
        const ss = statusStyle(L.status);
        return { ...L, on, statusColor: ss.color, statusBg: ss.bg, statusBorder: ss.border };
      }),
    [data, selected]
  );

  const savedLabel = saving ? 'Saving…' : 'All changes saved';
  const savedColor = saving ? '#9A6A2E' : '#157A49';
  const savedDot = saving ? '#C9622E' : '#1FA463';

  const mono = "'JetBrains Mono',monospace";
  const segLabel = { fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
  const segWrap = { display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 };

  return (
    <>
      <Head>
        <title>Cover letters — Jobocate</title>
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
        #jbapp textarea:focus,
        #jbapp input:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.99);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}
      >
        <AppSidebar active="resume" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 28px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}
          >
            <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Toolkit / Cover letters</div>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('App Resume.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>Resume builder →</Link>
          </header>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* ===== LEFT: LETTER LIST ===== */}
            <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #E7E0D2', background: '#FBF8F1', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flexShrink: 0, padding: '20px 18px 14px' }}>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 26, lineHeight: 1, margin: '0 0 4px' }}>Cover letters</h1>
                <p style={{ fontSize: 13, color: '#8A8378', margin: 0 }}>{letters.length} letters · drafted by AI, edited by you</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {letters.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelected(l.id)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      textAlign: 'left',
                      background: '#FFFEFB',
                      border: `1.5px solid ${l.on ? '#1FA463' : '#E6DECF'}`,
                      boxShadow: l.on ? '0 0 0 3px rgba(31,164,99,0.16)' : 'none',
                      borderRadius: 14,
                      padding: 15,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 9 }}>
                      <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: l.logoBg, color: l.logoFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{l.logo}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.company}</span>
                      <span style={{ flexShrink: 0, fontFamily: mono, fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: l.statusColor, background: l.statusBg, border: `1px solid ${l.statusBorder}`, padding: '3px 7px', borderRadius: 999 }}>{l.status}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#5A544A', marginBottom: 5 }}>{l.role}</div>
                    <div style={{ fontFamily: mono, fontSize: 10.5, color: '#A79E8F' }}>{l.edited}</div>
                  </button>
                ))}
                <Link
                  href={appRoute('App Matches.dc.html')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, padding: 13, border: '1.5px dashed #D2C9B7', borderRadius: 14, fontSize: 13.5, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}
                >✦ New from a role</Link>
              </div>
            </div>

            {/* ===== RIGHT: EDITOR ===== */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F7F3EA' }}>
              {/* EDITOR TOP ROW */}
              <div style={{ flexShrink: 0, padding: '18px 28px', background: '#FFFEFB', borderBottom: '1px solid #E7E0D2', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{m.company} cover letter</div>
                    <div style={{ fontSize: 13, color: '#8A8378' }}>{m.role}</div>
                  </div>
                  <button
                    onClick={() => recompose()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '10px 16px', cursor: 'pointer' }}
                  >✦ Regenerate with AI</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={segLabel}>Tone</span>
                    <div style={segWrap}>
                      {TONES.map((t) => {
                        const on = tone === t.key;
                        return (
                          <button
                            key={t.key}
                            onClick={() => pickTone(t.key)}
                            style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '6px 13px', cursor: 'pointer', boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none' }}
                          >{t.label}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={segLabel}>Length</span>
                    <div style={segWrap}>
                      {LENGTHS.map((l) => {
                        const on = length === l.key;
                        return (
                          <button
                            key={l.key}
                            onClick={() => pickLength(l.key)}
                            style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '6px 13px', cursor: 'pointer', boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none' }}
                          >{l.label}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* EDITOR BODY (scroll) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  <textarea
                    value={bodies[selected] || ''}
                    onChange={(e) => setBody(selected, e.target.value)}
                    style={{ width: '100%', minHeight: 380, fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.7, color: '#2A2820', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 14, padding: 24, resize: 'vertical', animation: 'rbpop 0.2s ease' }}
                  />

                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 10 }}>AI suggestions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                      {suggestions.map((s) => (
                        <button
                          key={s.label}
                          onClick={s.apply}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' }}
                        ><span style={{ fontSize: 11 }}>✦</span>{s.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: '#FFFEFB', borderTop: '1px solid #E7E0D2' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: savedColor }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: savedDot }} />{savedLabel}
                </span>
                <div style={{ flex: 1 }} />
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '11px 18px', cursor: 'pointer' }}>↧ Export PDF</button>
                <Link href={appRoute('App Apply.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1B1A16', color: '#F7F3EA', fontSize: 14, fontWeight: 600, padding: '11px 20px', borderRadius: 999, textDecoration: 'none' }}>Use in application →</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
