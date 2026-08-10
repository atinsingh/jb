'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { EmptyState, InlineError } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { aiRecruiterApi } from '@/services/employerApi';

/* ---------------------------------------------------------------- config --- */
// Static interview-configuration options (UI only — not fabricated results).
const QSETS = [
  { key: 'design', label: 'Product design — core', meta: '6 questions · craft, systems, collaboration' },
  { key: 'behavioral', label: 'Behavioral screen', meta: '5 questions · motivation, teamwork' },
  { key: 'custom', label: 'Custom set', meta: 'Build from your question bank' },
];

const LIMITS = [
  { key: '15', label: '15 min' },
  { key: '30', label: '30 min' },
  { key: '45', label: '45 min' },
];

// Map the scorecard recommendation returned by the backend to a display badge.
const REC_META = {
  hire: { label: 'HIRE', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' },
  lean_hire: { label: 'LEAN HIRE', color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' },
  lean_no_hire: { label: 'LEAN NO HIRE', color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' },
  no_hire: { label: 'NO HIRE', color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4' },
};

/* ----------------------------------------------------------- helpers --- */
// Rating is a 1–5 integer from the backend.
const ratingColor = (v) => {
  const n = parseFloat(v);
  return n >= 4 ? '#1FA463' : n >= 3 ? '#4263EB' : '#C9622E';
};

const monoLabel = {
  fontFamily: 'var(--jb-font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#9A9286',
  marginBottom: 7,
  display: 'block',
};

/* ----------------------------------------------------------- component --- */
export default function EmployerAiInterview() {
  const [tab, setTab] = useState('screen');
  const [qset, setQset] = useState('design');
  const [limit, setLimit] = useState('30');

  // Scorecard is generated on demand — nothing is shown until the AI returns.
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [scoreError, setScoreError] = useState(null);
  const [card, setCard] = useState(null);

  const generate = async () => {
    const text = notes.trim();
    if (!text || generating) return;
    setGenerating(true);
    setGenerated(false);
    setScoreError(null);
    try {
      const res = await aiRecruiterApi.scorecard({ notes: text });
      setCard({
        recommendation: res?.recommendation || '',
        overall: res?.overall ?? null,
        summary: res?.summary || '',
        comps: Array.isArray(res?.competencies)
          ? res.competencies.map((c) => ({
              label: c.competency,
              score: String(c.rating),
              evidence: c.evidence || '',
            }))
          : [],
        nextSteps: Array.isArray(res?.nextSteps) ? res.nextSteps : [],
      });
      setGenerated(true);
    } catch (err) {
      // Surface the failure — never fall back to a fabricated scorecard.
      setScoreError(err);
    } finally {
      setGenerating(false);
    }
  };

  const isScreen = tab === 'screen';
  const isScorecard = tab === 'scorecard';
  const showCard = generated && !generating && card && card.comps.length > 0;
  const generateLabel = generated ? 'Regenerate scorecard' : 'Generate scorecard';
  const rec = (card && REC_META[card.recommendation]) || null;

  const tabs = [
    { key: 'screen', label: '✦ AI screening interview' },
    { key: 'scorecard', label: '✦ AI scorecard' },
  ];

  return (
    <>
      <Head>
        <title>AI interviews — Jobocate</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp textarea:focus,
        #emapp input:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        #emapp .em-send:hover {
          background: #364fc7 !important;
        }
        @keyframes emrise {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes emblink {
          0%,
          100% {
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="interviews" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ color: '#1FA463' }}>✦</span>
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>AI interview tools</span>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('Employer Interviews.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}>All interviews →</Link>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 34, lineHeight: 1, margin: '0 0 16px' }}>AI interviews</h1>

            {/* TABS */}
            <div style={{ display: 'inline-flex', padding: 4, background: '#F1ECE0', border: '1px solid #E1D9C9', borderRadius: 999, gap: 4, marginBottom: 24 }}>
              {tabs.map((t) => {
                const on = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: 'inherit',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: on ? '#1B1A16' : '#8A8378',
                      background: on ? '#FFFEFB' : 'transparent',
                      border: 'none',
                      borderRadius: 999,
                      padding: '9px 18px',
                      cursor: 'pointer',
                      boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* ============ TAB 1: AI SCREENING INTERVIEW ============ */}
            {isScreen && (
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* CONFIG */}
                <div style={{ width: 340, flexShrink: 0, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Configure interview</h2>
                  <p style={{ fontSize: 12.5, color: '#8A8378', margin: '0 0 18px' }}>The AI conducts an async interview; candidates answer on their own time.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={monoLabel}>Question set</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {QSETS.map((q) => {
                          const on = qset === q.key;
                          return (
                            <button
                              key={q.key}
                              onClick={() => setQset(q.key)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                textAlign: 'left',
                                background: on ? '#EDF0FE' : '#FFFEFB',
                                border: `1.5px solid ${on ? '#4263EB' : '#E6DECF'}`,
                                borderRadius: 11,
                                padding: '11px 13px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: '50%', border: `1.5px solid ${on ? '#4263EB' : '#C9BFAC'}`, background: on ? '#4263EB' : 'transparent' }} />
                              <span style={{ flex: 1 }}>
                                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{q.label}</span>
                                <span style={{ display: 'block', fontSize: 11.5, color: '#8A8378' }}>{q.meta}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={monoLabel}>Time limit</label>
                      <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                        {LIMITS.map((l) => {
                          const on = limit === l.key;
                          return (
                            <button
                              key={l.key}
                              onClick={() => setLimit(l.key)}
                              style={{
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: on ? '#1B1A16' : '#8A8378',
                                background: on ? '#FFFEFB' : 'transparent',
                                border: 'none',
                                borderRadius: 999,
                                padding: '7px 14px',
                                cursor: 'pointer',
                                boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
                                fontFamily: 'inherit',
                              }}
                            >
                              {l.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RESULTS */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Completed interviews</h2>
                  </div>

                  <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }}>
                    <EmptyState
                      icon="○"
                      title="No completed AI interviews yet"
                      hint="When candidates finish an async AI interview, their transcripts and recommendations will appear here."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ============ TAB 2: AI SCORECARD ============ */}
            {isScorecard && (
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* INPUT */}
                <div style={{ width: 380, flexShrink: 0, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>Generate a scorecard</h2>
                  <p style={{ fontSize: 12.5, color: '#8A8378', margin: '0 0 16px' }}>Paste interview notes or a transcript — the AI structures it into a scorecard for the team to confirm.</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Paste your interview notes or transcript here…"
                    style={{ width: '100%', minHeight: 280, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, padding: 14, resize: 'vertical' }}
                  />
                  <InlineError error={scoreError} />
                  <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                    <button onClick={generate} disabled={!notes.trim() || generating} className="em-send" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: 12, cursor: !notes.trim() || generating ? 'not-allowed' : 'pointer', opacity: !notes.trim() || generating ? 0.5 : 1 }}>
                      ✦ {generating ? 'Generating…' : generateLabel}
                    </button>
                  </div>
                </div>

                {/* OUTPUT */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {generating && (
                    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 40, display: 'flex', alignItems: 'center', gap: 13 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 9, background: '#15140F', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out infinite' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out 0.2s infinite' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out 0.4s infinite' }} />
                      </div>
                      <span style={{ fontSize: 13.5, color: '#8A8378' }}>Structuring the scorecard…</span>
                    </div>
                  )}

                  {!generating && !showCard && (
                    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18 }}>
                      <EmptyState
                        icon="✦"
                        title="No scorecard yet"
                        hint="Paste interview notes or a transcript on the left and generate a structured scorecard."
                      />
                    </div>
                  )}

                  {showCard && (
                    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, animation: 'emrise 0.3s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 5 }}>✦ AI-generated scorecard</div>
                          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                            {card.overall != null ? `Overall ${card.overall} / 5` : 'Interview scorecard'}
                          </h2>
                        </div>
                        {rec && (
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: rec.color, background: rec.bg, border: `1px solid ${rec.border}`, padding: '6px 12px', borderRadius: 999 }}>{rec.label}</span>
                        )}
                      </div>

                      <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 11 }}>Competency ratings</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 22 }}>
                        {card.comps.map((c) => {
                          const n = Math.round(parseFloat(c.score));
                          const col = ratingColor(c.score);
                          return (
                            <div key={c.label}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                                <span style={{ width: 150, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{c.label}</span>
                                <div style={{ flex: 1, display: 'flex', gap: 5 }}>
                                  {[0, 1, 2, 3, 4].map((i) => (
                                    <span key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < n ? col : '#EFE8DA' }} />
                                  ))}
                                </div>
                                <span style={{ width: 34, flexShrink: 0, textAlign: 'right', fontFamily: 'var(--jb-font-mono)', fontSize: 12, fontWeight: 600, color: '#4263EB' }}>{c.score}</span>
                              </div>
                              {c.evidence && (
                                <div style={{ fontSize: 11.5, lineHeight: 1.45, color: '#8A8378', marginTop: 4, paddingLeft: 163 }}>{c.evidence}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {card.summary && (
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#3A352C', marginBottom: 20 }}>{card.summary}</div>
                      )}

                      {card.nextSteps.length > 0 && (
                        <div>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 10 }}>Suggested next steps</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {card.nextSteps.map((s, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FBF9F4', border: '1px solid #EFE8DA', borderRadius: 10, padding: '11px 13px', fontSize: 13, lineHeight: 1.5, color: '#3A352C' }}>
                                <span style={{ color: '#4263EB', flexShrink: 0, fontWeight: 700 }}>→</span>
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
