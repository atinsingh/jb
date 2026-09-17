'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, EmptyState, InlineError } from '@/components/employer/EmployerStates';
import ResumeAssessmentPanel from '@/components/employer/ResumeAssessmentPanel';
import useEmployerAtsSandboxRelease from '@/components/employer/useEmployerAtsSandboxRelease';
import { employerJobsApi, employerPipelineApi } from '@/services/employerApi';

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
const NEXT_STAGE = {
  applied: 'screening',
  screening: 'interview',
  interview: 'offer',
  offer: 'hired',
};
const STAGE_META = {
  applied: { label: 'Applied' },
  screening: { label: 'Screening' },
  interview: { label: 'Interview' },
  offer: { label: 'Offer' },
  hired: { label: 'Hired' },
  rejected: { label: 'Rejected' },
};

const StageBadge = ({ stage }) => {
  const meta = STAGE_META[stage] || { label: stage };
  return <span className={`stage stage-${stage || 'unknown'}`}>{meta.label}</span>;
};

const initialsOf = (name) =>
  (name || 'Candidate')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

export default function JobApplications() {
  const router = useRouter();
  const { id: jobId } = router.query;

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [actionError, setActionError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [assessment, setAssessment] = useState({ status: 'NOT_RUN' });
  const [assessmentBudget, setAssessmentBudget] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [preview, setPreview] = useState({ status: 'NOT_RUN' });
  const [previewFile, setPreviewFile] = useState(null);
  const [savedFileName, setSavedFileName] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const previewAbort = useRef(null);
  const { status: sandboxStatus, error: sandboxError } = useEmployerAtsSandboxRelease(() => {
    previewAbort.current?.abort();
    previewAbort.current = null;
  });

  useEffect(() => {
    if (!jobId || sandboxStatus !== 'ready') return undefined;
    let cancelled = false;
    employerPipelineApi.savedAtsPreview(jobId)
      .then((saved) => {
        if (cancelled || !saved?.saved) return;
        setSavedFileName(saved.fileName);
      })
      .catch((err) => { if (!cancelled) setActionError(err); });
    return () => { cancelled = true; };
  }, [jobId, sandboxStatus]);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const [jobRes, listRes] = await Promise.all([
        employerJobsApi.get(jobId).catch(() => null),
        employerPipelineApi.list({ jobId }),
      ]);
      const list = Array.isArray(listRes) ? listRes : listRes?.applicants || [];
      setJob(jobRes?.job || jobRes || null);
      setApplications(list);
      setSelectedId((prev) => prev ?? (list[0]?._id || null));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (router.isReady) load();
  }, [router.isReady, load]);

  useEffect(() => {
    if (sandboxStatus !== 'ready') return undefined;
    let cancelled = false;
    employerPipelineApi.assessmentBudget()
      .then((budget) => { if (!cancelled) setAssessmentBudget(budget); })
      .catch(() => { if (!cancelled) setAssessmentBudget(null); });
    return () => { cancelled = true; };
  }, [sandboxStatus]);

  useEffect(() => {
    if (!selectedId) {
      setAssessment({ status: 'NOT_RUN' });
      return undefined;
    }
    let cancelled = false;
    setAssessmentLoading(true);
    employerPipelineApi
      .get(selectedId)
      .then((applicant) => {
        if (!cancelled) setAssessment(applicant?.resumeAssessment || { status: 'NOT_RUN' });
      })
      .catch(() => {
        if (!cancelled) setAssessment({ status: 'NOT_RUN' });
      })
      .finally(() => {
        if (!cancelled) setAssessmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filteredApplications = applications.filter((app) => {
    const name = (app.candidateName || '').toLowerCase();
    const email = (app.candidateEmail || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = name.includes(query) || email.includes(query);
    const matchesStage = stageFilter === 'All' || app.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const selectedApplication = applications.find((item) => item._id === selectedId) || null;

  const changeStage = async (id, stage) => {
    setUpdatingId(id);
    setActionError(null);
    try {
      const updated = await employerPipelineApi.updateStage(id, stage);
      const newStage = updated?.stage || stage;
      setApplications((prev) => prev.map((item) => (item._id === id ? { ...item, stage: newStage } : item)));
    } catch (err) {
      setActionError(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const runResumeAssessment = async () => {
    if (!selectedId || assessmentBusy || sandboxStatus !== 'ready') return;
    setAssessmentBusy(true);
    setAssessment((current) => ({ ...(current || {}), status: 'RUNNING' }));
    setActionError(null);
    try {
      const result = await employerPipelineApi.assessResume(selectedId);
      setAssessment(result);
      setAssessmentBudget(await employerPipelineApi.assessmentBudget().catch(() => assessmentBudget));
    } catch (err) {
      setActionError(err);
      setAssessment({ status: 'ATS_FAILED', ats: { status: 'ATS_FAILED' }, aiContent: { status: 'NOT_RUN' } });
    } finally {
      setAssessmentBusy(false);
    }
  };

  const runAtsPreview = async () => {
    if (!jobId || (!previewFile && !savedFileName) || previewBusy || sandboxStatus !== 'ready') return;
    const file = previewFile;
    const abort = new AbortController();
    previewAbort.current = abort;
    setPreviewBusy(true);
    setPreview({ status: 'RUNNING' });
    setActionError(null);
    try {
      const result = await employerPipelineApi.previewAts(jobId, file, { signal: abort.signal });
      setPreview(result);
      if (file) {
        setSavedFileName(file.name);
        setPreviewFile(null);
      }
      setAssessmentBudget(await employerPipelineApi.assessmentBudget().catch(() => assessmentBudget));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setActionError(err);
        setPreview({ status: 'ATS_FAILED', ats: { status: 'ATS_FAILED' }, aiContent: { status: 'NOT_RUN' } });
      }
    } finally {
      if (previewAbort.current === abort) previewAbort.current = null;
      setPreviewBusy(false);
    }
  };

  const jobTitle = job?.title || 'Applications';

  return (
    <>
      <Head>
        <title>{jobTitle} · Applications · Jobocate</title>
      </Head>

      <div id="emapp" className="applications-page">
        <EmployerSidebar active="jobs" />
        <main>
          <div className="dot-fade" aria-hidden="true" />
          <div className="content">
            <div className="heading">
              <div>
                <Link href="/employer/jobs">Jobs</Link>
                <h1>{jobTitle}</h1>
                <p>
                  {loading
                    ? 'Loading applicants…'
                    : `${applications.length} applicant${applications.length === 1 ? '' : 's'} in this pipeline`}
                </p>
              </div>
              <strong>{loading ? '…' : `${applications.length} total`}</strong>
            </div>

            {loading && <LoadingState label="Loading applications…" tone="dark" />}
            {!loading && error && <ErrorState error={error} onRetry={load} tone="dark" />}
            {!loading && !error && (
              <section className="preview-card" aria-label="Ad-hoc ATS preview">
                <InlineError error={actionError} />
                {sandboxStatus === 'starting' && <p role="status">Preparing ATS scoring container…</p>}
                {sandboxStatus === 'paused' && <p role="status">ATS scoring is paused while this tab is hidden.</p>}
                {sandboxStatus === 'error' && <InlineError error={sandboxError} />}
                <div className="preview-head">
                  <div>
                    <h2>Ad-hoc ATS preview</h2>
                    <p>Upload a PDF or DOCX to score it against this job. This does not create an applicant or application.</p>
                  </div>
                  <button
                    type="button"
                    className="primary"
                    disabled={(!previewFile && !savedFileName) || previewBusy || sandboxStatus !== 'ready'}
                    onClick={runAtsPreview}
                  >
                    {previewBusy ? 'Scoring…' : 'Score uploaded résumé'}
                  </button>
                </div>
                <label className="upload">
                  <span>Résumé file</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    aria-label="Upload résumé for ATS preview"
                    onChange={(event) => setPreviewFile(event.target.files?.[0] || null)}
                  />
                </label>
                {savedFileName && <p>Saved résumé: {savedFileName}. You can score it again without uploading.</p>}
                <ResumeAssessmentPanel
                  title="Preview result"
                  assessment={preview}
                  budget={assessmentBudget}
                  busy={previewBusy}
                />
              </section>
            )}
            {!loading && !error && applications.length === 0 && (
              <EmptyState
                tone="dark"
                title="No applications yet"
                hint="Nobody has applied yet. You can still score a résumé against this job with the upload above."
                action={(
                  <Link href="/employer/screening" className="ghost-link">Open screening</Link>
                )}
              />
            )}

            {!loading && !error && applications.length > 0 && (
              <>
                <div className="toolbar">
                  <label className="search">
                    <span>Search</span>
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Name or email"
                    />
                  </label>
                  <label className="search">
                    <span>Stage</span>
                    <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
                      <option value="All">All stages</option>
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>{STAGE_META[stage].label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="split">
                  <section className="list" aria-label="Applicants">
                    {filteredApplications.length === 0 ? (
                      <p className="empty-filter">No applications match your filters.</p>
                    ) : filteredApplications.map((application) => {
                      const on = selectedId === application._id;
                      return (
                        <button
                          key={application._id}
                          type="button"
                          className={on ? 'row on' : 'row'}
                          onClick={() => setSelectedId(application._id)}
                        >
                          <span className="avatar" aria-hidden>{initialsOf(application.candidateName)}</span>
                          <span className="who">
                            <strong>{application.candidateName || 'Candidate'}</strong>
                            {application.candidateHeadline && <em>{application.candidateHeadline}</em>}
                          </span>
                          <StageBadge stage={application.stage} />
                        </button>
                      );
                    })}
                  </section>

                  <section className="detail" aria-label="Applicant detail">
                    {selectedApplication ? (
                      <>
                        <div className="identity">
                          <span className="avatar lg" aria-hidden>{initialsOf(selectedApplication.candidateName)}</span>
                          <div>
                            <h2>{selectedApplication.candidateName || 'Candidate'}</h2>
                            {selectedApplication.candidateHeadline && <p>{selectedApplication.candidateHeadline}</p>}
                          </div>
                          <StageBadge stage={selectedApplication.stage} />
                        </div>

                        <dl>
                          {selectedApplication.candidateEmail && (
                            <div>
                              <dt>Email</dt>
                              <dd><a href={`mailto:${selectedApplication.candidateEmail}`}>{selectedApplication.candidateEmail}</a></dd>
                            </div>
                          )}
                          {selectedApplication.candidateLocation && (
                            <div>
                              <dt>Location</dt>
                              <dd>{selectedApplication.candidateLocation}</dd>
                            </div>
                          )}
                          {selectedApplication.appliedAt && (
                            <div>
                              <dt>Applied</dt>
                              <dd>{new Date(selectedApplication.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                            </div>
                          )}
                          {selectedApplication.aiScore ? (
                            <div>
                              <dt>Fit score</dt>
                              <dd>{selectedApplication.aiScore}</dd>
                            </div>
                          ) : null}
                        </dl>

                        {selectedApplication.skills?.length > 0 && (
                          <div className="skills">
                            {selectedApplication.skills.map((skill) => (
                              <span key={skill}>{skill}</span>
                            ))}
                          </div>
                        )}

                        <ResumeAssessmentPanel
                          assessment={assessment}
                          budget={assessmentBudget}
                          loading={assessmentLoading}
                          busy={assessmentBusy}
                          onRun={runResumeAssessment}
                        />

                        {selectedApplication.stage !== 'rejected' && selectedApplication.stage !== 'hired' && (
                          <div className="actions">
                            <button
                              type="button"
                              disabled={updatingId === selectedApplication._id}
                              onClick={() => changeStage(selectedApplication._id, 'rejected')}
                              className="ghost"
                            >
                              Reject
                            </button>
                            {NEXT_STAGE[selectedApplication.stage] && (
                              <button
                                type="button"
                                disabled={updatingId === selectedApplication._id}
                                onClick={() => changeStage(selectedApplication._id, NEXT_STAGE[selectedApplication.stage])}
                                className="primary"
                              >
                                Move to {STAGE_META[NEXT_STAGE[selectedApplication.stage]].label}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState tone="dark" title="No application selected" hint="Select an applicant to view details and run ATS match." />
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .applications-page { min-height: 100vh; display: flex; background: var(--jb-v3-bg); color: var(--jb-v3-fg); }
        main { position: relative; flex: 1; min-width: 0; }
        .dot-fade { position: absolute; inset: 0 0 auto; height: 520px; pointer-events: none; background-image: radial-gradient(circle, var(--jb-v3-dot) .8px, transparent .9px); background-size: 26px 26px; mask-image: linear-gradient(#000, transparent); }
        .content { position: relative; width: min(100%, 1160px); margin: 0 auto; padding: 44px 28px 80px; }
        .heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
        .heading a, .heading > strong { font-family: var(--jb-v3-font-mono); text-transform: uppercase; letter-spacing: .12em; font-size: 10px; color: var(--jb-v3-fg-3); text-decoration: none; }
        h1 { margin: 7px 0 8px; font-size: clamp(30px, 4vw, 44px); font-weight: 500; }
        .heading p { margin: 0; color: var(--jb-v3-fg-2); font-size: 14px; max-width: 62ch; }
        .heading > strong { font-weight: 400; }
        .preview-card { border: 1px solid var(--jb-v3-line); background: var(--jb-v3-panel); padding: 22px; margin-bottom: 18px; }
        .preview-head { display: flex; align-items: start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .preview-card h2 { margin: 0 0 6px; font-size: 18px; font-weight: 600; }
        .preview-card p { margin: 0; color: var(--jb-v3-fg-2); font-size: 13.5px; max-width: 62ch; }
        .upload { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .upload span { font-family: var(--jb-v3-font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--jb-v3-fg-3); }
        .upload input { color: var(--jb-v3-fg); font: inherit; font-size: 13px; }
        .toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
        .search { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
        .search span { font-family: var(--jb-v3-font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--jb-v3-fg-3); }
        .search input, .search select {
          min-width: 220px; color: var(--jb-v3-fg); background: var(--jb-v3-control);
          border: 1px solid var(--jb-v3-line-2); border-radius: 2px; padding: 10px 12px; font: inherit; font-size: 13px;
        }
        .split { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 18px; align-items: start; }
        .list, .detail { border: 1px solid var(--jb-v3-line); background: var(--jb-v3-panel); }
        .row {
          width: 100%; display: grid; grid-template-columns: 36px 1fr auto; gap: 12px; align-items: center;
          padding: 14px 16px; border: 0; border-bottom: 1px solid var(--jb-v3-line); background: transparent;
          color: inherit; font: inherit; text-align: left; cursor: pointer;
        }
        .row:last-child { border-bottom: 0; }
        .row.on, .row:hover { background: var(--jb-v3-accent-soft); }
        .avatar {
          width: 36px; height: 36px; display: grid; place-items: center; border: 1px solid var(--jb-v3-line-2);
          font-family: var(--jb-v3-font-mono); font-size: 11px; color: var(--jb-v3-fg-2);
        }
        .avatar.lg { width: 48px; height: 48px; font-size: 14px; }
        .who { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .who strong { font-size: 14px; font-weight: 600; }
        .who em { font-style: normal; font-size: 12px; color: var(--jb-v3-fg-3); }
        .stage { font-family: var(--jb-v3-font-mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--jb-v3-fg-3); }
        .identity { display: grid; grid-template-columns: 48px 1fr auto; gap: 14px; align-items: center; padding: 22px 22px 0; }
        h2 { margin: 0; font-size: 28px; font-weight: 500; }
        .identity p { margin: 4px 0 0; color: var(--jb-v3-fg-2); font-size: 14px; }
        dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin: 22px; padding-top: 18px; border-top: 1px solid var(--jb-v3-line); }
        dt { font-family: var(--jb-v3-font-mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--jb-v3-fg-3); margin-bottom: 5px; }
        dd { margin: 0; font-size: 13.5px; }
        dd a { color: var(--jb-v3-accent); text-decoration: none; }
        .skills { display: flex; flex-wrap: wrap; gap: 7px; margin: 0 22px 8px; }
        .skills span { font-family: var(--jb-v3-font-mono); font-size: 10px; letter-spacing: .06em; color: var(--jb-v3-fg-2); border: 1px solid var(--jb-v3-line); padding: 4px 8px; }
        .detail :global(.resume-assessment) { margin: 0 22px; }
        .actions { display: flex; justify-content: flex-end; gap: 8px; padding: 18px 22px 22px; }
        .ghost, .primary, .ghost-link {
          font: inherit; font-size: 12.5px; font-weight: 600; border-radius: 2px; padding: 9px 14px; cursor: pointer;
        }
        .ghost { color: var(--jb-v3-fg-2); background: transparent; border: 1px solid var(--jb-v3-line-2); }
        .primary { color: #fff; background: var(--jb-v3-accent); border: none; }
        .ghost-link { display: inline-block; margin-top: 12px; color: var(--jb-v3-fg); border: 1px solid var(--jb-v3-line-2); text-decoration: none; }
        .empty-filter { padding: 28px 16px; color: var(--jb-v3-fg-3); font-size: 13.5px; }
        @media (max-width: 860px) {
          .content { padding: 32px 18px 64px; }
          .split { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
