'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, EmptyState, InlineError } from '@/components/employer/EmployerStates';
import { employerPipelineApi } from '@/services/employerApi';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

// The stage a candidate advances to when moved forward.
const NEXT_STAGE = {
  applied: 'screening',
  screening: 'interview',
  interview: 'offer',
  offer: 'hired',
};

// Cream-language stage palette.
const STAGE_META = {
  applied: { label: 'Applied', color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' },
  screening: { label: 'Screening', color: '#1F2D6B', bg: '#EDF0FE', border: '#C7D2FB' },
  interview: { label: 'Interview', color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' },
  offer: { label: 'Offer', color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' },
  hired: { label: 'Hired', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' },
  rejected: { label: 'Rejected', color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4' },
};

const monoLabel = { fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' };
const selectStyle = {
  fontFamily: 'var(--jb-font-sans)', fontSize: 13, color: '#3A352C', background: '#FFFEFB', border: '1px solid #D9D0BE',
  borderRadius: 999, padding: '9px 30px 9px 14px', cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238A8378' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 11px center',
};

const StageBadge = ({ stage }) => {
  const meta = STAGE_META[stage] || { label: stage, color: '#8A8378', bg: '#F2ECE0', border: '#E6DECF' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
      {meta.label}
    </span>
  );
};

const initialsOf = (name) =>
  (name || 'Candidate')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

export default function JobApplications() {
  const router = useRouter();
  const { id: jobId } = router.query;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [actionError, setActionError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await employerPipelineApi.list({ jobId });
      const list = Array.isArray(res) ? res : res?.applicants || [];
      setApplications(list);
      setSelectedId((prev) => prev ?? (list[0]?._id || null));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // Wait for the router to hydrate the dynamic [id] param before fetching.
    if (router.isReady) load();
  }, [router.isReady, load]);

  const filteredApplications = applications.filter((app) => {
    const name = (app.candidateName || '').toLowerCase();
    const email = (app.candidateEmail || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchesSearch = name.includes(q) || email.includes(q);
    const matchesStage = stageFilter === 'All' || app.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const selectedApplication = applications.find((a) => a._id === selectedId) || null;

  const changeStage = async (id, stage) => {
    setUpdatingId(id);
    setActionError(null);
    try {
      const updated = await employerPipelineApi.updateStage(id, stage);
      const newStage = updated?.stage || stage;
      setApplications((prev) => prev.map((a) => (a._id === id ? { ...a, stage: newStage } : a)));
    } catch (err) {
      setActionError(err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Applications · Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar { width: 8px; }
        #emapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #emapp input:focus, #emapp select:focus { outline: none; border-color: #4263eb; box-shadow: 0 0 0 3px rgba(66,99,235,0.14); }
        #emapp .em-blue:hover { background: #364fc7 !important; }
        #emapp .em-ghost:hover { background: #f4efe4 !important; }
        #emapp .em-appli:hover { background: #FBF9F4; }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="candidates" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href="/employer/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to jobs</Link>
            <span style={{ ...monoLabel, marginLeft: 4 }}>Hiring · Applications</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#8A8378' }}>{loading ? '…' : `${applications.length} total`}</span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            {/* Title */}
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Applications</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                {loading ? 'Loading applicants…' : `${applications.length} applicant${applications.length === 1 ? '' : 's'} in this pipeline`}
              </p>
            </div>

            {loading ? (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }}><LoadingState label="Loading applications…" /></div>
            ) : error ? (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }}><ErrorState error={error} onRetry={load} /></div>
            ) : applications.length === 0 ? (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }}>
                <EmptyState icon="○" title="No applications yet" hint="Applications for this job will appear here as candidates apply." />
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', flex: 1, minWidth: 220 }}>
                    <span style={{ color: '#A79E8F', fontSize: 13 }}>⌕</span>
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or email…" style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16' }} />
                  </div>
                  <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={selectStyle}>
                    <option value="All">All stages</option>
                    {STAGES.map((s) => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* LEFT: applicant list */}
                  <div style={{ flex: '1 1 340px', minWidth: 300, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                      <span style={monoLabel}>Applicants</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F' }}>{filteredApplications.length}</span>
                    </div>
                    {filteredApplications.length === 0 ? (
                      <div style={{ padding: 28, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No applications match your filters.</div>
                    ) : (
                      <div>
                        {filteredApplications.map((application, i, arr) => {
                          const on = selectedId === application._id;
                          const divider = i < arr.length - 1 ? '#F2ECE0' : 'transparent';
                          return (
                            <button
                              key={application._id}
                              onClick={() => setSelectedId(application._id)}
                              className="em-appli"
                              style={{
                                display: 'block', width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                                padding: '14px 18px', borderBottom: `1px solid ${divider}`, borderLeft: `3px solid ${on ? '#4263EB' : 'transparent'}`,
                                background: on ? '#FBF9F4' : 'transparent',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: '#EDF0FE', color: '#4263EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initialsOf(application.candidateName)}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{application.candidateName || 'Candidate'}</div>
                                  {application.candidateHeadline && (
                                    <div style={{ fontSize: 12.5, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{application.candidateHeadline}</div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <StageBadge stage={application.stage} />
                                  {application.appliedAt && (
                                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F', marginTop: 5 }}>{new Date(application.appliedAt).toLocaleDateString()}</div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: applicant detail */}
                  <div style={{ flex: '2 1 480px', minWidth: 320, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 24 }}>
                    {selectedApplication ? (
                      <>
                        <InlineError error={actionError} />
                        <div style={{ borderBottom: '1px solid #F2ECE0', paddingBottom: 20, marginBottom: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: '50%', background: '#EDF0FE', color: '#4263EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{initialsOf(selectedApplication.candidateName)}</span>
                            <div style={{ minWidth: 0 }}>
                              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 28, lineHeight: 1.05, margin: 0 }}>{selectedApplication.candidateName || 'Candidate'}</h2>
                              {selectedApplication.candidateHeadline && (
                                <p style={{ fontSize: 14, color: '#5A544A', margin: '3px 0 0' }}>{selectedApplication.candidateHeadline}</p>
                              )}
                            </div>
                            <div style={{ marginLeft: 'auto', flexShrink: 0 }}><StageBadge stage={selectedApplication.stage} /></div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
                            {selectedApplication.candidateEmail && (
                              <div>
                                <div style={{ ...monoLabel, marginBottom: 5 }}>Email address</div>
                                <a href={`mailto:${selectedApplication.candidateEmail}`} style={{ fontSize: 13.5, color: '#4263EB', textDecoration: 'none', wordBreak: 'break-all' }}>{selectedApplication.candidateEmail}</a>
                              </div>
                            )}
                            {selectedApplication.candidateLocation && (
                              <div>
                                <div style={{ ...monoLabel, marginBottom: 5 }}>Location</div>
                                <div style={{ fontSize: 13.5, color: '#3A352C' }}>{selectedApplication.candidateLocation}</div>
                              </div>
                            )}
                            {selectedApplication.appliedAt && (
                              <div>
                                <div style={{ ...monoLabel, marginBottom: 5 }}>Applied on</div>
                                <div style={{ fontSize: 13.5, color: '#3A352C' }}>{new Date(selectedApplication.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                              </div>
                            )}
                            {selectedApplication.aiScore ? (
                              <div>
                                <div style={{ ...monoLabel, marginBottom: 5 }}>AI match score</div>
                                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 16, fontWeight: 600, color: '#157A49' }}>{selectedApplication.aiScore}%</div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {selectedApplication.skills && selectedApplication.skills.length > 0 && (
                          <div style={{ marginBottom: 22 }}>
                            <div style={{ ...monoLabel, marginBottom: 10 }}>Skills</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                              {selectedApplication.skills.map((skill) => (
                                <span key={skill} style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#46413A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '3px 9px', borderRadius: 999 }}>{skill}</span>
                              ))}
                            </div>
                            {selectedApplication.yearsExperience ? (
                              <div style={{ marginTop: 16 }}>
                                <div style={{ ...monoLabel, marginBottom: 5 }}>Experience</div>
                                <div style={{ fontSize: 13.5, color: '#3A352C' }}>{selectedApplication.yearsExperience} year{selectedApplication.yearsExperience === 1 ? '' : 's'}</div>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {selectedApplication.stage !== 'rejected' && selectedApplication.stage !== 'hired' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, paddingTop: 4 }}>
                            <button
                              type="button"
                              disabled={updatingId === selectedApplication._id}
                              onClick={() => changeStage(selectedApplication._id, 'rejected')}
                              className="em-ghost"
                              style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#C9622E', background: '#FFFEFB', border: '1px solid #EAD0C4', borderRadius: 999, padding: '9px 16px', cursor: 'pointer', opacity: updatingId === selectedApplication._id ? 0.5 : 1 }}
                            >
                              ✕ Reject
                            </button>
                            {NEXT_STAGE[selectedApplication.stage] && (
                              <button
                                type="button"
                                disabled={updatingId === selectedApplication._id}
                                onClick={() => changeStage(selectedApplication._id, NEXT_STAGE[selectedApplication.stage])}
                                className="em-blue"
                                style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: 'pointer', opacity: updatingId === selectedApplication._id ? 0.6 : 1 }}
                              >
                                ✓ Move to {STAGE_META[NEXT_STAGE[selectedApplication.stage]].label}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState icon="○" title="No application selected" hint="Select an application from the list to view details." />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
