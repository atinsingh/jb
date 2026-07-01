'use client';

import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ---------------------------------------------------------------- data --- */
const SCREENED = [
  {
    id: 's1', initials: 'SC', name: 'Sarah Chen', when: '2h ago', duration: '24 min',
    rec: 'STRONG HIRE', recKey: 'strong', accent: 'green',
    scores: [{ label: 'Craft', value: '4.8' }, { label: 'Systems', value: '4.6' }, { label: 'Comms', value: '4.7' }],
    transcript: [
      { q: 'Walk me through a project you’re proud of.', a: 'Led the Plaid onboarding redesign — framed activation as the core metric, ran research, shipped in six weeks and lifted activation 31% across 2M users.' },
      { q: 'How do you drive design-system adoption?', a: 'Pair early with a few teams, make the right thing the easy thing, and measure adoption like a product — I got 40+ engineers onto our system this way.' },
    ],
  },
  {
    id: 's2', initials: 'JL', name: 'Jordan Lee', when: '5h ago', duration: '21 min',
    rec: 'HIRE', recKey: 'hire', accent: 'indigo',
    scores: [{ label: 'Craft', value: '4.2' }, { label: 'Systems', value: '3.9' }, { label: 'Comms', value: '4.3' }],
    transcript: [
      { q: 'Walk me through a project you’re proud of.', a: 'Shipped the Square seller dashboard used by 200k merchants daily; focused on reducing time-to-first-action.' },
      { q: 'How do you drive design-system adoption?', a: 'Mostly through documentation and office hours — still building the muscle for measuring adoption rigorously.' },
    ],
  },
  {
    id: 's3', initials: 'MO', name: 'Marcus Obi', when: 'Yesterday', duration: '19 min',
    rec: 'NEEDS REVIEW', recKey: 'review', accent: 'neutral',
    scores: [{ label: 'Craft', value: '3.6' }, { label: 'Systems', value: '3.2' }, { label: 'Comms', value: '3.8' }],
    transcript: [
      { q: 'Walk me through a project you’re proud of.', a: 'Redesigned a SaaS settings area; improved task completion but the metrics story was less defined.' },
      { q: 'How do you drive design-system adoption?', a: 'Haven’t owned a system end to end yet, but I’ve contributed components to one.' },
    ],
  },
];

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

const COMP_RAW = [
  { label: 'Craft & visual', score: '4.8' },
  { label: 'Systems thinking', score: '4.6' },
  { label: 'Communication', score: '4.7' },
  { label: 'Collaboration', score: '4.3' },
  { label: 'Org / scale', score: '3.6' },
];

const STRENGTHS = [
  'Metric-driven: framed and moved activation +31% at Plaid.',
  'Proven design-systems leadership across 40+ engineers.',
  'Crisp, structured communicator under whiteboard pressure.',
];

const RISKS = [
  'Less experience steering very large cross-functional orgs.',
  'Probe how she handles ambiguous executive stakeholders.',
];

const FOLLOWUPS = [
  'Tell me about a time a launch metric went the wrong way — what did you do?',
  'How would you structure design ops for a 60-person org?',
  'Describe a disagreement with a PM you lost, and what you learned.',
];

const DEFAULT_NOTES = `Final round with Sarah Chen (Senior Product Designer).

Walked through the Plaid onboarding redesign end to end — framed the activation problem, ran the research, shipped in 6 weeks, +31% activation. Strong on tradeoffs. Built a design system adopted by 40+ engineers; spoke well about governance and adoption. Communication crisp. Some uncertainty on managing very large cross-functional orgs. Whiteboard exercise on a payments flow was excellent.`;

/* ----------------------------------------------------------- helpers --- */
const recStyle = (k) => {
  if (k === 'strong') return { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  if (k === 'hire') return { color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' };
  return { color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };
};
const avatarStyle = (a) => {
  if (a === 'green') return { bg: '#1FA463', color: '#0C2C1C' };
  if (a === 'indigo') return { bg: '#4263EB', color: '#fff' };
  return { bg: '#EDE7DA', color: '#5A544A' };
};
const scoreColor = (v) => {
  const n = parseFloat(v);
  return n >= 4.4 ? '#157A49' : n >= 3.8 ? '#4263EB' : '#9A6A2E';
};

const monoLabel = {
  fontFamily: "'JetBrains Mono',monospace",
  fontSize: 10,
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
  const [open, setOpen] = useState(null);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [generated, setGenerated] = useState(true);
  const [generating, setGenerating] = useState(false);
  const genTimer = useRef(null);

  useEffect(() => () => clearTimeout(genTimer.current), []);

  const generate = () => {
    setGenerating(true);
    setGenerated(false);
    clearTimeout(genTimer.current);
    genTimer.current = setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1100);
  };

  const isScreen = tab === 'screen';
  const isScorecard = tab === 'scorecard';
  const showCard = generated && !generating;
  const generateLabel = generated ? 'Regenerate scorecard' : 'Generate scorecard';

  const tabs = [
    { key: 'screen', label: '✦ AI screening interview' },
    { key: 'scorecard', label: '✦ AI scorecard' },
  ];

  return (
    <>
      <Head>
        <title>AI interviews — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="interviews" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ color: '#1FA463' }}>✦</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>AI interview tools</span>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('Employer Interviews.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}>All interviews →</Link>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1, margin: '0 0 16px' }}>AI interviews</h1>

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
                      <label style={monoLabel}>Role</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 11, padding: '11px 13px' }}>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Senior Product Designer</span>
                        <span style={{ color: '#A79E8F', fontSize: 11 }}>▾</span>
                      </div>
                    </div>

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

                    <button className="em-send" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: 12, cursor: 'pointer', marginTop: 4 }}>
                      ✦ Send interview link
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '9px 12px' }}>
                      <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#5A544A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>jobocate.com/ai/sr-design</span>
                      <button style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>Copy</button>
                    </div>
                  </div>
                </div>

                {/* RESULTS */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Completed interviews</h2>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>3 of 5 returned</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {SCREENED.map((c) => {
                      const rs = recStyle(c.recKey);
                      const av = avatarStyle(c.accent);
                      const isOpen = open === c.id;
                      const cardBorder = c.recKey === 'strong' ? '#CDE9D6' : '#E6DECF';
                      return (
                        <div key={c.id} style={{ background: '#FFFEFB', border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 18 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                            <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{c.initials}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: '#1B1A16' }}>{c.name}</div>
                              <div style={{ fontSize: 12.5, color: '#8A8378' }}>Completed {c.when} · {c.duration}</div>
                            </div>
                            <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', color: rs.color, background: rs.bg, border: `1px solid ${rs.border}`, padding: '4px 10px', borderRadius: 999 }}>{c.rec}</span>
                          </div>

                          <div style={{ display: 'flex', gap: 10, margin: '14px 0', flexWrap: 'wrap' }}>
                            {c.scores.map((s) => (
                              <div key={s.label} style={{ flex: 1, minWidth: 96, background: '#FBF9F4', border: '1px solid #EFE8DA', borderRadius: 10, padding: '10px 12px' }}>
                                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600, color: scoreColor(s.value) }}>{s.value}</div>
                                <div style={{ fontSize: 11, color: '#8A8378', marginTop: 1 }}>{s.label}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <button
                              onClick={() => setOpen((o) => (o === c.id ? null : c.id))}
                              style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#4263EB', background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}
                            >
                              {isOpen ? 'Hide transcript' : 'View transcript'}
                            </button>
                            <Link href={appRoute('Employer Candidate.dc.html')} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', textDecoration: 'none', padding: '8px 6px' }}>View profile →</Link>
                          </div>

                          {isOpen && (
                            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F2ECE0', display: 'flex', flexDirection: 'column', gap: 13, animation: 'emrise 0.2s ease' }}>
                              {c.transcript.map((t, i) => (
                                <div key={i}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#4263EB', flexShrink: 0 }}>AI</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{t.q}</span>
                                  </div>
                                  <div style={{ fontSize: 13, lineHeight: 1.55, color: '#5A544A', paddingLeft: 24 }}>{t.a}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                    style={{ width: '100%', minHeight: 280, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, padding: 14, resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                    <button onClick={generate} className="em-send" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: 12, cursor: 'pointer' }}>
                      ✦ {generateLabel}
                    </button>
                    <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#5A544A', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '12px 16px', cursor: 'pointer' }}>Import</button>
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

                  {showCard && (
                    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, animation: 'emrise 0.3s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                        <div>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 5 }}>✦ AI-generated scorecard</div>
                          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Sarah Chen · Senior Product Designer</h2>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '6px 12px', borderRadius: 999 }}>STRONG HIRE</span>
                      </div>

                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 11 }}>Competency ratings</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
                        {COMP_RAW.map((c) => {
                          const n = Math.round(parseFloat(c.score));
                          const col = parseFloat(c.score) >= 4.4 ? '#1FA463' : parseFloat(c.score) >= 3.8 ? '#4263EB' : '#C9622E';
                          return (
                            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                              <span style={{ width: 140, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{c.label}</span>
                              <div style={{ flex: 1, display: 'flex', gap: 5 }}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <span key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < n ? col : '#EFE8DA' }} />
                                ))}
                              </div>
                              <span style={{ width: 34, flexShrink: 0, textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: '#4263EB' }}>{c.score}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                        <div style={{ background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 13, padding: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#157A49', marginBottom: 9 }}>Strengths</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {STRENGTHS.map((s, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.45, color: '#1F4733' }}>
                                <span style={{ color: '#1FA463', flexShrink: 0 }}>+</span>
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ background: '#FBF1E2', border: '1px solid #EAD9BE', borderRadius: 13, padding: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#9A6A2E', marginBottom: 9 }}>Risks to probe</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {RISKS.map((r, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.45, color: '#7A4326' }}>
                                <span style={{ color: '#C9622E', flexShrink: 0 }}>!</span>
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 10 }}>Suggested follow-up questions</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {FOLLOWUPS.map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FBF9F4', border: '1px solid #EFE8DA', borderRadius: 10, padding: '11px 13px', fontSize: 13, lineHeight: 1.5, color: '#3A352C' }}>
                              <span style={{ color: '#4263EB', flexShrink: 0, fontWeight: 700 }}>Q</span>
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18, borderTop: '1px solid #F2ECE0' }}>
                        <span style={{ fontSize: 13, color: '#8A8378' }}>Confirm this scorecard for the panel?</span>
                        <div style={{ flex: 1 }} />
                        <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '9px 18px', cursor: 'pointer' }}>✓ Confirm &amp; save</button>
                        <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' }}>Edit</button>
                      </div>
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
