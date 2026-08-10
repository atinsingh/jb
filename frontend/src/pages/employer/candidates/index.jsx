'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { employerPipelineApi, employerInterviewsApi } from '@/services/employerApi';
import { LoadingState, ErrorState, EmptyState, InlineError } from '@/components/employer/EmployerStates';

/* --------------------------------------------------------------- config --- */
// Map backend pipeline stages to the status labels this page renders.
const STAGE_TO_STATUS = {
  applied: 'New',
  screening: 'Reviewed',
  interview: 'Interview',
  offer: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
};

const STATUS_FILTERS = ['all', 'New', 'Reviewed', 'Interview', 'Hired', 'Rejected'];

// Cream-palette badge treatment per status.
const STATUS_STYLE = {
  New: { bg: '#F2ECE0', border: '#E6DECF', color: '#5A544A' },
  Reviewed: { bg: '#EDF0FE', border: '#C7D2FB', color: '#1F2D6B' },
  Interview: { bg: '#FBF1E2', border: '#EAD9BE', color: '#9A6A2E' },
  Hired: { bg: '#EAF6EE', border: '#CDE9D6', color: '#157A49' },
  Rejected: { bg: '#FBEDE4', border: '#EAD0C4', color: '#C9622E' },
};

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

// Adapt a backend applicant into this page's candidate shape.
const adaptApplicant = (a, i) => ({
  id: a._id || i,
  name: a.candidateName || 'Unknown candidate',
  title: a.candidateHeadline || '',
  location: a.candidateLocation || '',
  status: STAGE_TO_STATUS[a.stage] || 'New',
  match: typeof a.aiScore === 'number' ? a.aiScore : 0,
  skills: Array.isArray(a.skills) ? a.skills : [],
  experience: typeof a.yearsExperience === 'number' ? `${a.yearsExperience}+ years` : '—',
  lastActive: a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : 'recently',
});

/* ------------------------------------------------------------- ui atoms --- */
const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
const blueBtn = { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer' };
const ghostBtn = { fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', cursor: 'pointer' };
const fieldInput = { width: '100%', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '10px 12px' };

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.New;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '3px 9px', borderRadius: 999 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {status}
    </span>
  );
}

/* ----------------------------------------------------------- component --- */
export default function EmployerCandidates() {
  const [filters, setFilters] = useState({ search: '', status: 'all', sort: 'recent', skills: [] });

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  // Fetch the live applicant pipeline. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const applicants = await employerPipelineApi.list();
      const arr = Array.isArray(applicants) ? applicants : [];
      setCandidates(arr.map(adaptApplicant));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewDetails = (candidate) => {
    setScheduleError(null);
    setSelectedCandidate(candidate);
    setIsDetailOpen(true);
  };

  // Schedule an interview for the selected candidate via the interviews API.
  const scheduleInterview = async () => {
    if (!selectedCandidate) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      const isMongoId = /^[a-f\d]{24}$/i.test(String(selectedCandidate.id));
      await employerInterviewsApi.create({
        applicantId: isMongoId ? String(selectedCandidate.id) : undefined,
        candidateName: selectedCandidate.name,
        type: 'video',
      });
      setIsDetailOpen(false);
    } catch (err) {
      setScheduleError(err);
    } finally {
      setScheduling(false);
    }
  };

  const filteredCandidates = candidates
    .filter((candidate) => {
      if (filters.status !== 'all' && candidate.status !== filters.status) {
        return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !candidate.name.toLowerCase().includes(searchLower) &&
          !candidate.title.toLowerCase().includes(searchLower) &&
          !candidate.skills.some((skill) => skill.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === 'match') {
        return b.match - a.match;
      } else if (filters.sort === 'experience') {
        return parseInt(b.experience) - parseInt(a.experience);
      }
      return 0; // Default sort (by original order or add date-based sort)
    });

  const statusCounts = candidates.reduce((acc, candidate) => {
    acc[candidate.status] = (acc[candidate.status] || 0) + 1;
    return acc;
  }, {});

  const totalCandidates = candidates.length;

  return (
    <>
      <Head>
        <title>Candidates · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp select:focus, #emapp textarea:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-blue-btn:hover { background: #364fc7 !important; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
        #emapp .em-card:hover { border-color: #d9cfbb; }
        @keyframes emrise { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes emslide { from { transform: translateX(24px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="candidates" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <span style={{ ...monoLabel, fontSize: 11.5, letterSpacing: '0.1em' }}>Hiring · Candidates</span>
            <div style={{ flex: 1 }} />
            <Link href="/employer/candidates/search" className="em-blue-btn" style={blueBtn}>
              <span aria-hidden>⌕</span> Advanced search
            </Link>
          </header>

          <div style={{ padding: '20px 16px 48px', maxWidth: 1080, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 8px' }}>Candidates</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                {totalCandidates} candidate{totalCandidates === 1 ? '' : 's'} in your pipeline
                {Object.keys(statusCounts).length > 0 && ' · '}
                {Object.entries(statusCounts).map(([status, count], i, arr) => (
                  <span key={status}>
                    <span style={{ fontWeight: 700, color: '#1B1A16' }}>{count}</span> {status}{i < arr.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </p>
            </div>

            {/* TOOLBAR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, marginBottom: 18 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220, width: '100%' }}>
                <span aria-hidden style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#A79E8F', fontSize: 14 }}>⌕</span>
                <input
                  type="text"
                  placeholder="Search candidates, titles, skills…"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  style={{ ...fieldInput, background: '#FFFEFB', paddingLeft: 32 }}
                />
              </div>
              <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map((status) => {
                  const on = filters.status === status;
                  const label = status === 'all' ? 'All' : status;
                  const count = status !== 'all' ? statusCounts[status] : totalCandidates;
                  return (
                    <button
                      key={status}
                      onClick={() => setFilters({ ...filters, status })}
                      style={{ fontSize: 12, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '7px 13px', cursor: 'pointer', boxShadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none', fontFamily: 'inherit' }}
                    >
                      {label}{count ? <span style={{ color: '#A79E8F', marginLeft: 4 }}>{count}</span> : null}
                    </button>
                  );
                })}
              </div>
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                style={{ ...fieldInput, width: 'auto', background: '#FFFEFB', cursor: 'pointer' }}
              >
                <option value="recent">Most recent</option>
                <option value="match">Best match</option>
                <option value="experience">Experience</option>
              </select>
            </div>

            {/* LIST */}
            {loading ? (
              <LoadingState label="Loading candidates…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : filteredCandidates.length === 0 ? (
              <EmptyState icon="○" title="No candidates found" hint="Try adjusting your search or filters to find who you're looking for." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className="em-card" style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 18, transition: 'border-color 0.15s ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
                      <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: '50%', background: '#EDE7DA', color: '#5A544A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{initialsOf(candidate.name)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15.5, fontWeight: 700, color: '#1B1A16' }}>{candidate.name}</span>
                          <span style={{ fontSize: 12.5, color: '#A79E8F' }}>· {candidate.experience}</span>
                          <StatusBadge status={candidate.status} />
                        </div>
                        {candidate.title && <div style={{ fontSize: 13, color: '#8A8378' }}>{candidate.title}</div>}
                        <div style={{ fontSize: 12.5, color: '#A79E8F', marginTop: 1 }}>
                          {candidate.location ? `${candidate.location} · ` : ''}Active {candidate.lastActive}
                        </div>
                        {candidate.skills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                            {candidate.skills.slice(0, 4).map((skill, index) => (
                              <span key={index} style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#1F2D6B', background: '#EDF0FE', border: '1px solid #C7D2FB', padding: '3px 9px', borderRadius: 999 }}>{skill}</span>
                            ))}
                            {candidate.skills.length > 4 && (
                              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '3px 9px', borderRadius: 999 }}>+{candidate.skills.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 20, fontWeight: 600, color: candidate.match >= 90 ? '#157A49' : candidate.match >= 80 ? '#4263EB' : '#8A8378' }}>{candidate.match}%</div>
                          <div style={{ ...monoLabel, fontSize: 11, letterSpacing: '0.06em' }}>AI match</div>
                        </div>
                        <button onClick={() => handleViewDetails(candidate)} className="em-ghost" style={ghostBtn}>View profile</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Candidate Detail Drawer */}
      {isDetailOpen && selectedCandidate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={() => setIsDetailOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(27,26,22,0.42)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 520, height: '100%', background: '#F7F3EA', borderLeft: '1px solid #E7E0D2', display: 'flex', flexDirection: 'column', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16', animation: 'emslide 0.22s ease' }}>
            {/* drawer header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', background: 'rgba(247,243,234,0.9)', borderBottom: '1px solid #E7E0D2' }}>
              <span style={{ ...monoLabel, fontSize: 11, letterSpacing: '0.1em' }}>Candidate detail</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setIsDetailOpen(false)} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 999, background: '#FFFEFB', border: '1px solid #E1D9C9', color: '#5A544A', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <span style={{ width: 68, height: 68, flexShrink: 0, borderRadius: '50%', background: '#EDE7DA', color: '#5A544A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22 }}>{initialsOf(selectedCandidate.name)}</span>
                <div>
                  <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1.05, margin: '0 0 4px' }}>{selectedCandidate.name}</h2>
                  {selectedCandidate.title && <p style={{ fontSize: 14, color: '#8A8378', margin: '0 0 8px' }}>{selectedCandidate.title}</p>}
                  <StatusBadge status={selectedCandidate.status} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                <div>
                  <div style={{ ...monoLabel, fontSize: 11, color: '#7C86C6', marginBottom: 3 }}>AI match</div>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600, color: '#1F2D6B' }}>{selectedCandidate.match}%</div>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: '#C7D2FB' }} />
                <div>
                  <div style={{ ...monoLabel, fontSize: 11, color: '#7C86C6', marginBottom: 3 }}>Experience</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2D6B' }}>{selectedCandidate.experience}</div>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: '#C7D2FB' }} />
                <div>
                  <div style={{ ...monoLabel, fontSize: 11, color: '#7C86C6', marginBottom: 3 }}>Location</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2D6B' }}>{selectedCandidate.location || '—'}</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ ...monoLabel, display: 'block', marginBottom: 10 }}>Skills &amp; expertise</label>
                {selectedCandidate.skills.length === 0 ? (
                  <span style={{ fontSize: 13, color: '#A79E8F' }}>No skills listed.</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {selectedCandidate.skills.map((skill, index) => (
                      <span key={index} style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#1F2D6B', background: '#EDF0FE', border: '1px solid #C7D2FB', padding: '4px 11px', borderRadius: 999 }}>{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flexShrink: 0, borderTop: '1px solid #E7E0D2', padding: '16px 24px', background: '#FBF8F1' }}>
              {scheduleError && <InlineError error={scheduleError} />}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
                <button onClick={() => setIsDetailOpen(false)} className="em-ghost" style={ghostBtn}>Close</button>
                <button onClick={scheduleInterview} disabled={scheduling} className="em-blue-btn" style={{ ...blueBtn, opacity: scheduling ? 0.6 : 1, cursor: scheduling ? 'wait' : 'pointer' }}>{scheduling ? 'Scheduling…' : 'Schedule interview'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
