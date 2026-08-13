'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import useMarketingTheme from '@/components/site/useMarketingTheme';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import Card from '@/components/app/ui/Card';
import Badge from '@/components/app/ui/Badge';
import Button from '@/components/app/ui/Button';
import PageHeader from '@/components/app/ui/PageHeader';
import {
  getMyMatches,
  getMyApplications,
  getUserPreferences,
  getJobRecommendations,
} from '@/services/dashboardApi';
import { listResumes } from '@/services/resumeApi';

/* ------------------------------------------- static UI config (no user data) */
// Presentational metadata for the KPI cards — labels and palette only. Values
// are always computed from live data (empty => '—').
const STAT_META = [
  { label: 'Applied', icon: '↗', chipBg: 'var(--jb-a-card)', chipInk: 'var(--jb-a-chip-neutral-ink)', bg: 'var(--jb-a-card-alt)', border: 'var(--jb-a-line)', labelColor: 'var(--jb-a-ink-muted)', deltaColor: 'var(--jb-a-accent-2)', valueColor: 'var(--jb-a-ink)', subColor: 'var(--jb-a-ink-muted)' },
  { label: 'Interviews', icon: '◷', chipBg: 'var(--jb-a-card)', chipInk: 'var(--jb-a-chip-neutral-ink)', bg: 'var(--jb-a-card-alt)', border: 'var(--jb-a-line)', labelColor: 'var(--jb-a-ink-muted)', deltaColor: 'var(--jb-a-accent-2)', valueColor: 'var(--jb-a-ink)', subColor: 'var(--jb-a-ink-muted)' },
  { label: 'Avg. match', icon: '◎', chipBg: 'var(--jb-a-chip-success-bg)', chipInk: 'var(--jb-a-accent-2)', bg: 'var(--jb-a-tint)', border: 'var(--jb-a-tint-line)', labelColor: 'var(--jb-a-accent-2)', deltaColor: 'var(--jb-a-accent-2)', valueColor: 'var(--jb-a-accent-2)', subColor: 'var(--jb-a-accent-muted)' },
  { label: 'Response rate', icon: '⤴', chipBg: 'var(--jb-a-card)', chipInk: 'var(--jb-a-chip-neutral-ink)', bg: 'var(--jb-a-card-alt)', border: 'var(--jb-a-line)', labelColor: 'var(--jb-a-ink-muted)', deltaColor: 'var(--jb-a-status-warn)', valueColor: 'var(--jb-a-ink)', subColor: 'var(--jb-a-ink-muted)' },
];
const emptyStats = () => STAT_META.map((m) => ({ ...m, value: '—', delta: '', sub: '' }));

// Pipeline stage labels + colors are fixed UI; counts/percentages are data.
const PIPE_META = [
  { stage: 'Applied', color: 'var(--jb-a-ink)' },
  { stage: 'In review', color: 'var(--jb-a-status-warn)' },
  { stage: 'Interviewing', color: 'var(--jb-a-accent-2)' },
  { stage: 'Offers', color: 'var(--jb-a-accent)' },
];
const emptyPipeline = () => PIPE_META.map((p) => ({ ...p, count: '0', pct: '0%' }));

// Title-case a name so an all-caps stored value ("DHARMENDRA") reads nicely.
const titleCase = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());

const timeGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

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

const PALETTE = ['var(--jb-a-card)', 'var(--jb-a-tint)', 'var(--jb-a-card)', 'var(--jb-a-card)'];

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
    bg: i === 0 ? 'var(--jb-a-tint)' : PALETTE[i % PALETTE.length],
    fg: i === 0 ? 'var(--jb-a-accent-2)' : 'var(--jb-a-ink)',
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
    bg: 'var(--jb-a-card)',
    fg: 'var(--jb-a-ink)',
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
  const [stats, setStats] = useState(emptyStats);
  const [matches, setMatches] = useState([]);
  const [pipeline, setPipeline] = useState(emptyPipeline);
  const [activity, setActivity] = useState([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [hasPrefs, setHasPrefs] = useState(false);

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

      const [matchesRes, recsRes, appsRes, prefsRes, resumesRes] = await Promise.allSettled([
        getMyMatches({ minScore: 60 }),
        getJobRecommendations(60),
        getMyApplications({ limit: 200 }),
        getUserPreferences(),
        listResumes(),
      ]);

      if (cancelled) return;

      // Onboarding signals for the "Get started" card.
      if (resumesRes.status === 'fulfilled') {
        const list = Array.isArray(resumesRes.value) ? resumesRes.value : resumesRes.value?.resumes || [];
        setResumeCount(list.length);
      }
      if (prefsRes.status === 'fulfilled') {
        const p = prefsRes.value?.preferences || prefsRes.value || {};
        setHasPrefs(!!((p.titles && p.titles.length) || (p.locations && p.locations.length)));
      }

      // If every data call rejected, surface an error rather than a blank page.
      const dataCalls = [matchesRes, recsRes, appsRes, prefsRes];
      if (dataCalls.every((r) => r.status === 'rejected')) {
        const firstErr = dataCalls.find((r) => r.status === 'rejected');
        setError(firstErr?.reason || new Error('Could not load your dashboard'));
        setLoading(false);
        return;
      }

      // --- Matches / recommendations ---
      const rawMatches =
        (matchesRes.status === 'fulfilled' &&
          (matchesRes.value?.matches || matchesRes.value)) ||
        (recsRes.status === 'fulfilled' &&
          (recsRes.value?.recommendations || recsRes.value)) ||
        null;
      const matchList = Array.isArray(rawMatches) ? rawMatches : [];
      setMatches(matchList.slice(0, 4).map(toMatchRow));

      // --- Applications -> pipeline + activity + stats ---
      const rawApps =
        appsRes.status === 'fulfilled' &&
        (appsRes.value?.applications || (Array.isArray(appsRes.value) ? appsRes.value : null));
      const appList = Array.isArray(rawApps) ? rawApps : [];
      const appsTotal =
        (appsRes.status === 'fulfilled' && appsRes.value?.total) || appList.length;

      const counts = {
        applied: appList.length,
        review: appList.filter((a) => matchStatus(a.status, 'review')).length,
        interview: appList.filter((a) => matchStatus(a.status, 'interview')).length,
        offer: appList.filter((a) => matchStatus(a.status, 'offer')).length,
      };
      const total = counts.applied || 1;

      setPipeline([
        { ...PIPE_META[0], count: String(counts.applied), pct: counts.applied ? '100%' : '0%' },
        { ...PIPE_META[1], count: String(counts.review), pct: pct(counts.review, total) },
        { ...PIPE_META[2], count: String(counts.interview), pct: pct(counts.interview, total) },
        { ...PIPE_META[3], count: String(counts.offer), pct: pct(counts.offer, total) },
      ]);

      const recent = [...appList]
        .sort((a, b) => new Date(b.appliedAt || b.createdAt || 0) - new Date(a.appliedAt || a.createdAt || 0))
        .slice(0, 3)
        .map(toActivityRow);
      setActivity(recent);

      const matchCount = matchList.length;
      const avgMatch = matchList.length
        ? Math.round(
            matchList.reduce((acc, m) => {
              const v = Number(m?.matchScore ?? m?.score ?? m?.overallScore ?? 0);
              return acc + (v <= 1 ? v * 100 : v);
            }, 0) / matchList.length
          )
        : null;

      const responded = counts.review + counts.interview + counts.offer;
      setStats([
        { ...STAT_META[0], value: String(appsTotal || counts.applied), delta: counts.applied ? `+${counts.applied}` : '', sub: 'total' },
        { ...STAT_META[1], value: String(counts.interview), delta: counts.interview ? `+${counts.interview}` : '', sub: `${counts.offer} offers` },
        { ...STAT_META[2], value: avgMatch != null ? `${avgMatch}%` : '—', delta: '', sub: `${matchCount} matches` },
        { ...STAT_META[3], value: counts.applied ? pct(responded, total) : '—', delta: '', sub: 'response rate' },
      ]);

      if (!cancelled) setLoading(false);
    })().catch((err) => {
      if (!cancelled) {
        setError(err || new Error('Could not load your dashboard'));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = titleCase((userName || '').split(' ')[0]);
  const greeting = firstName ? `${timeGreeting()}, ${firstName}.` : `${timeGreeting()}.`;
  const matchesNew = matches.length;

  // "Get started" onboarding — shown while the workspace is essentially empty.
  const appliedCount = activity.length;
  const isNew = !loading && !error && appliedCount === 0 && matches.length === 0;
  const steps = [
    { key: 'resume', label: 'Add your résumé', hint: 'Import or build one', done: resumeCount > 0, href: '/app/resume-library' },
    { key: 'prefs', label: 'Set job preferences', hint: 'Titles, locations, salary', done: hasPrefs, href: '/app/settings' },
    { key: 'matches', label: 'Review your matches', hint: 'Roles ranked by fit', done: matches.length > 0, href: appRoute('App Matches.dc.html') },
    { key: 'auto', label: 'Turn on Auto-Apply', hint: 'Apply on autopilot', done: appliedCount > 0, href: appRoute('App Auto-Apply.dc.html') },
  ];
  const stepsDone = steps.filter((s) => s.done).length;

  const { theme, toggle: toggleTheme } = useMarketingTheme();

  /* ---- design tokens (Jobocate App.dc.html) ---- */
  /* Every value resolves through --jb-a-* so the stage follows the product
     theme. Light mode restores the exact hexes this object used to hold, so
     the existing design is unchanged; dark mode is the new variant. */
  const T = {
    stage: 'var(--jb-a-stage)', card: 'var(--jb-a-card)',
    line: 'var(--jb-a-line)', line2: 'var(--jb-a-line-strong)',
    ink: 'var(--jb-a-ink)', ink2: 'var(--jb-a-ink-2)', muted: 'var(--jb-a-ink-muted)',
    dark: 'var(--jb-a-invert)', darkPanel: 'var(--jb-a-invert-panel)',
    darkLine: 'var(--jb-a-line)', darkText: 'var(--jb-a-invert-ink)', darkMuted: 'var(--jb-a-invert-muted)',
    green: 'var(--jb-a-accent)', greenInk: 'var(--jb-a-accent-ink)', green2: 'var(--jb-a-accent-2)',
    tint: 'var(--jb-a-tint)', tintLine: 'var(--jb-a-tint-line)',
    blue: 'var(--jb-a-blue)', blueTint: 'var(--jb-a-blue-tint)',
    blueInk: 'var(--jb-a-blue-ink)', blueLine: 'var(--jb-a-blue-line)',
    serif: 'var(--jb-font-display)', mono: 'var(--jb-font-mono)',
  };

  // Honest data only — real values when present, empty states otherwise. Never
  // fabricate sample rows/counts (this dashboard used to; that's a trust bug).
  const hasMatches = Array.isArray(matches) && matches.length > 0;
  const recJobs = (matches || []).slice(0, 3).map((m) => ({
    initial: (m.logo || (m.company || '?').slice(0, 2)).toString().toUpperCase(),
    role: m.role, company: m.company,
    meta: [m.location, m.salary].filter((x) => x && x !== '—').join('  ·  '),
    fit: m.match || '—',
    skills: m.skills && m.skills.length ? m.skills : [],
  }));

  const hasActivity = Array.isArray(activity) && activity.length > 0;
  const overnight = (activity || []).map((a) => ({ glyph: '✓', accent: T.green, line: `Applied to ${a.role} at ${a.company}` }));

  const funnelRows = pipeline.map((p, i) => ({
    label: p.stage, count: p.count || '0', width: p.pct || '0%', color: [T.ink, T.blue, T.green, T.green2][i] || T.green,
  }));

  // Weekly outcomes from real stats/pipeline; '—'/0 when not available.
  const val = (v) => (v && v !== '—' ? v : '—');
  const weekly = [
    { label: 'Applications sent', value: val(stats[0]?.value) },
    { label: 'Interviews booked', value: pipeline[2]?.count ?? '0' },
    { label: 'Offers received', value: pipeline[3]?.count ?? '0' },
  ];
  const responseRate = val(stats[3]?.value);

  // Real counts for the hero + narrative (from pipeline, not fabricated).
  const appsCount = Number(pipeline[0]?.count) || 0;
  const interviewsCount = Number(pipeline[2]?.count) || 0;
  const offersCount = Number(pipeline[3]?.count) || 0;
  const heroSub = appsCount > 0
    ? `You've applied to ${appsCount} role${appsCount === 1 ? '' : 's'}${interviewsCount ? ` — ${interviewsCount} in the interview stage` : ''}. ${offersCount ? `${offersCount} offer${offersCount === 1 ? '' : 's'} on the table.` : 'Keep the momentum going.'}`
    : "Let's get your search moving — add a résumé, set your preferences, and review your matches.";

  const busy = loading;

  return (
    <>
      <Head>
        <title>Dashboard — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp * { box-sizing: border-box; }
        #jbapp a, #jbapp a:hover { color: inherit; text-decoration: none; }
        #jbapp ::-webkit-scrollbar { width: 10px; height: 10px; }
        #jbapp ::-webkit-scrollbar-thumb { background: var(--jb-a-line-strong); border-radius: 10px; }
        #jbapp button:focus-visible { outline: 2px solid var(--jb-a-accent-2); outline-offset: 2px; }
        @keyframes jpslide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { #jbapp * { animation: none !important; } }
        @media (max-width: 1100px) {
          #jbapp .jp-hero, #jbapp .jp-actions, #jbapp .jp-main { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          #jbapp .jp-week { flex-direction: column; }
          #jbapp .jp-week > div { border-right: none !important; border-bottom: 1px solid ${T.line}; }
          #jbapp .jp-topsearch { display: none !important; }
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', height: '100vh', overflow: 'hidden', background: T.stage, fontFamily: 'var(--jb-font-sans)', color: T.ink }}>
        <AppSidebar active="dashboard" />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* ░░ TOP BAR ░░ */}
          <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 22, height: 60, padding: '0 28px', background: 'var(--jb-a-header)', borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 0 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>Workspace</span>
              <span aria-hidden style={{ color: 'var(--jb-a-ink-muted)' }}>/</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Dashboard</span>
            </div>
            <div style={{ flex: 1 }} />
            <div className="jp-topsearch" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, width: 300, padding: '0 12px', background: 'var(--jb-a-control)', border: `1px solid ${T.line}`, borderRadius: 10, color: T.muted, fontSize: 14 }}>
              <span aria-hidden>⌕</span><span style={{ flex: 1 }}>Search jobs, companies, tasks</span>
              <span style={{ fontFamily: T.mono, fontSize: 11, border: `1px solid ${T.line2}`, borderRadius: 5, padding: '1px 5px' }}>⌘K</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                width: 36, height: 36, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--jb-a-control)', border: `1px solid ${T.line}`,
                borderRadius: 10, cursor: 'pointer', color: T.muted, fontFamily: 'inherit',
              }}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.4v2.2M12 19.4v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.4 12h2.2M19.4 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.4 13.6A8.4 8.4 0 1 1 10.4 3.6a6.6 6.6 0 0 0 10 10Z" />
                </svg>
              )}
            </button>
            <div style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--jb-a-control)', border: `1px solid ${T.line}`, borderRadius: 10, fontSize: 14, color: 'var(--jb-a-ink-2)' }}>
              ◔<span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: T.green, color: T.greenInk, fontFamily: T.mono, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--jb-a-header)' }}>3</span>
            </div>
            <Link href="/app/settings" title="Account" style={{ display: 'flex', alignItems: 'center', gap: 9, height: 36, padding: '3px 11px 3px 3px', background: 'var(--jb-a-control)', border: `1px solid ${T.line}`, borderRadius: 999 }}>
              <span aria-hidden style={{ width: 28, height: 28, borderRadius: '50%', background: T.green, color: T.greenInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{initials(userName) || '··'}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{firstName || 'You'}</span>
            </Link>
          </header>

          {/* ░░ STAGE ░░ */}
          <div id="jpstage" style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: T.stage }}>
            <div style={{ width: '100%', padding: '28px 32px 56px', display: 'flex', flexDirection: 'column', gap: 26 }}>

              <>
                  {error && (
                    <div style={{ padding: '12px 16px', background: 'var(--jb-a-danger-bg)', border: '1px solid var(--jb-a-danger-line)', borderRadius: 12, fontSize: 13.5, color: 'var(--jb-a-danger-ink)' }}>
                      We couldn’t reach your live data just now.{' '}
                      <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 4, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>Retry</button>
                    </div>
                  )}
                  {/* HERO: greeting + auto-apply status */}
                  <div className="jp-hero" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 22 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '26px 28px', background: T.card, border: `1px solid ${T.line}`, borderRadius: 16 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>{today}</span>
                      <h1 style={{ margin: 0, fontFamily: T.serif, fontSize: 42, lineHeight: 1.08, fontWeight: 400 }}>{greeting}</h1>
                      <span style={{ fontSize: 16, lineHeight: 1.6, color: T.ink2, maxWidth: '52ch' }}>{heroSub}</span>
                    </div>

                    {/* Auto-apply status — honest: it isn't running until the user sets it up */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '22px 24px', background: T.dark, border: `1px solid ${T.darkLine}`, borderRadius: 16, color: T.darkText }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 999, background: T.darkPanel, border: `1px solid ${T.darkLine}` }}>
                          <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: T.darkMuted }} />
                          <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.darkMuted }}>Auto-Apply off</span>
                        </span>
                      </div>
                      <div style={{ fontSize: 15.5, lineHeight: 1.6, color: T.darkText }}>
                        Let Jobocate apply to strong-fit roles for you, within rules you set — seniority, location, salary floor, and a daily cap. Every application pauses for your review before it’s sent.
                      </div>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button href={appRoute('App Auto-Apply.dc.html')} style={{ flex: 1 }}>Set up Auto-Apply</Button>
                        <Button variant="secondary" href="/app/settings" style={{ borderColor: 'var(--jb-a-ink-muted)', background: 'transparent', color: T.darkText }}>Preferences</Button>
                      </div>
                    </div>
                  </div>

                  {/* GET SET UP — real onboarding checklist driven by your actual data */}
                  {stepsDone < steps.length && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <PageHeader title="Get set up" subtitle={`${stepsDone} of ${steps.length} done — finish these to unlock better matches.`} />
                      <div className="jp-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                        {steps.map((s, i) => (
                          <Card key={s.key} accentLeft={s.done ? 'var(--jb-a-accent)' : 'var(--jb-a-line-strong)'} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 22px', borderColor: s.done ? 'var(--jb-a-tint-line)' : 'var(--jb-a-line-strong)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span aria-hidden style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: s.done ? T.green : 'var(--jb-a-control)', color: s.done ? T.greenInk : T.muted, border: `1px solid ${s.done ? T.green : T.line2}` }}>{s.done ? '✓' : i + 1}</span>
                              <span style={{ fontSize: 16, fontWeight: 700 }}>{s.label}</span>
                            </div>
                            <div style={{ fontSize: 14, color: T.ink2 }}>{s.hint}</div>
                            <div style={{ flex: 1 }} />
                            {s.done ? (
                              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.green2 }}>Done</span>
                            ) : (
                              <Button href={s.href} style={{ alignSelf: 'flex-start', height: 38, padding: '0 16px', fontSize: 14 }}>Start</Button>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WEEKLY OUTCOMES STRIP */}
                  <div className="jp-week" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '24px 26px', borderRight: `1px solid ${T.line}`, minWidth: 170 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>This week</span>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>Outcomes, not volume</span>
                    </div>
                    {weekly.map((w) => (
                      <div key={w.label} style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '24px 26px', borderRight: `1px solid ${T.line}` }}>
                        <span style={{ fontSize: 14, color: T.muted }}>{w.label}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 600 }}>{w.value}</span>
                      </div>
                    ))}
                    <div style={{ flex: 1.25, minWidth: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '24px 26px', background: T.tint }}>
                      <span style={{ fontSize: 14 }}>Response rate</span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 600, color: T.green2 }}>{responseRate}</span>
                      </span>
                    </div>
                  </div>

                  {/* MAIN: recommended + right column */}
                  <div className="jp-main" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 22, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <PageHeader title="Recommended for you" subtitle="Estimated fit is a signal, not a guarantee." />
                      {!hasMatches && !busy && (
                        <div style={{ padding: '32px 24px', background: T.card, border: `1px dashed ${T.line2}`, borderRadius: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontSize: 17, fontWeight: 700 }}>No matches yet</div>
                          <div style={{ fontSize: 14.5, color: T.ink2, maxWidth: '46ch', lineHeight: 1.55 }}>Add your résumé and set your job preferences — titles, locations, and salary — and we’ll rank roles by fit here.</div>
                          <Button href="/app/settings" style={{ marginTop: 4 }}>Set preferences</Button>
                        </div>
                      )}
                      {recJobs.map((j, i) => (
                        <div key={i} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', gap: 16, padding: '20px 22px' }}>
                            <span aria-hidden style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: 'var(--jb-a-tint)', color: T.green2, border: `1px solid var(--jb-a-tint-line)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{j.initial}</span>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 18, fontWeight: 700 }}>{j.role}</span>
                                <span style={{ fontSize: 15, color: T.ink2 }}>{j.company}</span>
                              </div>
                              <div style={{ fontSize: 14, color: T.ink2 }}>{j.meta}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {j.skills.map((s) => (
                                  <Badge key={s} tone="neutral">{s}</Badge>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 600, color: T.green2 }}>{j.fit}</div>
                                <div style={{ fontSize: 12, color: T.muted }}>estimated fit</div>
                              </div>
                              <div style={{ display: 'flex', gap: 7 }}>
                                <Button href={appRoute('App Matches.dc.html')} style={{ height: 38, padding: '0 16px' }}>Apply</Button>
                                <button type="button" title="Save" style={{ width: 38, height: 38, border: `1px solid ${T.line2}`, borderRadius: 9, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>♡</button>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderTop: `1px solid var(--jb-a-control)`, background: T.stage, fontSize: 13.5, fontWeight: 600, color: T.ink2 }}>
                            <span aria-hidden>›</span><span>Why this matches</span><span style={{ flex: 1 }} /><span style={{ fontSize: 13, fontWeight: 400, color: T.muted }}>Skills + seniority + location all align</span>
                          </div>
                        </div>
                      ))}
                      <Button variant="secondary" href={appRoute('App Matches.dc.html')} style={{ alignSelf: 'flex-start', height: 42, padding: '0 18px', fontSize: 14.5 }}>See all matches</Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Funnel */}
                      <div style={{ padding: '20px 22px', background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Application funnel</h3><span style={{ flex: 1 }} /><span style={{ fontSize: 13, color: T.muted }}>Last 30 days</span></div>
                        {funnelRows.map((f) => (
                          <div key={f.label}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 14 }}><span style={{ fontWeight: 600 }}>{f.label}</span><span style={{ flex: 1 }} /><span style={{ fontFamily: T.mono, fontWeight: 600 }}>{f.count}</span></div>
                            <div style={{ height: 12, marginTop: 5, borderRadius: 4, background: 'var(--jb-a-control)', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 4, width: f.width, minWidth: 8, background: f.color }} /></div>
                          </div>
                        ))}
                        <Link href="/app/tracker" style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.line2}`, borderRadius: 9, fontSize: 13.5, fontWeight: 600 }}>View pipeline</Link>
                      </div>

                      {/* Search health — real snapshot from your pipeline */}
                      <div style={{ padding: '20px 22px', background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Search health</h3>
                        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: T.ink2 }}>
                          {appsCount > 0
                            ? <>You’ve applied to <strong>{appsCount}</strong> role{appsCount === 1 ? '' : 's'}, with a <strong>{responseRate}</strong> response rate and <strong>{interviewsCount}</strong> in the interview stage. Keep applying to strong-fit roles to improve your odds.</>
                            : <>No applications yet. Set your preferences and start applying — your response rate and pipeline health will show up here.</>}
                        </p>
                        <span style={{ fontSize: 12.5, color: T.muted }}>Based on your activity, not guarantees.</span>
                      </div>

                      {/* Recent activity (dark) */}
                      <div style={{ padding: '20px 22px', background: T.dark, border: `1px solid ${T.darkLine}`, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 16, color: T.darkText }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--jb-a-header)' }}>Recent activity</h3></div>
                        {hasActivity ? (
                          overnight.map((a, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 14 }}><span aria-hidden style={{ color: a.accent }}>{a.glyph}</span><span style={{ flex: 1 }}>{a.line}</span></div>
                          ))
                        ) : (
                          <div style={{ fontSize: 14, color: T.darkMuted, lineHeight: 1.55 }}>No activity yet. Applications you send will show up here.</div>
                        )}
                        <Link href="/app/tracker" style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid var(--jb-a-ink-muted)`, borderRadius: 10, color: T.darkText, fontSize: 14, fontWeight: 600 }}>Open full activity log</Link>
                      </div>
                    </div>
                  </div>

                  {busy && (
                    <div style={{ fontSize: 13, color: T.muted, fontFamily: T.mono }}>Refreshing your data…</div>
                  )}
              </>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
