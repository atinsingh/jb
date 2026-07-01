'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { aiRecruiterApi } from '@/services/employerApi';

const DEFAULT_BRIEF = 'Senior Product Designer';

/* ----------------------------------------------------------- sample data --- */
const SKILLS = ['Design systems', 'Prototyping', 'Fintech', 'User research'];

const LEVEL_DEFS = [
  { key: 'mid', label: 'Mid' },
  { key: 'senior', label: 'Senior' },
  { key: 'staff', label: 'Staff' },
];

const SIGNAL_DEFS = [
  { key: 'systems', label: 'Built a design system' },
  { key: 'fintech', label: 'Fintech / payments background' },
  { key: 'startup', label: '0→1 / early-stage experience' },
];

const TAB_DEFS = [
  { key: 'new', label: 'New (14)' },
  { key: 'shortlist', label: 'Shortlist' },
];

const CANDIDATES = [
  {
    id: 'c1', initials: 'SC', name: 'Sarah Chen', headline: 'Senior Product Designer · ex-Plaid',
    location: 'San Francisco', availability: 'Open to offers', fit: '96%', featured: true, accent: 'green',
    rationale: 'Led a +31% activation redesign at Plaid and built a design system for 40+ engineers — both must-have signals, fintech-native.',
  },
  {
    id: 'c2', initials: 'DR', name: 'Diego Ramos', headline: 'Senior Designer · B2B SaaS',
    location: 'Remote (US)', availability: 'Open to offers', fit: '89%', featured: false, accent: 'indigo',
    rationale: 'Eight years across payments dashboards; strong systems portfolio, lighter on 0→1 ownership.',
  },
  {
    id: 'c3', initials: 'ML', name: 'Mei Lin', headline: 'Product Designer · Fintech',
    location: 'New York', availability: 'Passive', fit: '87%', featured: false, accent: 'indigo',
    rationale: 'Fintech-focused with shipped lending flows; one level below target but trending senior fast.',
  },
  {
    id: 'c4', initials: 'AB', name: 'Aisha Bello', headline: 'Sr. Product Designer · Marketplaces',
    location: 'Remote (US)', availability: 'Open to offers', fit: '85%', featured: false, accent: 'indigo',
    rationale: 'Deep design-systems leadership; marketplace rather than payments background.',
  },
  {
    id: 'c5', initials: 'TK', name: 'Tomas Kovac', headline: 'Staff Designer · Developer Tools',
    location: 'San Francisco', availability: 'Passive', fit: '82%', featured: false, accent: 'indigo',
    rationale: 'Excellent craft and systems depth; would be a senior-to-staff stretch for this req.',
  },
];

const STATS = [
  { value: '42', label: 'Sent', color: '#1B1A16' },
  { value: '28', label: 'Opened', color: '#4263EB' },
  { value: '11', label: 'Replied', color: '#1B1A16' },
  { value: '6', label: 'Interested', color: '#157A49' },
];

const QUEUE_RAW = [
  { id: 'c1', initials: 'SC', name: 'Sarah Chen', accent: 'green', state: 'REPLIED', stateColor: '#157A49' },
  { id: 'q2', initials: 'JK', name: 'Jana Kim', accent: 'indigo', state: 'OPENED', stateColor: '#4263EB' },
  { id: 'q3', initials: 'RP', name: 'Raj Patel', accent: 'indigo', state: 'SENT', stateColor: '#A79E8F' },
  { id: 'q4', initials: 'EN', name: 'Elena Novak', accent: 'indigo', state: 'QUEUED', stateColor: '#9A6A2E' },
];

/* -------------------------------------------------------------- helpers --- */
function avatarStyle(a) {
  if (a === 'green') return { bg: '#1FA463', color: '#0C2C1C' };
  if (a === 'indigo') return { bg: '#4263EB', color: '#fff' };
  return { bg: '#EDE7DA', color: '#5A544A' };
}

function fitColor(f) {
  const n = parseInt(f, 10);
  return n >= 90 ? '#157A49' : n >= 85 ? '#4263EB' : '#8A8378';
}

function defaultDraft(first) {
  return `Hi ${first},\n\nI’m Dana, a recruiter at Stripe. Your work on design systems and 0→1 fintech products stood out — we’re hiring a Senior Product Designer and I think you’d be a strong fit.\n\nWould you be open to a quick chat this week?\n\n— Dana, Stripe Talent`;
}

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
// Map a backend sourcing candidate into the card shape used by this page.
function adaptCandidate(c, i) {
  const name = c.name || 'Unknown candidate';
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?';
  const skills = Array.isArray(c.skills) ? c.skills.filter(Boolean) : [];
  const fitNum =
    typeof c.matchScore === 'number'
      ? c.matchScore <= 1
        ? Math.round(c.matchScore * 100)
        : Math.round(c.matchScore)
      : null;
  return {
    id: c.id || `src-${i}`,
    initials,
    name,
    headline: c.title || (c.yearsExperience ? `${c.yearsExperience} yrs experience` : ''),
    location: c.location || '—',
    availability: c.yearsExperience ? `${c.yearsExperience} yrs exp` : 'Open to offers',
    fit: fitNum != null ? `${fitNum}%` : '—',
    featured: i === 0,
    accent: i === 0 ? 'green' : 'indigo',
    rationale: skills.length ? `Key skills: ${skills.join(', ')}.` : 'Sourced by the AI recruiter.',
    outreach: c.outreach || undefined,
  };
}

export default function EmployerSourcing() {
  const [running, setRunning] = useState(true);
  const [level, setLevel] = useState('senior');
  const [tab, setTab] = useState('new');
  const [signals, setSignals] = useState({ systems: true, fintech: true, startup: false });
  const [sent, setSent] = useState({});
  const [shortlisted, setShortlisted] = useState({});
  const [expanded, setExpanded] = useState({});
  const [drafts, setDrafts] = useState({});
  const [candidates, setCandidates] = useState(CANDIDATES);
  const [loading, setLoading] = useState(false);

  const toggleSignal = (key) => setSignals((p) => ({ ...p, [key]: !p[key] }));

  const runSourcing = async (brief) => {
    setLoading(true);
    try {
      const res = await aiRecruiterApi.sourcing(brief || DEFAULT_BRIEF);
      const list = Array.isArray(res?.candidates) ? res.candidates : [];
      if (list.length) {
        setCandidates(list.map(adaptCandidate));
        setDrafts((prev) => {
          const next = { ...prev };
          list.forEach((c, i) => {
            const id = c.id || `src-${i}`;
            if (c.outreach && next[id] === undefined) next[id] = c.outreach;
          });
          return next;
        });
      } else {
        setCandidates(CANDIDATES);
      }
    } catch {
      setCandidates(CANDIDATES);
    } finally {
      setLoading(false);
    }
  };

  // Auto-source once on mount using the default brief.
  useEffect(() => {
    runSourcing(DEFAULT_BRIEF);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let pool = candidates;
  if (tab === 'shortlist') pool = pool.filter((c) => shortlisted[c.id]);

  return (
    <>
      <Head>
        <title>Sourcing Agent · Jobocate for Employers</title>
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
        #emapp .em-ghost:hover {
          background: #f4efe4 !important;
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
        @keyframes empulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="sourcing" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ color: '#1FA463' }}>✦</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>AI / Sourcing Agent</span>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#5A544A' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: running ? '#1FA463' : '#A79E8F', animation: running ? 'empulse 1.8s ease-in-out infinite' : 'none' }} />
              {running ? 'Agent running' : 'Agent paused'}
            </span>
          </header>

          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
            {/* ===== LEFT: BRIEF ===== */}
            <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid #E7E0D2', background: '#FBF8F1', padding: 24, overflowY: 'auto' }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 26, lineHeight: 1.05, margin: '0 0 4px' }}>Ideal candidate</h1>
              <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 22px' }}>The agent sources and ranks from this brief.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Role */}
                <div>
                  <label style={monoLabel}>Role</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 11, padding: '11px 13px' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Senior Product Designer</span>
                    <span style={{ color: '#A79E8F', fontSize: 12 }}>▾</span>
                  </div>
                </div>

                {/* Must-have skills */}
                <div>
                  <label style={monoLabel}>Must-have skills</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {SKILLS.map((label) => (
                      <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500, color: '#1F2D6B', background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 999, padding: '5px 8px 5px 12px' }}>
                        {label}
                        <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#C7D2FB', color: '#364FC7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✕</span>
                      </span>
                    ))}
                    <span style={{ fontSize: 12.5, color: '#8A8378', background: '#FBF8F1', border: '1px dashed #D2C9B7', borderRadius: 999, padding: '5px 12px' }}>+ add</span>
                  </div>
                </div>

                {/* Seniority */}
                <div>
                  <label style={monoLabel}>Seniority</label>
                  <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                    {LEVEL_DEFS.map((l) => {
                      const on = level === l.key;
                      return (
                        <button key={l.key} onClick={() => setLevel(l.key)} style={{ fontSize: 12, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none', fontFamily: 'inherit' }}>
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <label style={monoLabel}>Locations</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {['Remote (US)', 'San Francisco'].map((loc) => (
                      <span key={loc} style={{ fontSize: 12.5, fontWeight: 500, color: '#3A352C', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '6px 12px' }}>{loc}</span>
                    ))}
                  </div>
                </div>

                {/* Signals */}
                <div>
                  <label style={monoLabel}>Signals to prioritize</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SIGNAL_DEFS.map((s) => {
                      const on = signals[s.key];
                      return (
                        <button key={s.key} onClick={() => toggleSignal(s.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: on ? '#EDF0FE' : '#FFFEFB', border: `1px solid ${on ? '#C7D2FB' : '#E1D9C9'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, border: `1.5px solid ${on ? '#4263EB' : '#C9BFAC'}`, background: on ? '#4263EB' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{on ? '✓' : ''}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#3A352C' }}>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Run / pause */}
                <button onClick={() => { setRunning((r) => { const next = !r; if (next) runSourcing(DEFAULT_BRIEF); return next; }); }} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: running ? '#1B1A16' : '#fff', background: running ? '#F2ECE0' : '#4263EB', border: 'none', borderRadius: 999, padding: 13, cursor: loading ? 'wait' : 'pointer' }}>
                  {loading ? '…' : running ? '❙❙' : '▶'} {loading ? 'Sourcing…' : running ? 'Pause agent' : 'Run agent'}
                </button>
              </div>
            </div>

            {/* ===== CENTER: RESULTS STREAM ===== */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Sourced candidates</h2>
                  <p style={{ fontSize: 13, color: '#8A8378', margin: '3px 0 0' }}>
                    <span style={{ color: '#157A49', fontWeight: 600 }}>Found 14 new this week</span> · ranked by AI fit
                  </p>
                </div>
                <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                  {TAB_DEFS.map((t) => {
                    const on = tab === t.key;
                    return (
                      <button key={t.key} onClick={() => setTab(t.key)} style={{ fontSize: 12.5, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none', fontFamily: 'inherit' }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {pool.map((c) => {
                  const av = avatarStyle(c.accent);
                  const first = c.name.split(' ')[0];
                  const isSent = !!sent[c.id];
                  const isExpanded = !!expanded[c.id];
                  const isShortlisted = !!shortlisted[c.id];
                  const draft = drafts[c.id] !== undefined ? drafts[c.id] : defaultDraft(first);
                  return (
                    <div key={c.id} style={{ background: '#FFFEFB', border: `1px solid ${c.featured ? '#CDE9D6' : '#E6DECF'}`, borderRadius: 16, padding: 18, animation: 'emrise 0.3s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{c.initials}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 2, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16' }}>{c.name}</span>
                            {c.featured && (
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '2px 7px', borderRadius: 999 }}>TOP MATCH</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#8A8378' }}>{c.headline}</div>
                          <div style={{ fontSize: 12.5, color: '#A79E8F', marginTop: 1 }}>{c.location} · {c.availability}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 600, color: fitColor(c.fit) }}>{c.fit}</div>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A79E8F' }}>AI fit</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, lineHeight: 1.5, color: '#5A544A', margin: '12px 0', padding: '10px 12px', background: '#FBF9F4', borderRadius: 10 }}>
                        <span style={{ color: '#1FA463', flexShrink: 0 }}>✦</span>
                        <span>{c.rationale}</span>
                      </div>

                      {/* DRAFTED OUTREACH */}
                      {isExpanded && (
                        <div style={{ margin: '12px 0', animation: 'emrise 0.25s ease' }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4263EB', marginBottom: 8 }}>✦ Drafted outreach · editable</div>
                          <textarea
                            value={draft}
                            onChange={(e) => { const v = e.target.value; setDrafts((p) => ({ ...p, [c.id]: v })); }}
                            style={{ width: '100%', minHeight: 120, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 11, padding: 13, resize: 'vertical' }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6 }}>
                        {!isSent ? (
                          <>
                            <button className="em-send" onClick={() => setSent((p) => ({ ...p, [c.id]: true }))} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 17px', cursor: 'pointer' }}>✉ Send outreach</button>
                            <button className="em-ghost" onClick={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' }}>{isExpanded ? 'Hide draft' : 'View draft'}</button>
                            <button onClick={() => setShortlisted((p) => ({ ...p, [c.id]: !p[c.id] }))} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: isShortlisted ? '#9A6A2E' : '#8A8378', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 8px' }}>{isShortlisted ? '★ Shortlisted' : '☆ Shortlist'}</button>
                          </>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#157A49' }}>✓ Outreach sent</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {pool.length === 0 && (
                  <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 40, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>
                    No shortlisted candidates yet. Star a candidate to add them here.
                  </div>
                )}
              </div>
            </div>

            {/* ===== RIGHT: QUEUE + STATS ===== */}
            <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid #E7E0D2', background: '#FBF8F1', padding: '22px 20px', overflowY: 'auto' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12 }}>Campaign stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {STATS.map((s) => (
                  <div key={s.label} style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 12, padding: 13 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 21, fontWeight: 600, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#8A8378', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12 }}>Outreach queue</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {QUEUE_RAW.map((q) => {
                  const av = avatarStyle(q.accent);
                  return (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 11, padding: '10px 12px' }}>
                      <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{q.initials}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: q.stateColor }}>{q.state}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
