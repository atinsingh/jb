'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState } from '@/components/employer/EmployerStates';
import {
  employerJobsApi,
  employerPipelineApi,
  employerInterviewsApi,
  employerOffersApi,
  employerCompanyApi,
} from '@/services/employerApi';

const STAGES = [
  { key: 'total', label: 'Applicants' },
  { key: 'screening', label: 'Screened' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
];

const DAY = 86_400_000;

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const recordId = (value) => String(value?._id || value || '');

function conversion(current, previous, first) {
  if (first) return 100;
  if (!previous) return 0;
  return Math.round((current / previous) * 100);
}

function activitySeries(applicants) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const values = Array.from({ length: 30 }, () => 0);

  applicants.forEach((applicant) => {
    const created = new Date(applicant.createdAt || applicant.appliedAt || applicant.created_at);
    if (Number.isNaN(created.getTime())) return;
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
    const daysAgo = Math.floor((today - createdDay) / DAY);
    if (daysAgo >= 0 && daysAgo < 30) values[29 - daysAgo] += 1;
  });

  return values;
}

function chartPoints(values) {
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 88 - (value / max) * 70;
      return `${x},${y}`;
    })
    .join(' ');
}

function MeterTicks({ value, ceiling }) {
  const active = Math.max(0, Math.min(16, Math.round((value / Math.max(ceiling, 1)) * 16)));
  return (
    <span className="meter" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => (
        <span key={index} className={index < active ? 'on' : ''} />
      ))}
    </span>
  );
}

export default function EmployerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [offers, setOffers] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [companyName, setCompanyName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, jobsRes, interviewsRes, offersRes, applicantsRes] = await Promise.all([
        employerPipelineApi.stats(),
        employerJobsApi.list(),
        employerInterviewsApi.list({ status: 'scheduled' }),
        employerOffersApi.list(),
        employerPipelineApi.list(),
      ]);

      setStats(statsRes || {});
      setJobs(Array.isArray(jobsRes?.jobs) ? jobsRes.jobs : []);
      setInterviews(Array.isArray(interviewsRes?.interviews) ? interviewsRes.interviews : []);
      setOffers(Array.isArray(offersRes?.offers) ? offersRes.offers : []);
      setApplicants(
        Array.isArray(applicantsRes)
          ? applicantsRes
          : Array.isArray(applicantsRes?.applicants)
            ? applicantsRes.applicants
            : [],
      );
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    employerCompanyApi
      .get()
      .then((response) => setCompanyName(response?.company?.name || ''))
      .catch(() => {});
  }, [load]);

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === 'active'),
    [jobs],
  );
  const applicantsByJob = useMemo(
    () => applicants.reduce((counts, applicant) => {
      const jobId = recordId(applicant.jobId || applicant.job);
      if (jobId) counts[jobId] = (counts[jobId] || 0) + 1;
      return counts;
    }, {}),
    [applicants],
  );
  const funnel = STAGES.map((stage, index) => {
    const value = number(stats[stage.key]);
    const previous = index === 0 ? value : number(stats[STAGES[index - 1].key]);
    return { ...stage, value, percent: conversion(value, previous, index === 0) };
  });
  const activity = activitySeries(applicants);
  const points = chartPoints(activity);

  const metrics = [
    { label: 'Open roles', value: openJobs.length, note: 'live', ceiling: 20 },
    { label: 'Applicants', value: number(stats.total), note: 'total', ceiling: 2000 },
    { label: 'Interviews', value: interviews.length, note: 'scheduled', ceiling: 50 },
    { label: 'Offers', value: offers.length, note: 'out', ceiling: 50 },
  ];

  return (
    <>
      <Head><title>Employer dashboard · Jobocate</title></Head>
      <div className="employer-dashboard">
        <EmployerSidebar active="dashboard" />

        <main>
          <div className="dot-field" aria-hidden="true" />
          <div className="content">
            {loading && <LoadingState label="Loading your pipeline…" tone="dark" />}
            {!loading && error && <ErrorState error={error} onRetry={load} tone="dark" />}

            {!loading && !error && (
              <>
                <div className="page-heading">
                  <h1>{companyName || 'Your company'}</h1>
                  <span>{openJobs.length} live roles</span>
                </div>

                <section className="metrics" aria-label="Hiring metrics">
                  {metrics.map((metric) => (
                    <article key={metric.label}>
                      <span className="label">{metric.label}</span>
                      <div className="metric-value">
                        <strong>{metric.value}</strong>
                        <span>{metric.note}</span>
                      </div>
                      <MeterTicks value={metric.value} ceiling={metric.ceiling} />
                    </article>
                  ))}
                </section>

                <div className="data-grid">
                  <section className="funnel" aria-label="Recruiting funnel">
                    <h2>Funnel</h2>
                    <div className="funnel-rows">
                      {funnel.map((stage) => (
                        <div className="funnel-row" key={stage.key}>
                          <span className="stage">{stage.label}</span>
                          <strong>{stage.value}</strong>
                          <span className="track" aria-hidden="true">
                            <span style={{ width: `${stage.percent}%` }} />
                          </span>
                          <span className="percent">{stage.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="activity">
                    <h2>Applications · 30 days</h2>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Applications received in the last 30 days"
                    >
                      <line x1="0" y1="88" x2="100" y2="88" />
                      <line x1="0" y1="53" x2="100" y2="53" />
                      <line x1="0" y1="18" x2="100" y2="18" />
                      <polyline points={points} />
                    </svg>
                    {!activity.some(Boolean) && <p>No application activity yet.</p>}
                  </section>
                </div>

                <section className="roles" aria-label="Open roles">
                  <div className="section-heading">
                    <h2>Open roles</h2>
                    <Link href="/employer/jobs">All roles →</Link>
                  </div>
                  {openJobs.slice(0, 4).map((job) => (
                    <Link
                      key={job._id || job.id || job.title}
                      href={job._id || job.id ? `/employer/jobs/${job._id || job.id}/applications` : '/employer/jobs'}
                      className="role-row"
                    >
                      <strong>{job.title || 'Untitled role'}</strong>
                      <span>{[job.location, job.type].filter(Boolean).join(' · ') || 'Details pending'}</span>
                      <span>{applicantsByJob[recordId(job._id || job.id)] || 0} applied</span>
                    </Link>
                  ))}
                  {openJobs.length === 0 && (
                    <div className="empty-row">
                      <span>No roles are live yet.</span>
                      <Link href="/employer/jobs/post">Post a role</Link>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .employer-dashboard {
          min-height: 100vh;
          display: flex;
          background: var(--jb-v3-bg);
          color: var(--jb-v3-fg);
          font-family: var(--jb-v3-font-display);
        }
        main {
          position: relative;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          background: var(--jb-v3-bg);
        }
        .dot-field {
          position: absolute;
          inset: 0 0 auto;
          height: min(620px, 72vh);
          pointer-events: none;
          opacity: 0.62;
          background-image: radial-gradient(circle, var(--jb-v3-dot) 0.8px, transparent 0.9px);
          background-size: 26px 26px;
          mask-image: linear-gradient(to bottom, #000 0%, rgba(0,0,0,.72) 48%, transparent 100%);
        }
        .content {
          position: relative;
          z-index: 1;
          width: min(100%, 1360px);
          margin: 0 auto;
          padding: 42px 28px 80px;
        }
        .page-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 30px;
        }
        h1 {
          margin: 0;
          font-size: clamp(25px, 3vw, 31px);
          font-weight: 600;
          letter-spacing: -0.035em;
        }
        .page-heading > span,
        .label,
        h2,
        .percent {
          font-family: var(--jb-v3-font-mono);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        .page-heading > span { color: var(--jb-v3-fg-3); font-size: 10px; }
        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border: 1px solid var(--jb-v3-line);
          background: color-mix(in srgb, var(--jb-v3-panel) 88%, transparent);
        }
        .metrics article {
          min-width: 0;
          padding: 22px 22px 20px;
          border-right: 1px solid var(--jb-v3-line);
        }
        .metrics article:last-child { border-right: 0; }
        .label { display: block; color: var(--jb-v3-fg-3); font-size: 9.5px; }
        .metric-value { display: flex; align-items: baseline; gap: 8px; margin-top: 11px; }
        .metric-value strong {
          font-family: var(--jb-v3-font-mono);
          font-size: clamp(32px, 4vw, 44px);
          font-weight: 500;
          letter-spacing: -0.06em;
        }
        .metric-value span { color: var(--jb-v3-fg-3); font: 400 10px/1 var(--jb-v3-font-mono); }
        .meter { display: flex; gap: 2px; margin-top: 11px; }
        .meter span { width: 3px; height: 12px; background: var(--jb-v3-tick-off); }
        .meter span.on { background: var(--jb-v3-tick-on); }
        .data-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.75fr) minmax(280px, 0.95fr);
          gap: 44px;
          margin-top: 40px;
        }
        h2 {
          margin: 0 0 12px;
          color: var(--jb-v3-fg-3);
          font-size: 9.5px;
          font-weight: 400;
        }
        .funnel-row {
          display: grid;
          grid-template-columns: 126px 74px minmax(100px, 1fr) 48px;
          align-items: center;
          min-height: 54px;
          border-top: 1px solid var(--jb-v3-line);
        }
        .funnel-row:last-child { border-bottom: 1px solid var(--jb-v3-line); }
        .stage { color: var(--jb-v3-fg-2); font-size: 12px; text-transform: uppercase; }
        .funnel-row strong { font: 500 19px/1 var(--jb-v3-font-mono); }
        .track { height: 5px; background: var(--jb-v3-control); }
        .track > span { display: block; height: 100%; background: var(--jb-v3-accent); }
        .percent { color: var(--jb-v3-fg-3); font-size: 9px; text-align: right; }
        .activity svg {
          width: 100%;
          height: 116px;
          padding: 8px;
          overflow: visible;
          border: 1px solid var(--jb-v3-line);
          background: color-mix(in srgb, var(--jb-v3-panel) 70%, transparent);
        }
        .activity line { stroke: var(--jb-v3-line); stroke-width: 0.55; }
        .activity polyline {
          fill: none;
          stroke: var(--jb-v3-accent);
          stroke-width: 1.2;
          vector-effect: non-scaling-stroke;
        }
        .activity p { margin: 10px 0 0; color: var(--jb-v3-fg-3); font-size: 12px; }
        .roles { margin-top: 46px; }
        .section-heading { display: flex; align-items: baseline; border-bottom: 1px solid var(--jb-v3-line); }
        .section-heading h2 { flex: 1; margin-bottom: 12px; }
        .section-heading a { color: var(--jb-v3-fg-2); font-size: 12px; text-decoration: none; }
        .role-row {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) minmax(180px, .7fr) 110px;
          gap: 20px;
          align-items: center;
          min-height: 58px;
          border-bottom: 1px solid var(--jb-v3-line);
          color: var(--jb-v3-fg);
          text-decoration: none;
        }
        .role-row strong { font-size: 14px; }
        .role-row span { color: var(--jb-v3-fg-2); font-size: 12px; }
        .role-row span:last-child { font-family: var(--jb-v3-font-mono); text-align: right; }
        .empty-row { display: flex; justify-content: space-between; padding: 22px 0; color: var(--jb-v3-fg-2); }
        .empty-row a { color: var(--jb-v3-accent-faint); }
        @media (max-width: 900px) {
          .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .metrics article:nth-child(2) { border-right: 0; }
          .metrics article:nth-child(-n + 2) { border-bottom: 1px solid var(--jb-v3-line); }
          .data-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .content { padding: 30px 18px 64px; }
          .page-heading { align-items: flex-start; flex-direction: column; gap: 8px; }
          .metrics { grid-template-columns: 1fr; }
          .metrics article { border-right: 0; border-bottom: 1px solid var(--jb-v3-line); }
          .metrics article:last-child { border-bottom: 0; }
          .funnel-row { grid-template-columns: 92px 55px minmax(70px, 1fr) 40px; }
          .role-row { grid-template-columns: 1fr auto; padding: 14px 0; }
          .role-row span:first-of-type { grid-column: 1 / -1; grid-row: 2; }
        }
      `}</style>
    </>
  );
}
