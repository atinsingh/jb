'use client';

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { ErrorState, LoadingState } from '@/components/employer/EmployerStates';
import { employerJobsApi, employerPipelineApi } from '@/services/employerApi';

const recordId = (value) => String(value?._id || value || '');

export default function EmployerPipelinePage() {
  const [jobs, setJobs] = useState([]);
  const [candidateCounts, setCandidateCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsResponse, applicantsResponse] = await Promise.all([
        employerJobsApi.list(),
        employerPipelineApi.list(),
      ]);
      const applicants = Array.isArray(applicantsResponse)
        ? applicantsResponse
        : applicantsResponse?.applicants || [];
      const counts = applicants.reduce((result, applicant) => {
        const jobId = recordId(applicant.jobId || applicant.job);
        if (jobId) result[jobId] = (result[jobId] || 0) + 1;
        return result;
      }, {});
      setJobs((jobsResponse?.jobs || []).filter((job) => job.status === 'active'));
      setCandidateCounts(counts);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Head><title>Pipeline · Jobocate for Employers</title></Head>
      <div id="emapp" className="pipeline-page">
        <EmployerSidebar active="candidates" />
        <main>
          <div className="dot-fade" aria-hidden="true" />
          <div className="content">
            <div className="heading">
              <div>
                <span>Candidate pipeline</span>
                <h1>By role</h1>
              </div>
              <strong>{jobs.length} live roles</strong>
            </div>

            {loading && <LoadingState label="Loading pipeline…" tone="dark" />}
            {!loading && error && <ErrorState error={error} onRetry={load} tone="dark" />}
            {!loading && !error && (
              <section aria-label="Pipeline by role" className="role-list">
                {jobs.map((job) => {
                  const id = job._id || job.id;
                  return (
                    <Link key={id || job.title} href={id ? `/employer/jobs/${id}/applications` : '/employer/jobs'}>
                      <div>
                        <strong>{job.title || 'Untitled role'}</strong>
                        <span>{[job.location, job.workplaceType || job.type].filter(Boolean).join(' · ') || 'Details pending'}</span>
                      </div>
                      <span>{candidateCounts[recordId(id)] || 0} candidates</span>
                      <span>{job.createdAt ? `${Math.max(0, Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 86_400_000))}d open` : 'Open'}</span>
                      <b>View</b>
                    </Link>
                  );
                })}
                {jobs.length === 0 && <p>No live roles have candidates yet.</p>}
              </section>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .pipeline-page { min-height: 100vh; display: flex; background: var(--jb-v3-bg); color: var(--jb-v3-fg); }
        main { position: relative; flex: 1; min-width: 0; }
        .dot-fade { position: absolute; inset: 0 0 auto; height: 520px; pointer-events: none; background-image: radial-gradient(circle, var(--jb-v3-dot) .8px, transparent .9px); background-size: 26px 26px; mask-image: linear-gradient(#000, transparent); }
        .content { position: relative; width: min(100%, 1160px); margin: 0 auto; padding: 44px 28px 80px; }
        .heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 32px; }
        .heading span, .heading > strong, .role-list > a > span, .role-list b { font-family: var(--jb-v3-font-mono); text-transform: uppercase; letter-spacing: .12em; }
        .heading span { color: var(--jb-v3-fg-3); font-size: 10px; }
        h1 { margin: 7px 0 0; font-size: clamp(30px, 4vw, 44px); font-weight: 500; }
        .heading > strong { color: var(--jb-v3-fg-3); font-size: 10px; font-weight: 400; }
        .role-list { border-top: 1px solid var(--jb-v3-line); }
        .role-list > a { min-height: 74px; display: grid; grid-template-columns: minmax(240px, 1fr) 150px 100px 58px; gap: 22px; align-items: center; color: var(--jb-v3-fg); border-bottom: 1px solid var(--jb-v3-line); text-decoration: none; }
        .role-list > a:hover { background: var(--jb-v3-accent-soft); }
        .role-list > a > div { display: flex; flex-direction: column; gap: 4px; }
        .role-list > a > div strong { font-size: 14px; }
        .role-list > a > div span { color: var(--jb-v3-fg-2); font-size: 12px; }
        .role-list > a > span { color: var(--jb-v3-fg-3); font-size: 9px; }
        .role-list b { color: var(--jb-v3-accent-faint); font-size: 9px; text-align: right; }
        .role-list p { padding: 32px 0; color: var(--jb-v3-fg-2); }
        @media (max-width: 700px) { .content { padding: 32px 18px 64px; } .role-list > a { grid-template-columns: 1fr auto; padding: 16px 0; } .role-list > a > span { display: none; } }
      `}</style>
    </>
  );
}
