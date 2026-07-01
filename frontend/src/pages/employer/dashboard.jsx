'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import {
  employerJobsApi,
  employerPipelineApi,
  aiRecruiterApi,
} from '@/services/employerApi';

// ---- Sample data (fallback when the employer backend is unavailable) ----

const STAT_TARGETS = [
  { label: 'Active jobs', target: 5, suffix: '', trend: '3 of 5 slots used', trendColor: '#8A8378' },
  { label: 'New applicants', target: 37, suffix: '', trend: '▲ 14 today', trendColor: '#4263EB' },
  { label: 'Interviews this week', target: 8, suffix: '', trend: '2 today', trendColor: '#8A8378' },
  { label: 'Avg time-to-hire', target: 24, suffix: 'd', trend: '▼ 2d vs last month', trendColor: '#157A49' },
];

const FUNNEL_RAW = [
  { label: 'Applicants', target: 133, color: '#5C7CEF' },
  { label: 'Screened', target: 48, color: '#4263EB' },
  { label: 'Interview', target: 19, color: '#364FC7' },
  { label: 'Offer', target: 4, color: '#2A3E9E' },
  { label: 'Hired', target: 1, color: '#1FA463' },
];

const JOBS_RAW = [
  { title: 'Senior Product Designer', meta: 'Remote (US) · Full-time', newCount: '12', note: '12 unreviewed' },
  { title: 'Staff Frontend Engineer', meta: 'San Francisco · Full-time', newCount: '8', note: 'interview backlog' },
  { title: 'Product Manager, Growth', meta: 'New York · Hybrid', newCount: '5', note: 'awaiting screens' },
];

const IV_RAW = [
  { time: '11:00', ampm: 'AM', name: 'Jordan Lee', req: 'Staff Frontend Eng', round: 'Technical', type: 'Onsite' },
  { time: '2:00', ampm: 'PM', name: 'Sarah Chen', req: 'Senior Product Designer', round: 'Final round', type: 'Video' },
  { time: '4:30', ampm: 'PM', name: 'Lena Fischer', req: 'PM, Growth', round: 'Recruiter screen', type: 'Phone' },
];

const ACT_RAW = [
  { text: 'Sarah Chen applied to Senior Product Designer — 96% match.', time: '8m ago', t: 'indigo' },
  { text: 'Jordan Lee confirmed his Thu 2:00 PM interview.', time: '1h ago', t: 'neutral' },
  { text: 'Priya Nair accepted your offer for Staff Frontend Engineer.', time: '3h ago', t: 'green' },
  { text: 'You moved Marcus Obi to the Interview stage.', time: '5h ago', t: 'neutral' },
  { text: '14 new applicants arrived across your 3 open roles.', time: '6h ago', t: 'indigo' },
];

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

  // Live data seeded with design samples; overridden on successful fetch.
  const [statTargets, setStatTargets] = useState(STAT_TARGETS);
  const [funnelRaw, setFunnelRaw] = useState(FUNNEL_RAW);
  const [jobsRaw, setJobsRaw] = useState(JOBS_RAW);
  const [actRaw, setActRaw] = useState(ACT_RAW);

  // Fetch live employer data; on any failure keep the sample fallback.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [statsRes, jobsRes, autopilot] = await Promise.all([
        employerPipelineApi.stats().catch(() => null),
        employerJobsApi.list().catch(() => null),
        aiRecruiterApi.autopilot().catch(() => null),
      ]);
      if (!alive) return;

      const jobsArr = Array.isArray(jobsRes?.jobs) ? jobsRes.jobs : null;
      const activeJobs = jobsArr
        ? jobsArr.filter((j) => (j.status || 'active') === 'active')
        : null;

      if (statsRes && typeof statsRes.total === 'number') {
        setFunnelRaw([
          { label: 'Applicants', target: statsRes.total, color: '#5C7CEF' },
          { label: 'Screened', target: statsRes.screening || 0, color: '#4263EB' },
          { label: 'Interview', target: statsRes.interview || 0, color: '#364FC7' },
          { label: 'Offer', target: statsRes.offer || 0, color: '#2A3E9E' },
          { label: 'Hired', target: statsRes.hired || 0, color: '#1FA463' },
        ]);
        setStatTargets((prev) => [
          {
            ...prev[0],
            target: activeJobs ? activeJobs.length : prev[0].target,
            trend: autopilot?.stats
              ? `${autopilot.stats.reqsCovered} covered by autopilot`
              : prev[0].trend,
          },
          { ...prev[1], target: statsRes.applied || 0, trend: `${statsRes.applied || 0} awaiting review` },
          { ...prev[2], target: statsRes.interview || 0, trend: `${statsRes.interview || 0} in interview` },
          prev[3],
        ]);
      }

      if (activeJobs && activeJobs.length) {
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
      }

      if (autopilot?.activity?.length) {
        setActRaw(
          autopilot.activity.slice(0, 5).map((a) => ({
            text: `${a.name} — ${String(a.event || '').replace(/_/g, ' ')}`,
            time: 'recent',
            t: a.event === 'received' ? 'indigo' : 'green',
          })),
        );
      }
    })();
    return () => {
      alive = false;
    };
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

  const max = funnelRaw[0].target || 1;
  const funnel = funnelRaw.map((f, i) => {
    const pctOfMax = Math.max((f.target / max) * 100, 7);
    const prevTarget = i === 0 ? 0 : funnelRaw[i - 1].target;
    const conv =
      i === 0 ? 'start' : (prevTarget ? Math.round((f.target / prevTarget) * 100) : 0) + '%';
    return {
      label: f.label,
      color: f.color,
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

  const interviews = IV_RAW.map((iv) => {
    const ts = typeStyle(iv.type);
    return { ...iv, typeColor: ts.color, typeBg: ts.bg, typeBorder: ts.border };
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
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
          fontFamily: "'Hanken Grotesk',sans-serif",
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
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              Stripe · Hiring / Dashboard
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

          <div style={{ padding: '30px 32px 56px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
            {/* GREETING */}
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  margin: '0 0 8px',
                }}
              >
                Good morning, Dana.
              </h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                Here&rsquo;s where hiring stands today ·{' '}
                <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#8A8378' }}>Sun, Jun 29</span>
              </p>
            </div>

            {/* STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 20 }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10.5,
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
                      fontFamily: "'JetBrains Mono',monospace",
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
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>
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
                            fontFamily: "'JetBrains Mono',monospace",
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
                        fontFamily: "'JetBrains Mono',monospace",
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
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
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
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 10.5,
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
                              fontSize: 9,
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
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 10.5,
                              color: '#A79E8F',
                              marginTop: 3,
                            }}
                          >
                            {a.time}
                          </div>
                        </div>
                      </div>
                    ))}
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
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#1B1A16',
                            }}
                          >
                            {iv.time}
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: '#A79E8F' }}>
                            {iv.ampm}
                          </div>
                        </div>
                        <div style={{ width: 1, background: '#E6DECF', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{iv.name}</span>
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono',monospace",
                                fontSize: 9,
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
