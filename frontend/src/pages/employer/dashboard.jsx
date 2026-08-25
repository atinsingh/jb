'use client';

import { useEffect, useState } from 'react';
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

const FUNNEL_COLORS = ['var(--jb-a-accent-soft)', 'var(--jb-a-accent)', 'var(--jb-a-accent-deep)', 'var(--jb-a-accent-deep)', 'var(--jb-a-accent)'];

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

const tone = (t) => {
  if (t === 'indigo') return { dotBg: 'var(--jb-a-tint)', dotBorder: 'var(--jb-a-tint-line)', icon: '•', iconColor: 'var(--jb-a-accent)' };
  if (t === 'green') return { dotBg: 'var(--jb-a-tint)', dotBorder: 'var(--jb-a-tint-line)', icon: '✓', iconColor: 'var(--jb-a-accent)' };
  return { dotBg: 'var(--jb-a-control)', dotBorder: 'var(--jb-a-line)', icon: '•', iconColor: 'var(--jb-a-ink-faint)' };
};

export default function EmployerDashboard() {
  // Count-up animation matching the dc DCLogic componentDidMount.

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real data only — starts empty, populated from the backend.
  const [funnelRaw, setFunnelRaw] = useState([]);
  const [jobsRaw, setJobsRaw] = useState([]);
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

  // "Thu 21 Aug" — see the note on the candidate dashboard's `today`.
  const todayLabel = (() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday} ${d.getDate()} ${month}`;
  })();

  const openRoles = jobsRaw.length;
  const topRole = jobsRaw[0]?.title || '';
  const screened = funnelRaw.find((f) => f.label === 'Screened')?.target || 0;
  const applicants = funnelRaw.find((f) => f.label === 'Applicants')?.target || 0;

  /* The hero answers "what decision is open right now", from the pipeline the
     employer already has. Screening clearance outranks raw applicant volume
     because a screened candidate is waiting on a human; an unscreened one is
     still waiting on the funnel. */
  const hero = (() => {
    if (screened > 0 && topRole) {
      return {
        eyebrow: 'Needs a decision',
        title: `${screened} candidate${screened === 1 ? '' : 's'} cleared screening for ${topRole}.`,
        deck: 'Ranked on job-related criteria only, with the reasoning attached to each one.',
        primary: { label: 'Review shortlist', href: '/employer/screening' },
        secondary: { label: 'Open the role', href: '/employer/jobs' },
      };
    }
    if (applicants > 0) {
      return {
        eyebrow: 'In the pipeline',
        title: `${applicants} applicant${applicants === 1 ? '' : 's'} across ${openRoles} open role${openRoles === 1 ? '' : 's'}.`,
        deck: 'Nothing has cleared screening yet. Screening ranks on job-related criteria and shows its reasoning.',
        primary: { label: 'Open screening', href: '/employer/screening' },
        secondary: { label: 'See all roles', href: '/employer/jobs' },
      };
    }
    if (openRoles === 0) {
      return {
        eyebrow: 'Nothing open',
        title: 'No roles are live yet.',
        deck: 'Post one and candidates start arriving ranked, with the reasoning attached.',
        primary: { label: 'Post a role', href: '/employer/jobs/post' },
        secondary: null,
      };
    }
    return {
      eyebrow: 'All quiet',
      title: `${openRoles} role${openRoles === 1 ? '' : 's'} live, no applicants yet.`,
      deck: 'Distribution takes a few days to build up. Widening the location or seniority band usually helps first.',
      primary: { label: 'Check distribution', href: '/employer/distribution' },
      secondary: { label: 'See all roles', href: '/employer/jobs' },
    };
  })();

  // Flex weights taper 5 → 1.4 so the funnel reads as a funnel even when the
  // real counts are flat or zero. Counts are still the literal numbers.
  const FUNNEL_FLEX = [5, 4, 3, 2, 1.4];
  const funnel = funnelRaw.map((f, i) => ({
    label: f.label,
    count: String(f.target),
    color: FUNNEL_COLORS[i] || 'var(--jb-a-accent)',
    flex: FUNNEL_FLEX[i] ?? 1,
    conv:
      i === 0 || !funnelRaw[i - 1]?.target
        ? ''
        : `${Math.round((f.target / funnelRaw[i - 1].target) * 100)}% of ${funnelRaw[i - 1].label.toLowerCase()}`,
  }));

  return (
    <>
      <Head>
        <title>Hiring · Jobocate for Employers</title>
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--jb-a-stage)', color: 'var(--jb-a-ink)', fontFamily: 'var(--jb-font-sans)' }}>
        <EmployerSidebar active="dashboard" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              rowGap: 10,
              minHeight: 64,
              padding: '12px clamp(20px, 4vw, 44px)',
              borderBottom: '1px solid var(--jb-a-line)',
              background: 'var(--jb-a-header)',
              flexShrink: 0,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              {companyName ? `${companyName} · Hiring` : 'Hiring'}
            </h1>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-a-ink-3)' }}>
              {todayLabel}
            </span>
            <Link
              href="/employer/jobs/post"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 34,
                padding: '0 16px',
                borderRadius: 999,
                background: 'var(--jb-a-accent)',
                color: 'var(--jb-a-accent-ink)',
                fontSize: 13.5,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Post a role
            </Link>
          </header>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'clamp(28px, 4vw, 44px) clamp(20px, 4vw, 44px) 64px' }}>
            <div style={{ maxWidth: 1180 }}>
              {loading && <LoadingState label="Loading your pipeline…" />}
              {!loading && error && <ErrorState error={error} onRetry={load} />}

              {!loading && !error && (
                <>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--jb-a-accent)' }}>
                    {hero.eyebrow}
                  </span>
                  <h2
                    style={{
                      margin: '16px 0 0',
                      fontFamily: 'var(--jb-font-display)',
                      fontWeight: 400,
                      fontSize: 'var(--jb-a-display-lg)',
                      lineHeight: 1.02,
                      letterSpacing: '-0.02em',
                      maxWidth: '24ch',
                    }}
                  >
                    {hero.title}
                  </h2>
                  <p style={{ margin: '18px 0 0', fontSize: 17.5, lineHeight: 1.55, color: 'var(--jb-a-ink-2)', maxWidth: '60ch' }}>
                    {hero.deck}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
                    <Link
                      href={hero.primary.href}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 48,
                        padding: '0 26px',
                        borderRadius: 999,
                        background: 'var(--jb-a-accent)',
                        color: 'var(--jb-a-accent-ink)',
                        fontSize: 15.5,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {hero.primary.label}
                    </Link>
                    {hero.secondary && (
                      <Link
                        href={hero.secondary.href}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: 48,
                          padding: '0 26px',
                          borderRadius: 999,
                          border: '1.5px solid var(--jb-a-line-btn)',
                          background: 'var(--jb-a-card)',
                          color: 'var(--jb-a-ink)',
                          fontSize: 15.5,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        {hero.secondary.label}
                      </Link>
                    )}
                  </div>

                  {/* ── FUNNEL ─────────────────────────────────────────── */}
                  <section style={{ marginTop: 56, paddingTop: 26, borderTop: '1px solid var(--jb-a-line-strong)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--jb-a-ink-3)' }}>
                        Pipeline · all roles
                      </span>
                      <span style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {funnel.map((f) => (
                        <div key={f.label} style={{ flex: `${f.flex} 1 130px`, display: 'flex', flexDirection: 'column', gap: 9 }}>
                          <span aria-hidden="true" style={{ display: 'block', height: 8, borderRadius: 4, background: f.color }} />
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 24, fontWeight: 600 }}>{f.count}</span>
                            <span style={{ fontSize: 13.5, color: 'var(--jb-a-ink-2)' }}>{f.label}</span>
                            {f.conv && (
                              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: 'var(--jb-a-ink-warm)' }}>{f.conv}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ── OPEN ROLES + TODAY'S INTERVIEWS ────────────────── */}
                  <div className="em-split" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 52, marginTop: 52 }}>
                    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, paddingBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--jb-a-ink-3)' }}>
                          Open roles
                        </span>
                        <span style={{ flex: 1, height: 1, background: 'var(--jb-a-line-soft)' }} />
                        <Link href="/employer/jobs" style={{ fontSize: 14, color: 'var(--jb-a-accent)', fontWeight: 600, textDecoration: 'none' }}>
                          All roles →
                        </Link>
                      </div>
                      {jobsRaw.map((j) => (
                        <div key={j.title} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--jb-a-line-soft)' }}>
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 16, fontWeight: 600 }}>{j.title}</span>
                            <span style={{ fontSize: 13.5, color: 'var(--jb-a-ink-3)' }}>{j.meta}</span>
                          </span>
                          <span style={{ width: 90, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 17, fontWeight: 600 }}>{j.newCount}</span>
                            <span style={{ fontSize: 12, color: 'var(--jb-a-ink-warm)' }}>applicants</span>
                          </span>
                        </div>
                      ))}
                      {jobsRaw.length === 0 && (
                        <EmptyState
                          title="No open roles"
                          hint="Post a role and applicants start arriving here."
                          action={
                            <Link href="/employer/jobs/post" style={{ color: 'var(--jb-a-accent)', fontWeight: 600, textDecoration: 'none' }}>
                              Post a role →
                            </Link>
                          }
                        />
                      )}
                    </section>

                    <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, paddingBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--jb-a-ink-3)' }}>
                          Today’s interviews
                        </span>
                        <span style={{ flex: 1, height: 1, background: 'var(--jb-a-line-soft)' }} />
                      </div>
                      {ivRaw.map((iv, i) => (
                        <div key={`${iv.time}-${iv.name}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--jb-a-line-soft)' }}>
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13.5, fontWeight: 600, width: 62, color: 'var(--jb-a-ink-warm)' }}>
                            {iv.time}
                            {iv.ampm}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 15, fontWeight: 600 }}>{iv.name}</span>
                            <span style={{ fontSize: 13, color: 'var(--jb-a-ink-3)' }}>{iv.req}</span>
                          </span>
                          <span style={{ fontSize: 12.5, color: 'var(--jb-a-ink-soft)' }}>{iv.round}</span>
                        </div>
                      ))}
                      {ivRaw.length === 0 && (
                        <div style={{ padding: '16px 0', fontSize: 13.5, color: 'var(--jb-a-ink-3)' }}>
                          No interviews scheduled today.
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .em-split {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </>
  );
}
