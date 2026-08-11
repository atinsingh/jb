'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { listCoverLetters } from '@/services/coverLetterApi';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';

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

// compose(): generic cover-letter scaffold built from the letter's own
// metadata. Uses bracketed placeholders instead of fabricated achievements.
function compose(meta, id, tone, length) {
  const m = meta[id] || {};
  const company = m.company || 'the company';
  const team = m.team || 'Hiring';
  const role = m.role || 'this role';
  const value = m.value || 'your mission';
  const focus = m.focus || 'your work';
  const greeting = 'Dear ' + company + ' ' + team + ' team,';
  const intro = {
    confident: "I'm excited to apply for the " + role + " role at " + company + ". Your focus on " + value + " is exactly the kind of work I want to do.",
    warm: "I've admired " + company + "'s work for a while, and the " + role + " role feels like a natural fit for what I love doing.",
    concise: "I'm applying for the " + role + " role at " + company + " — in short, I bring the skills and drive this team needs.",
  }[tone];
  const b1 = "[Describe a recent accomplishment, with a specific result, that shows the impact you'd bring to " + company + ".]";
  const b2 = "[Connect your experience to " + focus + " and explain why it matters for this role.]";
  const b3 = "[Share what draws you to " + value + " and how you'd contribute from day one.]";
  const close = {
    confident: "I'd love to show you how I'd raise the bar on " + focus + ".",
    warm: "I'd be thrilled to talk about how I could help the team.",
    concise: "Happy to dive into specifics whenever works.",
  }[tone];
  const mids = length === 'brief' ? [b1] : (length === 'detailed' ? [b1, b2, b3] : [b1, b2]);
  return [greeting, intro, ...mids, close, 'Best,\n[Your name]'].join('\n\n');
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
  // data: { meta, bodies, order } — the user's real cover letters
  const [data, setData] = useState(() => normalize(null));
  const [selected, setSelected] = useState(null);
  const [tone, setTone] = useState('confident');
  const [length, setLength] = useState('standard');
  const [bodies, setBodies] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const saveTimer = useRef(null);

  // ---- backend fetch ----
  useEffect(() => {
    let alive = true;
    listCoverLetters()
      .then((records) => {
        if (!alive) return;
        const norm = normalize(records);
        setData(norm);
        setBodies(norm.bodies);
        setSelected(norm.order[0] || null);
      })
      .catch((e) => {
        if (alive) setError(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
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

  const m = data.meta[selected] || Object.values(data.meta)[0] || {};

  // ---- AI suggestion edits (port of editParas + suggestions) ----
  const editParas = (transform) => {
    const paras = (bodies[selected] || '').split('\n\n');
    setBody(selected, transform(paras.slice()).join('\n\n'));
  };
  const metricPara = "[Add a sentence here quantifying a specific result you achieved.]";
  const valuesPara = "What draws me to " + (m.company || 'this company') + " specifically is " + (m.value || 'your mission') + " — it's how I already try to work.";
  const conciseIntro = "I'm applying for the " + (m.role || 'this role') + " role at " + (m.company || 'this company') + ", where I believe my background is a strong fit.";

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

  const mono = 'var(--jb-font-mono)';
  const segLabel = { fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
  const segWrap = { display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 };

  return (
    <>
      <Head>
        <title>Cover letters — Jobocate</title>
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
        style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}
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

          {loading ? (
            <LoadingState label="Loading your cover letters…" />
          ) : error ? (
            <ErrorState error={error} />
          ) : letters.length === 0 ? (
            <EmptyState
              title="No cover letters yet"
              hint="Pick a role you're interested in and we'll draft a letter tailored to it."
              action={
                <Link
                  href={appRoute('App Matches.dc.html')}
                  style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: '#1FA463', color: '#0C2C1C', fontSize: 13.5, fontWeight: 700, borderRadius: 999, textDecoration: 'none' }}
                >
                  ✦ New from a role
                </Link>
              }
            />
          ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* ===== LEFT: LETTER LIST ===== */}
            <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #E7E0D2', background: '#FBF8F1', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flexShrink: 0, padding: '20px 18px 14px' }}>
                <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1, margin: '0 0 4px' }}>Cover letters</h1>
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
                      <span style={{ flexShrink: 0, fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: l.statusColor, background: l.statusBg, border: `1px solid ${l.statusBorder}`, padding: '3px 7px', borderRadius: 999 }}>{l.status}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#5A544A', marginBottom: 5 }}>{l.role}</div>
                    <div style={{ fontFamily: mono, fontSize: 11, color: '#A79E8F' }}>{l.edited}</div>
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
                    <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 10 }}>AI suggestions</div>
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
          )}
        </main>
      </div>
    </>
  );
}
