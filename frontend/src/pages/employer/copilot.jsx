'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { aiRecruiterApi } from '@/services/employerApi';

/* ----------------------------------------------------------- helpers --- */
const avatarStyle = (a) => {
  if (a === 'indigo') return { bg: '#4263EB', color: '#fff' };
  if (a === 'green') return { bg: '#1FA463', color: '#0C2C1C' };
  return { bg: '#EDE7DA', color: '#5A544A' };
};

const matchColor = (m) => {
  const n = parseInt(m, 10);
  return n >= 90 ? '#157A49' : n >= 85 ? '#4263EB' : '#8A8378';
};

const toneStyle = (t) => {
  if (t === 'green') return { dotBg: '#EAF6EE', dotBorder: '#CDE9D6', icon: '✓', iconColor: '#157A49' };
  if (t === 'clay') return { dotBg: '#FBEDE4', dotBorder: '#EAD0C4', icon: '↓', iconColor: '#C9622E' };
  return { dotBg: '#EDF0FE', dotBorder: '#C7D2FB', icon: '•', iconColor: '#4263EB' };
};

/* ------------------------------------------------------- sample data --- */
const STARTERS = [
  'Screen the PM applicants',
  'Find 5 designers like Sarah Chen',
  'Draft rejection emails for <60%',
  "Summarize today's interviews",
];

const INITIAL_MESSAGES = [
  { id: 'm1', role: 'user', text: 'Find 5 designers like Sarah Chen for the Senior Product Designer role.' },
  {
    id: 'm2',
    role: 'ai',
    text: 'Here are the five closest matches from your talent pool and applicants — ranked by fit to the Senior Product Designer req.',
    card: 'shortlist',
    cardSubtitle: 'Senior Product Designer',
    candidates: [
      { initials: 'SC', name: 'Sarah Chen', headline: 'Senior Product Designer · ex-Plaid', match: '96%', accent: 'green' },
      { initials: 'JL', name: 'Jordan Lee', headline: 'Product Designer · ex-Square', match: '89%', accent: 'neutral' },
      { initials: 'PN', name: 'Priya Nair', headline: 'Sr. Designer · Design Systems', match: '88%', accent: 'neutral' },
      { initials: 'ML', name: 'Mei Lin', headline: 'Product Designer · Fintech', match: '86%', accent: 'neutral' },
      { initials: 'DR', name: 'Diego Ramos', headline: 'Senior Designer · B2B SaaS', match: '84%', accent: 'neutral' },
    ],
    why: 'Matched on design-systems depth, fintech background and 0→1 experience — the three signals strongest in your best past hires.',
    action: true,
    runLabel: 'Invite all to apply',
    ranLabel: 'Invited 5 candidates',
  },
  { id: 'm3', role: 'user', text: 'Move everyone above 90% on the Designer req to Screening.' },
  {
    id: 'm4',
    role: 'ai',
    text: 'Two applicants on Senior Product Designer are above 90%. Here’s the move I’ll make:',
    card: 'bulk',
    bulkFrom: 'Applied',
    bulkTo: 'Screening',
    bulkRows: [
      { name: 'Sarah Chen', match: '96%' },
      { name: 'Aisha Bello', match: '92%' },
    ],
    why: 'Both cleared every must-have on the scorecard. Auto-screen is on, so this only changes their stage — no messages are sent.',
    action: true,
    runLabel: 'Run move (2)',
    ranLabel: 'Moved 2 to Screening',
  },
];

const RECENT_RAW = [
  { text: 'Invited 5 designers to apply', time: 'Just now', t: 'indigo' },
  { text: 'Moved 2 candidates to Screening', time: '2m ago', t: 'indigo' },
  { text: 'Drafted 7 rejection emails', time: '14m ago', t: 'clay' },
  { text: 'Sourced 12 PM candidates', time: '1h ago', t: 'green' },
];

/* sample conversational agent — mirrors dc Component.cannedReply() */
function cannedReply(prompt) {
  const p = (prompt || '').toLowerCase();
  const id = 'r' + Date.now();
  if (p.includes('reject') || p.includes('rejection')) {
    return {
      id,
      role: 'ai',
      text: 'Drafted a warm, role-specific rejection for the 7 Frontend applicants below 60%. Preview:',
      card: 'draft',
      cardSubtitle: '7 recipients · Staff Frontend Engineer',
      draftBody:
        'Hi {first_name},\n\nThank you for taking the time to apply to the Staff Frontend Engineer role at Stripe. After careful review, we’ve decided to move forward with other candidates whose experience more closely matches what the team needs right now.\n\nWe were genuinely impressed by your background and would welcome a future application. Wishing you the very best in your search.\n\n— The Stripe Talent Team',
      why: 'Tone kept warm and specific; no rejection reason is disclosed, per your hiring-policy default.',
      action: true,
      runLabel: 'Send 7 emails',
      ranLabel: 'Sent 7 rejections',
    };
  }
  if (p.includes('summar')) {
    return {
      id,
      role: 'ai',
      text: 'Three interviews are scheduled today: Jordan Lee (11:00 AM, Staff Frontend — technical), Sarah Chen (2:00 PM, Senior Product Designer — final round), and Lena Fischer (4:30 PM, PM Growth — recruiter screen). Sarah’s panel scorecards so far average 4.5/5. Want me to prep interviewer kits for each?',
      action: false,
    };
  }
  if (p.includes('screen') || p.includes('pm')) {
    return {
      id,
      role: 'ai',
      text: 'Screened all 44 applicants on Product Manager, Growth. 9 clear your must-haves; here are the top three:',
      card: 'shortlist',
      cardSubtitle: 'Product Manager, Growth',
      candidates: [
        { initials: 'LF', name: 'Lena Fischer', headline: 'PM · Growth & Activation', match: '90%', accent: 'green' },
        { initials: 'MO', name: 'Marcus Obi', headline: 'Senior PM · Marketplaces', match: '87%', accent: 'neutral' },
        { initials: 'RT', name: 'Rosa Tan', headline: 'PM · Experimentation', match: '85%', accent: 'neutral' },
      ],
      why: 'Ranked on growth-PM signal: experimentation, activation metrics and 0→1 ownership pulled from each résumé.',
      action: true,
      runLabel: 'Advance top 3',
      ranLabel: 'Advanced 3 to Screening',
    };
  }
  return {
    id,
    role: 'ai',
    text: 'On it. I can screen and rank applicants, source new candidates, draft outreach or rejections, and move people between stages — just tell me the role and the action. What would you like me to do first?',
    action: false,
  };
}

/* ------------------------------------------------------- sub views --- */
function ShortlistCard({ subtitle, candidates }) {
  return (
    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid #F2ECE0' }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4263EB' }}>
          Shortlist · {subtitle}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {candidates.map((c, i) => {
          const av = avatarStyle(c.accent);
          const divider = i < candidates.length - 1 ? '#F2ECE0' : 'transparent';
          return (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', borderBottom: `1px solid ${divider}` }}>
              <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{c.initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#8A8378' }}>{c.headline}</div>
              </div>
              <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: matchColor(c.match) }}>{c.match}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraftCard({ subtitle, body }) {
  return (
    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 16 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9622E', marginBottom: 10 }}>
        Draft · {subtitle}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#3A352C', whiteSpace: 'pre-line', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 11, padding: 14 }}>
        {body}
      </div>
    </div>
  );
}

function BulkCard({ from, to, rows }) {
  return (
    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '1px solid #F2ECE0' }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4263EB' }}>Bulk move preview</span>
        <div style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#5A544A' }}>
          {from} <span style={{ color: '#4263EB' }}>→</span> {to}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((b, i) => {
          const divider = i < rows.length - 1 ? '#F2ECE0' : 'transparent';
          return (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${divider}` }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4263EB', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{b.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: matchColor(b.match) }}>{b.match}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AiMessage({ m, ran, onRun, onUndo }) {
  const hasAction = m.action === true;
  return (
    <div style={{ display: 'flex', gap: 12, animation: 'emrise 0.3s ease' }}>
      <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: '#15140F', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {m.text && <div style={{ fontSize: 14.5, lineHeight: 1.55, color: '#2A2820', marginBottom: 12 }}>{m.text}</div>}

        {m.card === 'shortlist' && <ShortlistCard subtitle={m.cardSubtitle} candidates={m.candidates || []} />}
        {m.card === 'draft' && <DraftCard subtitle={m.cardSubtitle} body={m.draftBody} />}
        {m.card === 'bulk' && <BulkCard from={m.bulkFrom} to={m.bulkTo} rows={m.bulkRows || []} />}

        {Array.isArray(m.actions) && m.actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {m.actions.map((a, i) => (
              <button
                key={(a.type || 'act') + i}
                className="em-cp-chip"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#3A352C', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}
              >
                <span style={{ color: '#1FA463' }}>✦</span>
                {a.label || a.type}
              </button>
            ))}
          </div>
        )}

        {hasAction && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, lineHeight: 1.5, color: '#8A8378', marginTop: 11 }}>
              <span style={{ color: '#1FA463', flexShrink: 0 }}>✦</span>
              <span>{m.why}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
              {!ran ? (
                <>
                  <button onClick={onRun} className="em-cp-run" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 18px', cursor: 'pointer' }}>{m.runLabel || 'Run'}</button>
                  <button className="em-cp-edit" style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' }}>Edit</button>
                </>
              ) : (
                <>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#157A49' }}>✓ {m.ranLabel || 'Done'}</span>
                  <button onClick={onUndo} className="em-cp-undo" style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#8A8378', background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px' }}>Undo</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- page --- */
export default function EmployerCopilot() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [safe, setSafe] = useState(true);
  const [ran, setRan] = useState({});

  const threadRef = useRef(null);
  const replyTimer = useRef(null);

  const scrollThread = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollThread();
  }, [messages, thinking, scrollThread]);

  useEffect(() => () => clearTimeout(replyTimer.current), []);

  const pushUserAndReply = useCallback(async (text) => {
    const t = (text || '').trim();
    if (!t || thinking) return;
    const userMsg = { id: 'u' + Date.now(), role: 'user', text: t };
    setMessages((prev) => prev.concat(userMsg));
    setDraft('');
    setThinking(true);
    clearTimeout(replyTimer.current);
    try {
      const res = await aiRecruiterApi.copilot(t);
      const reply = {
        id: 'r' + Date.now(),
        role: 'ai',
        text: res?.reply || cannedReply(t).text,
        actions: Array.isArray(res?.actions) ? res.actions : [],
      };
      setMessages((prev) => prev.concat(reply));
    } catch (err) {
      // Graceful fallback: reuse the design's sample reply so the UI never breaks.
      setMessages((prev) => prev.concat(cannedReply(t)));
    } finally {
      setThinking(false);
    }
  }, [thinking]);

  const runAction = (id) => setRan((r) => ({ ...r, [id]: true }));
  const undoAction = (id) =>
    setRan((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      pushUserAndReply(draft);
    }
  };

  const canSend = draft.trim().length > 0;
  const showChips = messages.length <= 4;

  return (
    <>
      <Head>
        <title>Copilot · Recruiting — Jobocate</title>
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
        #emapp textarea:focus {
          outline: none;
        }
        #emapp .em-cp-run:hover {
          background: #364fc7 !important;
        }
        #emapp .em-cp-edit:hover {
          background: #f4efe4 !important;
        }
        #emapp .em-cp-undo:hover {
          color: #c9622e !important;
        }
        #emapp .em-cp-chip:hover {
          border-color: #4263eb !important;
          color: #364fc7 !important;
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

      <div id="emapp" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="copilot" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: '#15140F', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✦</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>Recruiting Copilot</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#8A8378' }}>Stripe · 3 open reqs</div>
            </div>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('Employer Autopilot.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>Autopilot →</Link>
          </header>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* ===== CHAT ===== */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div ref={threadRef} id="emthread" style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {messages.map((m) =>
                    m.role === 'user' ? (
                      <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '78%', background: '#4263EB', color: '#fff', fontSize: 14.5, lineHeight: 1.5, padding: '12px 16px', borderRadius: '16px 16px 4px 16px' }}>{m.text}</div>
                    ) : (
                      <AiMessage key={m.id} m={m} ran={!!ran[m.id]} onRun={() => runAction(m.id)} onUndo={() => undoAction(m.id)} />
                    )
                  )}

                  {/* TYPING */}
                  {thinking && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: '#15140F', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '14px 0' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out infinite' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out 0.2s infinite' }} />
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#9A9286', animation: 'emblink 1s ease-in-out 0.4s infinite' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* COMPOSER */}
              <div style={{ flexShrink: 0, padding: '14px 28px 20px', background: 'linear-gradient(transparent, #F7F3EA 30%)' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  {showChips && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {STARTERS.map((label) => (
                        <button key={label} onClick={() => pushUserAndReply(label)} className="em-cp-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#3A352C', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}>
                          <span style={{ color: '#1FA463' }}>✦</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 22, padding: '8px 8px 8px 18px', boxShadow: '0 6px 20px -12px rgba(27,26,22,0.25)' }}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKey}
                      rows={1}
                      placeholder="Ask Copilot to screen, source, draft, or move candidates…"
                      style={{ flex: 1, border: 'none', background: 'none', resize: 'none', fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.5, color: '#1B1A16', padding: '8px 0', maxHeight: 120 }}
                    />
                    <button
                      onClick={() => pushUserAndReply(draft)}
                      title="Send"
                      style={{ width: 40, height: 40, flexShrink: 0, border: 'none', borderRadius: '50%', background: canSend ? '#1FA463' : '#CFE6D8', color: '#fff', cursor: canSend ? 'pointer' : 'default', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >↑</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== RIGHT RAIL ===== */}
            <div style={{ width: 296, flexShrink: 0, borderLeft: '1px solid #E7E0D2', background: '#FBF8F1', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flexShrink: 0, padding: '20px 20px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 13 }}>
                  <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 9, background: safe ? '#EDF0FE' : '#FBF1E2', color: safe ? '#4263EB' : '#9A6A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{safe ? '◆' : '⚡'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B1A16' }}>Always ask first</div>
                    <div style={{ fontSize: 11.5, color: '#8A8378' }}>{safe ? 'Copilot waits for approval' : 'Copilot acts automatically'}</div>
                  </div>
                  <button onClick={() => setSafe((s) => !s)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ width: 40, height: 23, borderRadius: 999, background: safe ? '#4263EB' : '#D2C9B7', position: 'relative', display: 'block', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: 2, left: safe ? 19 : 2, width: 19, height: 19, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                    </span>
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12 }}>Recent actions</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {RECENT_RAW.map((r, i) => {
                    const tn = toneStyle(r.t);
                    const connector = i < RECENT_RAW.length - 1;
                    return (
                      <div key={r.text} style={{ display: 'flex', gap: 11 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: tn.dotBg, border: `1.5px solid ${tn.dotBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: tn.iconColor }}>{tn.icon}</span>
                          {connector && <span style={{ width: 2, flex: 1, minHeight: 14, background: '#EAE3D5' }} />}
                        </div>
                        <div style={{ paddingBottom: 14, flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#3A352C' }}>{r.text}</div>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#A79E8F', marginTop: 2 }}>{r.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
