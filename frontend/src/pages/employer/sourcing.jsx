'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, EmptyState } from '@/components/employer/EmployerStates';
import { aiRecruiterApi } from '@/services/employerApi';

/* --------------------------------------------------------- form config --- */
const ROLE = 'Senior Product Designer';

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

const monoLabel = {
  fontFamily: 'var(--jb-font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#9A9286',
  marginBottom: 7,
  display: 'block',
};

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
    outreach: c.outreach || '',
  };
}

/* ----------------------------------------------------------- component --- */
export default function EmployerSourcing() {
  const [level, setLevel] = useState('senior');
  const [tab, setTab] = useState('new');
  const [signals, setSignals] = useState({ systems: true, fintech: true, startup: false });
  const [skills, setSkills] = useState(['Design systems', 'Prototyping', 'Fintech', 'User research']);
  const [skillInput, setSkillInput] = useState('');

  const [shortlisted, setShortlisted] = useState({});
  const [expanded, setExpanded] = useState({});
  const [drafts, setDrafts] = useState({});

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toggleSignal = (key) => setSignals((p) => ({ ...p, [key]: !p[key] }));
  const removeSkill = (label) => setSkills((s) => s.filter((x) => x !== label));
  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v)) setSkills((s) => s.concat(v));
    setSkillInput('');
  };

  // Build the sourcing brief from the real form inputs.
  const brief = useMemo(() => {
    const levelLabel = LEVEL_DEFS.find((l) => l.key === level)?.label || '';
    const signalLabels = SIGNAL_DEFS.filter((s) => signals[s.key]).map((s) => s.label);
    return [levelLabel, ROLE, ...skills, ...signalLabels].filter(Boolean).join(', ');
  }, [level, skills, signals]);

  // Fetch sourced candidates for the current brief. No sample fallback.
  const runSourcing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiRecruiterApi.sourcing(brief);
      const list = Array.isArray(res?.candidates) ? res.candidates : [];
      const adapted = list.map(adaptCandidate);
      setCandidates(adapted);
      setDrafts((prev) => {
        const next = { ...prev };
        adapted.forEach((c) => {
          if (c.outreach && next[c.id] === undefined) next[c.id] = c.outreach;
        });
        return next;
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-source once on mount using the initial brief.
  useEffect(() => {
    runSourcing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shortlistCount = candidates.filter((c) => shortlisted[c.id]).length;
  const pool = tab === 'shortlist' ? candidates.filter((c) => shortlisted[c.id]) : candidates;

  const TAB_DEFS = [
    { key: 'new', label: `New (${candidates.length})` },
    { key: 'shortlist', label: `Shortlist (${shortlistCount})` },
  ];

  return (
    <>
      <Head>
        <title>Sourcing Agent · Jobocate for Employers</title>
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

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="sourcing" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ color: '#1FA463' }}>✦</span>
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>AI / Sourcing Agent</span>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#5A544A' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: loading ? '#1FA463' : '#A79E8F', animation: loading ? 'empulse 1.8s ease-in-out infinite' : 'none' }} />
              {loading ? 'Agent sourcing…' : 'Agent idle'}
            </span>
          </header>

          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
            {/* ===== LEFT: BRIEF ===== */}
            <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid #E7E0D2', background: '#FBF8F1', padding: 24, overflowY: 'auto' }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 26, lineHeight: 1.05, margin: '0 0 4px' }}>Ideal candidate</h1>
              <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 22px' }}>The agent sources and ranks from this brief.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Role */}
                <div>
                  <label style={monoLabel}>Role</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 11, padding: '11px 13px' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{ROLE}</span>
                  </div>
                </div>

                {/* Must-have skills */}
                <div>
                  <label style={monoLabel}>Must-have skills</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {skills.map((label) => (
                      <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500, color: '#1F2D6B', background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 999, padding: '5px 8px 5px 12px' }}>
                        {label}
                        <button onClick={() => removeSkill(label)} aria-label={`Remove ${label}`} style={{ width: 16, height: 16, borderRadius: '50%', background: '#C7D2FB', color: '#364FC7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                      </span>
                    ))}
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      onBlur={addSkill}
                      placeholder="+ add"
                      style={{ width: 72, fontFamily: 'inherit', fontSize: 12.5, color: '#3A352C', background: '#FBF8F1', border: '1px dashed #D2C9B7', borderRadius: 999, padding: '5px 12px' }}
                    />
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

                {/* Run */}
                <button onClick={runSourcing} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: 13, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {loading ? '…' : '▶'} {loading ? 'Sourcing…' : candidates.length ? 'Re-run agent' : 'Run agent'}
                </button>
              </div>
            </div>

            {/* ===== CENTER: RESULTS STREAM ===== */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Sourced candidates</h2>
                  <p style={{ fontSize: 13, color: '#8A8378', margin: '3px 0 0' }}>
                    {candidates.length} candidate{candidates.length === 1 ? '' : 's'} · ranked by AI fit
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

              {loading ? (
                <LoadingState label="Sourcing candidates…" />
              ) : error ? (
                <ErrorState error={error} onRetry={runSourcing} />
              ) : candidates.length === 0 ? (
                <EmptyState icon="○" title="No candidates sourced yet" hint="Adjust the brief on the left and run the agent to source and rank matches." />
              ) : tab === 'shortlist' && pool.length === 0 ? (
                <EmptyState icon="☆" title="No shortlisted candidates yet" hint="Star a candidate to add them to your shortlist." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {pool.map((c) => {
                    const av = avatarStyle(c.accent);
                    const isExpanded = !!expanded[c.id];
                    const isShortlisted = !!shortlisted[c.id];
                    const draft = drafts[c.id] !== undefined ? drafts[c.id] : c.outreach;
                    const hasDraft = !!(draft && draft.trim());
                    return (
                      <div key={c.id} style={{ background: '#FFFEFB', border: `1px solid ${c.featured ? '#CDE9D6' : '#E6DECF'}`, borderRadius: 16, padding: 18, animation: 'emrise 0.3s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                          <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{c.initials}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16' }}>{c.name}</span>
                              {c.featured && (
                                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '2px 7px', borderRadius: 999 }}>TOP MATCH</span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: '#8A8378' }}>{c.headline}</div>
                            <div style={{ fontSize: 12.5, color: '#A79E8F', marginTop: 1 }}>{c.location} · {c.availability}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 20, fontWeight: 600, color: fitColor(c.fit) }}>{c.fit}</div>
                            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A79E8F' }}>AI fit</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, lineHeight: 1.5, color: '#5A544A', margin: '12px 0', padding: '10px 12px', background: '#FBF9F4', borderRadius: 10 }}>
                          <span style={{ color: '#1FA463', flexShrink: 0 }}>✦</span>
                          <span>{c.rationale}</span>
                        </div>

                        {/* DRAFTED OUTREACH */}
                        {isExpanded && hasDraft && (
                          <div style={{ margin: '12px 0', animation: 'emrise 0.25s ease' }}>
                            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4263EB', marginBottom: 8 }}>✦ Drafted outreach · editable</div>
                            <textarea
                              value={draft}
                              onChange={(e) => { const v = e.target.value; setDrafts((p) => ({ ...p, [c.id]: v })); }}
                              style={{ width: '100%', minHeight: 120, fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 11, padding: 13, resize: 'vertical' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6 }}>
                          {hasDraft && (
                            <button className="em-ghost" onClick={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' }}>{isExpanded ? 'Hide draft' : 'View draft'}</button>
                          )}
                          <button onClick={() => setShortlisted((p) => ({ ...p, [c.id]: !p[c.id] }))} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: isShortlisted ? '#9A6A2E' : '#8A8378', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 8px' }}>{isShortlisted ? '★ Shortlisted' : '☆ Shortlist'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
