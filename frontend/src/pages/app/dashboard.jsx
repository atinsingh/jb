'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import {
  getMyMatches,
  getMyApplications,
  getUserPreferences,
  getJobRecommendations,
} from '@/services/dashboardApi';

/* ----------------------------------------------------- design sample data --- */
const SAMPLE_STATS = [
  { label: 'Applied', value: '247', delta: '+6', sub: 'this week', bg: '#FFFEFB', border: '#E6DECF', labelColor: '#8A8378', deltaColor: '#157A49', valueColor: '#1B1A16', subColor: '#8A8378' },
  { label: 'Interviews', value: '18', delta: '+3', sub: '2 upcoming', bg: '#FFFEFB', border: '#E6DECF', labelColor: '#8A8378', deltaColor: '#157A49', valueColor: '#1B1A16', subColor: '#8A8378' },
  { label: 'Avg. match', value: '94%', delta: '↑ 4%', sub: 'last 30 days', bg: '#EAF6EE', border: '#CDE9D6', labelColor: '#1FA463', deltaColor: '#157A49', valueColor: '#157A49', subColor: '#5A8C6E' },
  { label: 'Response rate', value: '31%', delta: '3× avg', sub: 'vs 11% typical', bg: '#FFFEFB', border: '#E6DECF', labelColor: '#8A8378', deltaColor: '#C9622E', valueColor: '#1B1A16', subColor: '#8A8378' },
];

const SAMPLE_MATCHES = [
  { logo: 'St', company: 'Stripe', role: 'Senior Product Designer', location: 'Remote', salary: '$170–210k', match: '96%', bg: '#EAF6EE', fg: '#157A49' },
  { logo: 'Fi', company: 'Figma', role: 'Product Manager, Growth', location: 'SF · Hybrid', salary: '$185–220k', match: '93%', bg: '#F4EFE4', fg: '#1B1A16' },
  { logo: 'Li', company: 'Linear', role: 'Senior Frontend Engineer', location: 'Remote', salary: '$180–215k', match: '91%', bg: '#F4EFE4', fg: '#1B1A16' },
  { logo: 'No', company: 'Notion', role: 'Design Systems Lead', location: 'NYC · Hybrid', salary: '$190–230k', match: '89%', bg: '#F4EFE4', fg: '#1B1A16' },
];

const SAMPLE_PIPELINE = [
  { stage: 'Applied', count: '247', pct: '100%', color: '#1B1A16' },
  { stage: 'In review', count: '52', pct: '52%', color: '#C9622E' },
  { stage: 'Interviewing', count: '18', pct: '24%', color: '#1FA463' },
  { stage: 'Offers', count: '3', pct: '8%', color: '#5BD08C' },
];

const SAMPLE_ACTIVITY = [
  { logo: 'Va', company: 'Vanta', role: 'Staff Product Designer', time: '3:12 AM', bg: '#F4EFE4', fg: '#1B1A16' },
  { logo: 'Ra', company: 'Ramp', role: 'Senior PM, Platform', time: '2:48 AM', bg: '#F4EFE4', fg: '#1B1A16' },
  { logo: 'Re', company: 'Retool', role: 'Frontend Engineer', time: '1:55 AM', bg: '#F4EFE4', fg: '#1B1A16' },
];

/* ------------------------------------------------------------- helpers --- */
const initials = (name = '') => {
  const clean = String(name).trim();
  if (!clean) return '··';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const pct = (n, d) => (d > 0 ? `${Math.min(100, Math.round((n / d) * 100))}%` : '0%');

const formatMatch = (m) => {
  const raw = m?.matchScore ?? m?.score ?? m?.match ?? m?.overallScore;
  if (raw == null) return '—';
  const num = Number(raw);
  if (Number.isNaN(num)) return String(raw);
  return num <= 1 ? `${Math.round(num * 100)}%` : `${Math.round(num)}%`;
};

const formatSalary = (job) => {
  if (job?.salary) return job.salary;
  const min = job?.salaryMin ?? job?.salary_min;
  const max = job?.salaryMax ?? job?.salary_max;
  const k = (v) => `$${Math.round(Number(v) / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max).replace('$', '')}`;
  if (min) return `${k(min)}+`;
  return '—';
};

const PALETTE = ['#F4EFE4', '#EAF6EE', '#F4EFE4', '#F4EFE4'];

// Normalize a backend match record into the design's row shape.
const toMatchRow = (m, i) => {
  const job = m?.job || m?.scrapedJob || m;
  const company = job?.company || job?.companyName || 'Company';
  const role = job?.title || job?.role || job?.jobTitle || 'Role';
  const location = job?.location || job?.jobLocation || 'Remote';
  return {
    logo: initials(company),
    company,
    role,
    location,
    salary: formatSalary(job),
    match: formatMatch(m),
    bg: i === 0 ? '#EAF6EE' : PALETTE[i % PALETTE.length],
    fg: i === 0 ? '#157A49' : '#1B1A16',
  };
};

const toActivityRow = (a) => {
  const job = a?.job || a?.scrapedJob || a;
  const company = job?.company || job?.companyName || 'Company';
  const role = job?.title || job?.role || job?.jobTitle || 'Role';
  const when = a?.appliedAt || a?.createdAt || a?.updatedAt;
  let time = a?.time || '';
  if (!time && when) {
    try {
      time = new Date(when).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      time = '';
    }
  }
  return {
    logo: initials(company),
    company,
    role,
    time: time || 'recently',
    bg: '#F4EFE4',
    fg: '#1B1A16',
  };
};

const STATUS_GROUPS = {
  applied: ['queued', 'pending', 'submitted', 'applied', 'processing'],
  review: ['in_review', 'in-review', 'reviewing', 'screening', 'under_review'],
  interview: ['interview', 'interviewing', 'interview_scheduled'],
  offer: ['offer', 'offered', 'accepted'],
};

const matchStatus = (status, group) => {
  const s = String(status || '').toLowerCase();
  return STATUS_GROUPS[group].some((k) => s.includes(k.replace(/[-_]/g, '')) || s === k);
};

/* ------------------------------------------------------------ component --- */
export default function AppDashboard() {
  const [stats, setStats] = useState(SAMPLE_STATS);
  const [matches, setMatches] = useState(SAMPLE_MATCHES);
  const [pipeline, setPipeline] = useState(SAMPLE_PIPELINE);
  const [activity, setActivity] = useState(SAMPLE_ACTIVITY);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (stored) {
          const u = JSON.parse(stored);
          if (!cancelled && u?.name) setUserName(u.name);
        }
      } catch (e) {
        /* ignore */
      }

      const [matchesRes, recsRes, appsRes, prefsRes] = await Promise.allSettled([
        getMyMatches({ minScore: 60 }),
        getJobRecommendations(60),
        getMyApplications({ limit: 200 }),
        getUserPreferences(),
      ]);

      if (cancelled) return;

      let gotData = false;

      // --- Matches / recommendations ---
      const rawMatches =
        (matchesRes.status === 'fulfilled' &&
          (matchesRes.value?.matches || matchesRes.value)) ||
        (recsRes.status === 'fulfilled' &&
          (recsRes.value?.recommendations || recsRes.value)) ||
        null;
      const matchList = Array.isArray(rawMatches) ? rawMatches : null;
      if (matchList && matchList.length) {
        setMatches(matchList.slice(0, 4).map(toMatchRow));
        gotData = true;
      }

      // --- Applications -> pipeline + activity + stats ---
      const rawApps =
        appsRes.status === 'fulfilled' &&
        (appsRes.value?.applications || (Array.isArray(appsRes.value) ? appsRes.value : null));
      const appList = Array.isArray(rawApps) ? rawApps : null;
      const appsTotal =
        (appsRes.status === 'fulfilled' && appsRes.value?.total) ||
        (appList ? appList.length : 0);

      if (appList && appList.length) {
        gotData = true;
        const counts = {
          applied: appList.length,
          review: appList.filter((a) => matchStatus(a.status, 'review')).length,
          interview: appList.filter((a) => matchStatus(a.status, 'interview')).length,
          offer: appList.filter((a) => matchStatus(a.status, 'offer')).length,
        };
        const total = counts.applied || 1;
        setPipeline([
          { stage: 'Applied', count: String(counts.applied), pct: '100%', color: '#1B1A16' },
          { stage: 'In review', count: String(counts.review), pct: pct(counts.review, total), color: '#C9622E' },
          { stage: 'Interviewing', count: String(counts.interview), pct: pct(counts.interview, total), color: '#1FA463' },
          { stage: 'Offers', count: String(counts.offer), pct: pct(counts.offer, total), color: '#5BD08C' },
        ]);

        const recent = [...appList]
          .sort((a, b) => new Date(b.appliedAt || b.createdAt || 0) - new Date(a.appliedAt || a.createdAt || 0))
          .slice(0, 3)
          .map(toActivityRow);
        if (recent.length) setActivity(recent);

        const matchCount = matchList ? matchList.length : 0;
        const avgMatch = matchList && matchList.length
          ? Math.round(
              matchList.reduce((acc, m) => {
                const v = Number(m?.matchScore ?? m?.score ?? m?.overallScore ?? 0);
                return acc + (v <= 1 ? v * 100 : v);
              }, 0) / matchList.length
            )
          : null;

        setStats([
          { ...SAMPLE_STATS[0], value: String(appsTotal || counts.applied), delta: `+${counts.applied}`, sub: 'total' },
          { ...SAMPLE_STATS[1], value: String(counts.interview), delta: `+${counts.interview}`, sub: `${counts.offer} offers` },
          { ...SAMPLE_STATS[2], value: avgMatch != null ? `${avgMatch}%` : SAMPLE_STATS[2].value, sub: `${matchCount} matches` },
          { ...SAMPLE_STATS[3], value: counts.applied ? `${pct(counts.review + counts.interview + counts.offer, total)}` : SAMPLE_STATS[3].value, sub: 'response rate' },
        ]);
      }

      // Touch prefs result (graceful — no UI dependency, just confirms wiring).
      if (prefsRes.status === 'fulfilled' && prefsRes.value?.preferences) {
        gotData = true;
      }

      if (!cancelled) {
        setLive(gotData);
        setLoading(false);
      }
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = userName ? `Good morning, ${userName.split(' ')[0]}.` : 'Good morning.';
  const matchesNew = matches.length;

  return (
    <>
      <Head>
        <title>Dashboard — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbapp * {
          box-sizing: border-box;
        }
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus {
          outline: none;
        }
        @keyframes jbskel {
          0% {
            opacity: 0.55;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.55;
          }
        }
        @media (max-width: 980px) {
          #jbapp .jb-stats {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #jbapp .jb-two-col {
            grid-template-columns: 1fr !important;
          }
          #jbapp .jb-activity {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="dashboard" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* TOPBAR */}
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
              Workspace / Dashboard
            </div>
            <div style={{ flex: 1 }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                background: '#FFFEFB',
                border: '1px solid #E1D9C9',
                borderRadius: 999,
                padding: '9px 15px',
                width: 280,
              }}
            >
              <span style={{ color: '#A79E8F', fontSize: 14 }}>⌕</span>
              <input
                placeholder="Search roles, companies…"
                style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#1B1A16', minWidth: 0 }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10,
                  color: '#A79E8F',
                  border: '1px solid #E1D9C9',
                  borderRadius: 5,
                  padding: '1px 5px',
                }}
              >
                ⌘K
              </span>
            </div>
            <button
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                flexShrink: 0,
                border: '1px solid #E1D9C9',
                background: '#FFFEFB',
                borderRadius: 999,
                cursor: 'pointer',
                fontSize: 16,
                color: '#46413A',
              }}
            >
              ◔
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 9,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#1FA463',
                  border: '1.5px solid #F7F3EA',
                }}
              />
            </button>
            <Link
              href={appRoute('App Auto-Apply.dc.html')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#1B1A16',
                color: '#F7F3EA',
                fontSize: 13.5,
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              Upgrade ✦
            </Link>
          </header>

          <div style={{ padding: '30px 32px 48px', maxWidth: 1180, width: '100%' }}>
            {/* GREETING */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 26, flexWrap: 'wrap' }}>
              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11.5,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#1FA463',
                    marginBottom: 10,
                  }}
                >
                  {today}
                </div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 42, lineHeight: 1, letterSpacing: '-0.01em', margin: 0 }}>
                  {greeting}
                </h1>
                <p style={{ fontSize: 16, color: '#5A544A', margin: '10px 0 0' }}>
                  Your copilot applied to <b style={{ color: '#1B1A16' }}>{activity.length} roles</b> overnight. {matchesNew} fresh matches are waiting.
                </p>
              </div>
              <Link
                href={appRoute('App Matches.dc.html')}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  background: '#1FA463',
                  color: '#0C2C1C',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '14px 22px',
                  borderRadius: 999,
                  textDecoration: 'none',
                }}
              >
                Review matches <span>→</span>
              </Link>
            </div>

            {/* STAT CARDS */}
            <div className="jb-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
              {(loading ? SAMPLE_STATS : stats).map((s, i) => (
                <div key={s.label + i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: s.labelColor }}>{s.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, fontWeight: 600, color: s.deltaColor }}>{s.delta}</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 38, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: s.valueColor, animation: loading ? 'jbskel 1.2s ease-in-out infinite' : 'none' }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: s.subColor, marginTop: 8 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* TWO COLUMN */}
            <div className="jb-two-col" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 14 }}>
              {/* TODAY'S MATCHES */}
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid #EEE7D9' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Today&apos;s top matches</h2>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#1FA463' }}>● {matches.length} new</span>
                  </div>
                  <Link href={appRoute('App Matches.dc.html')} style={{ fontSize: 13.5, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>See all →</Link>
                </div>
                {matches.length === 0 ? (
                  <div style={{ padding: '34px 22px', textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No matches yet — we&apos;ll surface roles as soon as they land.</div>
                ) : (
                  matches.map((job, i) => (
                    <div key={job.role + i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 22px', borderBottom: '1px solid #F2ECE0' }}>
                      <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 11, background: job.bg, color: job.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{job.logo}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{job.role}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#8A8378', flexWrap: 'wrap' }}>
                          <span>{job.company}</span><span>·</span><span>{job.location}</span><span>·</span><span>{job.salary}</span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 600, color: '#157A49' }}>{job.match}</div>
                        <div style={{ fontSize: 10.5, color: '#8A8378', fontFamily: "'JetBrains Mono',monospace" }}>match</div>
                      </div>
                      <Link href={appRoute('App Apply.dc.html')} style={{ flexShrink: 0, background: '#1B1A16', color: '#F7F3EA', fontSize: 12.5, fontWeight: 600, padding: '9px 15px', borderRadius: 999, textDecoration: 'none' }}>Apply</Link>
                    </div>
                  ))
                )}
              </div>

              {/* RIGHT RAIL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* PIPELINE */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Pipeline</h2>
                    <Link href={appRoute('App Tracker.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>Track →</Link>
                  </div>
                  {pipeline.map((p, i) => (
                    <div key={p.stage + i} style={{ marginBottom: 15 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#46413A' }}>{p.stage}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600 }}>{p.count}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: '#F2ECE0', overflow: 'hidden' }}>
                        <div style={{ width: p.pct, height: '100%', background: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* NEXT INTERVIEW */}
                <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', borderRadius: 18, padding: 22, color: '#F2EDE2' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 90% 0%, rgba(31,164,99,0.3), transparent 60%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 14 }}>Next up · in 2 days</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>St</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#FBF8F1' }}>Sr. Product Designer</div>
                        <div style={{ fontSize: 12.5, color: '#9A9286' }}>Stripe · Final round</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#B8B1A4', marginBottom: 18 }}>Mon, Jun 29 · 2:00 PM with the design team.</div>
                    <Link href={appRoute('App Interview.dc.html')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1FA463', color: '#0C2C1C', fontSize: 14, fontWeight: 700, padding: 12, borderRadius: 999, textDecoration: 'none' }}>Prep with AI →</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* AUTO-APPLY ACTIVITY */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, marginTop: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px', borderBottom: '1px solid #EEE7D9' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Overnight auto-apply activity</h2>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#1FA463' }}>● {activity.length} sent</span>
                </div>
                <Link href={appRoute('App Auto-Apply.dc.html')} style={{ fontSize: 13.5, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>View queue →</Link>
              </div>
              {activity.length === 0 ? (
                <div style={{ padding: '34px 22px', textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No auto-apply activity yet.</div>
              ) : (
                <div className="jb-activity" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: '#F2ECE0' }}>
                  {activity.map((a, i) => (
                    <div key={a.role + i} style={{ background: '#FFFEFB', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 13 }}>
                      <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: a.bg, color: a.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{a.logo}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.role}</div>
                        <div style={{ fontSize: 12, color: '#8A8378' }}>{a.company} · {a.time}</div>
                      </div>
                      <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, color: '#157A49', background: '#EAF6EE', padding: '4px 9px', borderRadius: 999 }}>✓ Sent</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
