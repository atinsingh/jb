'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState, EmptyState } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import {
  employerJobsApi,
  employerPipelineApi,
  aiRecruiterApi,
  employerInterviewsApi,
  employerCompanyApi,
  employerProfileApi,
} from '@/services/employerApi';

const FUNNEL_COLORS = ['#5C7CEF', '#4263EB', '#364FC7', '#2A3E9E', '#1FA463'];

// Format an ISO timestamp into { time, ampm }.
function clockParts(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { time: '--:--', ampm: '' };
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { time: `${h}:${m}`, ampm };
}

function isToday(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const typeStyle = (t) =>
  t === 'Video'
    ? { color: '#364FC7', bg: '#EDF0FE', border: '#C7D2FB' }
    : t === 'Onsite'
    ? { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' }
    : { color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };

const tone = (t) => {
  if (t === 'indigo') return { dotBg: '#EDF0FE', dotBorder: '#C7D2FB', icon: '•', iconColor: '#4263EB' };
  if (t === 'green') return { dotBg: '#EAF6EE', dotBorder: '#CDE9D6', icon: '✓', iconColor: '#157A49' };
  return { dotBg: '#F2ECE0', dotBorder: '#E1D9C9', icon: '•', iconColor: '#A79E8F' };
};

export default function EmployerDashboard() {
  // Count-up animation matching the dc DCLogic componentDidMount.
  const [p, setP] = useState(0);
  const rafRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real data only — starts empty, populated from the backend.
  const [statTargets, setStatTargets] = useState([]);
  const [funnelRaw, setFunnelRaw] = useState([]);
  const [jobsRaw, setJobsRaw] = useState([]);
  const [actRaw, setActRaw] = useState([]);
  const [ivRaw, setIvRaw] = useState([]);
  const [firstName, setFirstName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Core data — a failure here is surfaced as an error state.
      const [statsRes, jobsRes, autopilot, interviewsRes] = await Promise.all([
        employerPipelineApi.stats(),
        employerJobsApi.list(),
        aiRecruiterApi.autopilot().catch(() => null),
        employerInterviewsApi.list({ status: 'scheduled' }).catch(() => null),
      ]);

      const jobsArr = Array.isArray(jobsRes?.jobs) ? jobsRes.jobs : [];
      const activeJobs = jobsArr.filter(
        (j) => (j.status || 'active') !== 'closed' && (j.status || 'active') !== 'archived',
      );

      const stats = statsRes && typeof statsRes.total === 'number' ? statsRes : {};

      setFunnelRaw([
        { label: 'Applicants', target: stats.total || 0 },
        { label: 'Screened', target: stats.screening || 0 },
        { label: 'Interview', target: stats.interview || 0 },
        { label: 'Offer', target: stats.offer || 0 },
        { label: 'Hired', target: stats.hired || 0 },
      ]);

      setStatTargets([
        { label: 'Active jobs', target: activeJobs.length, suffix: '', trend: `${jobsArr.length} total`, trendColor: '#8A8378' },
        { label: 'New applicants', target: stats.applied || 0, suffix: '', trend: `${stats.applied || 0} awaiting review`, trendColor: '#4263EB' },
        { label: 'In interview', target: stats.interview || 0, suffix: '', trend: `${stats.offer || 0} at offer`, trendColor: '#8A8378' },
        { label: 'Hired', target: stats.hired || 0, suffix: '', trend: 'all time', trendColor: '#157A49' },
      ]);

      setJobsRaw(
        activeJobs.slice(0, 3).map((j) => ({
          title: j.title || 'Untitled role',
          meta:
            [j.location, j.type].filter(Boolean).join(' · ') ||
            (j.isRemote ? 'Remote' : '—'),
          newCount: String(j.applicantsCount ?? j.newApplicants ?? 0),
          note: 'view pipeline',
        })),
      );

      const interviews = Array.isArray(interviewsRes?.interviews)
        ? interviewsRes.interviews
        : [];
      setIvRaw(
        interviews
          .filter((iv) => iv.scheduledAt && isToday(iv.scheduledAt))
          .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
          .map((iv) => {
            const { time, ampm } = clockParts(iv.scheduledAt);
            return {
              time,
              ampm,
              name: iv.candidateName || 'Candidate',
              req: iv.role || iv.jobTitle || '',
              round: iv.round || iv.stage || 'Interview',
              type: iv.type || iv.mode || 'Video',
            };
          }),
      );

      setActRaw(
        Array.isArray(autopilot?.activity)
          ? autopilot.activity.slice(0, 5).map((a) => ({
              text: `${a.name} — ${String(a.event || '').replace(/_/g, ' ')}`,
              time: 'recent',
              t: a.event === 'received' ? 'indigo' : 'green',
            }))
          : [],
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Best-effort personalization — cosmetic only, never fabricated.
    employerProfileApi
      .get()
      .then((res) => {
        const name = res?.user?.name || '';
        setFirstName(name.split(' ')[0] || '');
      })
      .catch(() => {});
    employerCompanyApi
      .get()
      .then((res) => setCompanyName(res?.company?.name || ''))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const dur = 950;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      setP(ease(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const n = (target) => Math.round(target * p);

  const stats = statTargets.map((s) => ({
    label: s.label,
    value: String(n(s.target)) + s.suffix,
    trend: s.trend,
    trendColor: s.trendColor,
  }));

  const max = funnelRaw[0]?.target || 1;
  const funnel = funnelRaw.map((f, i) => {
    const pctOfMax = Math.max((f.target / max) * 100, 7);
    const prevTarget = i === 0 ? 0 : funnelRaw[i - 1].target;
    const conv =
      i === 0 ? 'start' : (prevTarget ? Math.round((f.target / prevTarget) * 100) : 0) + '%';
    return {
      label: f.label,
      color: FUNNEL_COLORS[i] || '#4263EB',
      count: String(n(f.target)),
      width: pctOfMax * p + '%',
      conv,
      convColor: i === 0 ? '#A79E8F' : i === funnelRaw.length - 1 ? '#157A49' : '#8A8378',
    };
  });

  const jobs = jobsRaw.map((j, i, arr) => ({
    ...j,
    divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
  }));

  const interviews = ivRaw.map((iv) => {
    const ts = typeStyle(iv.type);
    return { ...iv, typeColor: ts.color, typeBg: ts.bg, typeBorder: ts.border };
  });

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const activity = actRaw.map((a, i, arr) => ({
    ...tone(a.t),
    text: a.text,
    time: a.time,
    connector: i < arr.length - 1,
  }));

  return (
    <>
      <Head>
        <title>Dashboard — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp a.em-job:hover {
          opacity: 0.85;
        }
        #emapp a.em-iv:hover {
          border-color: #4263eb;
        }
        #emapp a.em-post:hover {
          background: #364fc7;
        }
      `}</style>

      <div
        id="emapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <EmployerSidebar active="dashboard" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              {companyName ? `${companyName} · Hiring / Dashboard` : 'Hiring / Dashboard'}
            </div>
            <div style={{ flex: 1 }} />
            <Link
              href={appRoute('Employer Post Job.dc.html')}
              className="em-post"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#4263EB',
                color: '#FFFFFF',
                fontSize: 13.5,
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 400 }}>＋</span> Post a job
            </Link>
          </header>

          <div style={{ padding: '20px 16px 40px', maxWidth: 1180, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* GREETING */}
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  margin: '0 0 8px',
                }}
              >
                {firstName ? `Good morning, ${firstName}.` : 'Good morning.'}
              </h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                Here&rsquo;s where hiring stands today ·{' '}
                <span style={{ fontFamily: 'var(--jb-font-mono)', color: '#8A8378' }}>{todayLabel}</span>
              </p>
            </div>

            {loading ? (
              <LoadingState label="Loading dashboard…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
             <>
            {/* STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 20 }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#9A9286',
                      marginBottom: 12,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 34,
                      fontWeight: 600,
                      lineHeight: 1,
                      color: '#1B1A16',
                      marginBottom: 8,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: s.trendColor,
                    }}
                  >
                    {s.trend}
                  </div>
                </div>
              ))}
            </div>

            {/* FUNNEL */}
            <div
              style={{
                background: '#FFFEFB',
                border: '1px solid #E6DECF',
                borderRadius: 18,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 18,
                }}
              >
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Hiring funnel</h2>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378' }}>
                  All open roles · last 30 days
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {funnel.map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ width: 88, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#5A544A' }}>
                      {f.label}
                    </span>
                    <div style={{ flex: 1, height: 34, background: '#F4EFE4', borderRadius: 8, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: f.width,
                          height: '100%',
                          background: f.color,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 12px',
                          transition: 'width 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#FFFFFF',
                          }}
                        >
                          {f.count}
                        </span>
                      </div>
                    </div>
                    <span
                      style={{
                        width: 56,
                        flexShrink: 0,
                        textAlign: 'right',
                        fontFamily: 'var(--jb-font-mono)',
                        fontSize: 11.5,
                        color: f.convColor,
                      }}
                    >
                      {f.conv}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* TWO COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch' }}>
              {/* LEFT */}
              <div style={{ flex: 1.5, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* JOBS NEEDING ATTENTION */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Jobs needing attention</h2>
                    <Link
                      href={appRoute('Employer Jobs.dc.html')}
                      style={{ fontSize: 13, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}
                    >
                      All jobs →
                    </Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {jobs.map((j) => (
                      <Link
                        key={j.title}
                        href={appRoute('Employer Candidates.dc.html')}
                        className="em-job"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '14px 0',
                          borderBottom: `1px solid ${j.divider}`,
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16', marginBottom: 3 }}>
                            {j.title}
                          </div>
                          <div style={{ fontSize: 12.5, color: '#8A8378' }}>{j.meta}</div>
                        </div>
                        <span style={{ fontSize: 12.5, color: '#C9622E', flexShrink: 0 }}>{j.note}</span>
                        <span
                          style={{
                            flexShrink: 0,
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            background: '#4263EB',
                            borderRadius: 999,
                            padding: '3px 9px',
                          }}
                        >
                          {j.newCount} new
                        </span>
                        <span style={{ color: '#C9BFAC', flexShrink: 0 }}>→</span>
                      </Link>
                    ))}
                    {jobs.length === 0 && (
                      <div style={{ padding: '14px 0', fontSize: 13, color: '#8A8378' }}>
                        No open jobs yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* RECENT ACTIVITY */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>Recent activity</h2>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {activity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 13 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: a.dotBg,
                              border: `1.5px solid ${a.dotBorder}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              color: a.iconColor,
                            }}
                          >
                            {a.icon}
                          </span>
                          {a.connector && (
                            <span style={{ width: 2, flex: 1, minHeight: 16, background: '#EFE8DA' }} />
                          )}
                        </div>
                        <div style={{ paddingBottom: 15, flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#3A352C' }}>{a.text}</div>
                          <div
                            style={{
                              fontFamily: 'var(--jb-font-mono)',
                              fontSize: 11,
                              color: '#A79E8F',
                              marginTop: 3,
                            }}
                          >
                            {a.time}
                          </div>
                        </div>
                      </div>
                    ))}
                    {activity.length === 0 && (
                      <div style={{ fontSize: 13, color: '#8A8378' }}>
                        No recent activity.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: TODAY'S INTERVIEWS */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Today&rsquo;s interviews</h2>
                    <Link
                      href={appRoute('Employer Interviews.dc.html')}
                      style={{ fontSize: 13, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}
                    >
                      All →
                    </Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {interviews.map((iv) => (
                      <Link
                        key={iv.name}
                        href={appRoute('Employer Interviews.dc.html')}
                        className="em-iv"
                        style={{
                          display: 'flex',
                          gap: 13,
                          padding: 14,
                          background: '#FBF9F4',
                          border: '1px solid #E6DECF',
                          borderRadius: 13,
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ flexShrink: 0, textAlign: 'center', width: 54 }}>
                          <div
                            style={{
                              fontFamily: 'var(--jb-font-mono)',
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#1B1A16',
                            }}
                          >
                            {iv.time}
                          </div>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F' }}>
                            {iv.ampm}
                          </div>
                        </div>
                        <div style={{ width: 1, background: '#E6DECF', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{iv.name}</span>
                            <span
                              style={{
                                fontFamily: 'var(--jb-font-mono)',
                                fontSize: 11,
                                fontWeight: 600,
                                color: iv.typeColor,
                                background: iv.typeBg,
                                border: `1px solid ${iv.typeBorder}`,
                                padding: '2px 7px',
                                borderRadius: 999,
                              }}
                            >
                              {iv.type}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#8A8378' }}>
                            {iv.req} · {iv.round}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {interviews.length === 0 && (
                      <div style={{ padding: '16px 4px', fontSize: 13, color: '#8A8378' }}>
                        No interviews scheduled today.
                      </div>
                    )}
                  </div>
                </div>
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
