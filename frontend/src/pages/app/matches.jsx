'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import Button from '@/components/app/ui/Button';
import Badge from '@/components/app/ui/Badge';
import Chip from '@/components/app/ui/Chip';
import Toggle from '@/components/app/ui/Toggle';
import MonoLabel from '@/components/app/ui/MonoLabel';
import PageHeader from '@/components/app/ui/PageHeader';
import FitScore from '@/components/app/ui/FitScore';
import {
  getMyMatches,
  getJobRecommendations,
  markJobAsInterested,
  getEligibleJobs,
} from '@/services/matchesApi';
import { useRouter } from 'next/router';
import { getScrapedJobById } from '@/services/api';
import { getMatchPreviewForProfile } from '@/services/jobProfileApi';

/* ------------------------------------------------------- filter model --- */
const ROLE_FAMILIES = ['Engineering', 'Data', 'Product', 'Design', 'Marketing', 'Sales', 'Operations', 'Finance', 'Legal'];
const SENIORITY_OPTS = [
  { key: 'entry', label: 'Entry / Junior' },
  { key: 'mid', label: 'Mid-level' },
  { key: 'senior', label: 'Senior' },
  { key: 'lead', label: 'Lead / Staff / Principal' },
  { key: 'manager', label: 'Manager & above' },
];
const MATCH_OPTS = [
  { key: 90, label: '90%+ · Excellent' },
  { key: 80, label: '80%+ · Strong' },
  { key: 70, label: '70%+ · Good' },
  { key: 60, label: '60%+ · Possible' },
];
// Salary-floor slider bounds, in thousands. The range covers the bands this
// product actually sees; SALARY_MIN doubles as the "off" position, so the
// control reads "Any" rather than "$80k and above" until it is moved.
const SALARY_MIN = 80;
const SALARY_MAX = 260;

const LEVELS = ['intern', 'entry', 'junior', 'mid', 'senior', 'lead', 'staff', 'principal', 'manager', 'director', 'vp', 'executive'];

const seniorityIndex = (title = '') => {
  const s = title.toLowerCase();
  const hints = [
    ['executive', /\b(chief|ceo|cto|cfo|coo|founder|executive)\b/],
    ['vp', /\b(vice president|vp|svp|evp)\b/],
    ['director', /\b(director|head of)\b/],
    ['manager', /\bmanager\b/],
    ['principal', /\bprincipal\b/],
    ['staff', /\bstaff\b/],
    ['lead', /\blead\b/],
    ['senior', /\b(senior|sr\.?)\b/],
    ['junior', /\b(junior|jr\.?)\b/],
    ['entry', /\b(entry|new grad|graduate|associate|intern)\b/],
  ];
  for (const [lvl, re] of hints) if (re.test(s)) return LEVELS.indexOf(lvl);
  return LEVELS.indexOf('mid');
};
const roleFamilyOf = (title = '') => {
  const s = title.toLowerCase();
  if (/\b(engineer|developer|swe|programmer|architect|devops|sre)\b/.test(s)) return 'Engineering';
  if (/\b(data|ml|machine learning|analytics|scientist)\b/.test(s)) return 'Data';
  if (/\bproduct\b/.test(s)) return 'Product';
  if (/\b(design|ux|ui)\b/.test(s)) return 'Design';
  if (/\b(marketing|growth|content|brand)\b/.test(s)) return 'Marketing';
  if (/\b(sales|account executive|business development)\b/.test(s)) return 'Sales';
  if (/\b(finance|accounting|controller|financial)\b/.test(s)) return 'Finance';
  if (/\b(legal|counsel|compliance)\b/.test(s)) return 'Legal';
  if (/\b(operations|ops|program manager|project manager)\b/.test(s)) return 'Operations';
  return 'Other';
};
const seniorityMatches = (title, key) => {
  const i = seniorityIndex(title);
  const L = (k) => LEVELS.indexOf(k);
  if (key === 'entry') return i <= L('junior');
  if (key === 'mid') return i === L('mid');
  if (key === 'senior') return i === L('senior');
  if (key === 'lead') return i >= L('lead') && i <= L('principal');
  if (key === 'manager') return i >= L('manager');
  return true;
};
const within7d = (d) => !!d && (Date.now() - new Date(d).getTime()) / 86400000 <= 7;

/* ----------------------------------------------------------- normalize --- */
const TINTS = [
  { bg: 'var(--jb-a-tint)', fg: 'var(--jb-a-accent)' },
  { bg: 'var(--jb-a-control)', fg: 'var(--jb-a-ink)' },
];

const initialsOf = (name) => {
  if (!name) return '··';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]);
};

const formatSalary = (job) => {
  if (job.salary) return job.salary;
  const min = job.salaryMin ?? job.minSalary;
  const max = job.salaryMax ?? job.maxSalary;
  const k = (n) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max).replace('$', '')}`;
  if (min) return `${k(min)}+`;
  if (max) return `Up to ${k(max)}`;
  return '';
};

const isRecent = (job) => {
  const d = job.postedAt || job.createdAt || job.scrapedAt;
  if (!d) return false;
  const days = (Date.now() - new Date(d).getTime()) / 86400000;
  return days <= 1;
};

// Greenhouse/Lever descriptions arrive as HTML — often entity-encoded
// (&lt;div&gt;…). Decode entities first, THEN strip the real tags.
const stripHtml = (s) =>
  String(s || '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// A backend match record can shape vary; pull both the match wrapper and the
// embedded job. Map onto the design's card model.
const normalizeMatch = (m, i) => {
  const job = m.job || m.scrapedJob || m.jobDetails || m;
  const score = m.score ?? m.matchScore ?? m.overallScore ?? job.matchScore;
  const tint = TINTS[score != null && score >= 90 ? 0 : 1] || TINTS[1];
  const rawTags = job.tags || job.skills || m.matchedSkills || [];
  const tags = (Array.isArray(rawTags) ? rawTags : []).slice(0, 3).map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
  return {
    id: m.id || m._id || job.id || job._id || `match-${i}`,
    jobId: job.id || job._id || m.jobId,
    logo: initialsOf(job.company || job.companyName),
    company: job.company || job.companyName || 'Company',
    role: job.role || job.title || job.jobTitle || 'Role',
    location: job.location || job.workLocation || 'Location',
    type: job.type || job.jobType || job.employmentType || 'Full-time',
    salary: formatSalary(job),
    // Numeric floor in thousands, for the salary slider. Null means the
    // posting published no band — see the note under the slider.
    salaryMinK: (() => {
      const v = job.salaryMin ?? job.minSalary;
      return v ? Math.round(Number(v) / 1000) : null;
    })(),
    match: score != null ? `${Math.round(score)}%` : null,
    matchNum: score != null ? Math.round(score) : null,
    // The scorer weights skills heavily, so a posting that listed none produces
    // a score driven almost entirely by defaults. Flagged so the UI can present
    // it as an estimate rather than a measurement.
    lowConfidence:
      score != null &&
      !(m.matchedSkills || []).length &&
      !(Array.isArray(job.skills) ? job.skills : []).length,
    workplaceType: job.workplaceType || m.workplaceType || null,
    scrapedAt: job.scrapedAt || m.scrapedAt || null,
    matchLabel: m.matchLabel || null,
    matchedSkills: m.matchedSkills || [],
    missingSkills: m.missingSkills || [],
    matchFactors: m.matchFactors || [],
    source: job.source || null,
    logoUrl: job.companyLogo || m.companyLogo || '',
    eligibility: m.eligibility || job.eligibility || null,
    externalUrl: job.externalUrl || job.canonicalUrl || job.url || null,
    isNew: m.isNew ?? isRecent(job),
    bg: tint.bg,
    fg: tint.fg,
    tags,
    reason: stripHtml(m.matchExplanation || m.reason || m.matchReason || m.explanation || job.description || '').slice(0, 220),
    isInterested: m.isInterested ?? false,
  };
};

// The three columns the design reveals when a row is expanded. Every line is
// built from a field the scorer actually returned — when a field is missing we
// say so plainly instead of writing filler, because a fabricated reason is
// worse than an absent one on a screen whose whole promise is "here is why".
const reasonsFor = (m) => {
  const skills = (m.matchedSkills || []).filter(Boolean).slice(0, 6);
  const gaps = (m.missingSkills || []).filter(Boolean).slice(0, 6);
  const logistics = [m.location, m.type, m.salary].filter(Boolean).join(' · ');
  return [
    {
      k: 'Skills',
      v: skills.length
        ? `${skills.join(', ')} — all present in your profile.`
        : m.reason || 'The posting did not list enough skills to compare against yours.',
    },
    {
      k: 'Gaps',
      v: gaps.length
        ? `${gaps.join(', ')} — asked for, and not on your profile yet.`
        : 'Nothing they asked for is obviously missing from your profile.',
    },
    { k: 'Logistics', v: logistics || 'The posting did not say where or on what terms.' },
  ];
};


/* ----------------------------------------------------------- component --- */
export default function AppMatches() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [newToday, setNewToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interested, setInterested] = useState({}); // jobId -> bool
  const [browsing, setBrowsing] = useState(false); // showing the eligible pool vs personalized matches
  const [query, setQuery] = useState('');
  const [candidateCountry, setCandidateCountry] = useState(null);
  const [targetCountries, setTargetCountries] = useState([]);
  // Real pool counts, fetched only when the eligible set comes back empty so the
  // empty state can explain itself instead of showing a bare shrug.
  const [impact, setImpact] = useState(null);
  const [detail, setDetail] = useState(null); // the job whose full JD is open
  const [filters, setFilters] = useState({ remote: false, role: null, minMatch: null, seniority: null, thisWeek: false, salaryFloor: SALARY_MIN });
  const [sort, setSort] = useState('fit');
  const [openRow, setOpenRow] = useState(null); // id of the expanded row

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: p[k] === v ? (typeof v === 'boolean' ? false : null) : v }));
  const resetFilters = () => setFilters({ remote: false, role: null, minMatch: null, seniority: null, thisWeek: false, salaryFloor: SALARY_MIN });
  const anyFilter =
    filters.remote || filters.role || filters.minMatch || filters.seniority || filters.thisWeek || filters.salaryFloor > SALARY_MIN;

  const visibleJobs = jobs.filter((j) => {
    if (filters.remote && j.workplaceType !== 'REMOTE') return false;
    if (filters.thisWeek && !within7d(j.scrapedAt)) return false;
    if (filters.minMatch && (j.matchNum == null || j.matchNum < filters.minMatch)) return false;
    if (filters.role && roleFamilyOf(j.role) !== filters.role) return false;
    if (filters.seniority && !seniorityMatches(j.role, filters.seniority)) return false;
    // A posting with no published band is unknown, not low — keep it.
    if (filters.salaryFloor > SALARY_MIN && j.salaryMinK != null && j.salaryMinK < filters.salaryFloor) return false;
    return true;
  });

  // Sorting happens after filtering so the rank the user sees is the rank of
  // what is actually on screen. Unscored rows sink rather than lead.
  const sortedJobs = [...visibleJobs].sort((a, b) =>
    sort === 'fit'
      ? (b.matchNum ?? -1) - (a.matchNum ?? -1)
      : new Date(b.scrapedAt || 0) - new Date(a.scrapedAt || 0),
  );

  const load = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      let raw = [];
      let count = null;

      // 1) Pre-computed matches — ONLY when no profile is driving this view.
      //
      // `/matching/matches` returns stored JobMatch rows and has no geography
      // awareness: it does not know about target countries and ignores
      // profileId. Because it used to run first and the eligible path only ran
      // when it came back empty, a candidate with ANY stored matches silently
      // bypassed the entire geo gate — observed live as a "United States only"
      // role sitting in a profile that targets Canada.
      //
      // Anything geo-sensitive therefore goes through Stage-1 eligibility below.
      if (!opts.forceBrowse && !opts.profileId) {
        try {
          const res = await getMyMatches({ minScore: 60 });
          raw = res.matches || res.data || [];
          count = res.total ?? null;
        } catch (e1) {
          raw = [];
        }
      }

      // 2) Stage-1 ELIGIBLE jobs — geography/legally filtered pool (default).
      //
      // There is deliberately NO unfiltered fallback here. This used to drop to
      // `searchScrapedJobs` whenever the eligible call returned thin or threw,
      // which silently showed jobs from every country — the exact opposite of
      // what a candidate targeting one market asked for. An empty eligible set
      // is a real answer, and `previewImpact()` explains it below.
      let browse = false;
      if (!Array.isArray(raw) || raw.length === 0) {
        browse = true;
        const elig = await getEligibleJobs({
          keywords: opts.query || '',
          limit: 60,
          ...(opts.profileId ? { profileId: opts.profileId } : {}),
        });
        raw = elig.jobs || [];
        count = elig.total ?? raw.length;
        setCandidateCountry(elig.candidateCountry || null);
        setTargetCountries(Array.isArray(elig.targetCountries) ? elig.targetCountries : []);
      }

      setBrowsing(browse);
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list.map(normalizeMatch);

      // Nothing eligible? Ask the backend WHY, so we can say "412 jobs in the
      // pool, 0 in your target countries" rather than just "no results".
      if (mapped.length === 0) {
        try {
          setImpact(await getMatchPreviewForProfile(opts.profileId));
        } catch {
          setImpact(null);
        }
      } else {
        setImpact(null);
      }

      setJobs(mapped);
      setTotal(count ?? mapped.length);
      setNewToday(mapped.filter((j) => j.isNew).length);
      const seed = {};
      mapped.forEach((j) => { if (j.jobId) seed[j.jobId] = !!j.isInterested; });
      setInterested(seed);
    } catch (err) {
      setError(err || new Error('Could not load roles'));
      setJobs([]);
      setTotal(0);
      setNewToday(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // `?profileId=` lets a job profile drive this view, so "View matches" from
  // /app/job-profiles shows that profile's targeted search rather than the
  // active one.
  useEffect(() => {
    if (!router.isReady) return;
    const profileId = typeof router.query.profileId === 'string' ? router.query.profileId : undefined;
    load({ profileId });
  }, [load, router.isReady, router.query.profileId]);

  const runSearch = () =>
    load({
      forceBrowse: true,
      query,
      profileId: typeof router.query.profileId === 'string' ? router.query.profileId : undefined,
    });

  const loadMore = async () => {
    try {
      const elig = await getEligibleJobs({ keywords: query || '', limit: jobs.length + 40 });
      setJobs((elig.jobs || []).map(normalizeMatch));
    } catch (e) {
      /* ignore — keep what we have */
    }
  };

  const toggleInterest = async (job) => {
    if (!job.jobId) return; // sample rows have no real id
    const wasOn = !!interested[job.jobId];
    setInterested((p) => ({ ...p, [job.jobId]: !wasOn }));
    try {
      await markJobAsInterested(job.jobId, !wasOn);
    } catch (e) {
      // revert on failure
      setInterested((p) => ({ ...p, [job.jobId]: wasOn }));
    }
  };

  const remaining = Math.max(total - jobs.length, 0);

  return (
    <>
      <Head>
        <title>Matches · Jobocate</title>
      </Head>

      <div style={{ display: 'flex', height: '100vh', background: 'var(--jb-a-stage)', color: 'var(--jb-a-ink)', fontFamily: 'var(--jb-font-sans)', overflow: 'hidden' }}>
        <AppSidebar active="matches" />

        {/* ── FILTER RAIL ───────────────────────────────────────────────── */}
        <aside
          aria-label="Filters"
          style={{
            width: 268,
            flexShrink: 0,
            borderRight: '1px solid var(--jb-a-line)',
            background: 'var(--jb-a-rail)',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 30,
            overflow: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Filters</span>
            <span style={{ flex: 1 }} />
            {anyFilter && (
              <Button variant="quiet" onClick={resetFilters} style={{ fontSize: 13.5 }}>
                Reset
              </Button>
            )}
          </div>

          {/* Match quality — single-choice, so it is a real radiogroup rather
              than a row of toggle buttons. */}
          <div role="radiogroup" aria-label="Match quality" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <MonoLabel>Match quality</MonoLabel>
            {MATCH_OPTS.map((o) => {
              const on = filters.minMatch === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFilter('minMatch', o.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 0,
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 14.5,
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: on ? 'var(--jb-a-ink)' : 'var(--jb-a-ink-2)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: `1.5px solid ${on ? 'var(--jb-a-accent)' : 'var(--jb-a-line-strong)'}`,
                      background: 'var(--jb-a-card)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--jb-a-accent)' : 'transparent' }} />
                  </span>
                  <span>{o.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <MonoLabel>Seniority</MonoLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SENIORITY_OPTS.map((s) => (
                <Chip key={s.key} selected={filters.seniority === s.key} onClick={() => setFilter('seniority', s.key)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <MonoLabel>Role family</MonoLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ROLE_FAMILIES.map((f) => (
                <Chip key={f} selected={filters.role === f} onClick={() => setFilter('role', f)}>
                  {f}
                </Chip>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <MonoLabel>Base salary floor</MonoLabel>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600 }}>
                {filters.salaryFloor > SALARY_MIN ? `$${filters.salaryFloor}k` : 'Any'}
              </span>
              {filters.salaryFloor > SALARY_MIN && <span style={{ fontSize: 13, color: 'var(--jb-a-ink-3)' }}>and above</span>}
            </span>
            <input
              type="range"
              min={SALARY_MIN}
              max={SALARY_MAX}
              step={5}
              value={filters.salaryFloor}
              aria-label="Minimum base salary in thousands"
              onChange={(e) => setFilters((p) => ({ ...p, salaryFloor: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--jb-a-accent)' }}
            />
            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--jb-a-ink-3)' }}>
              Roles that don’t publish a band stay in the list — an unknown salary isn’t a low one.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle checked={filters.remote} label="Remote only" onChange={() => setFilter('remote', !filters.remote)} />
              <span style={{ fontSize: 14.5 }}>Remote only</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle checked={filters.thisWeek} label="Posted this week" onChange={() => setFilter('thisWeek', !filters.thisWeek)} />
              <span style={{ fontSize: 14.5 }}>Posted this week</span>
            </div>
          </div>
        </aside>

        {/* ── LIST ──────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PageHeader
            title="Matches"
            level="h1"
            action={
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runSearch();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search roles…"
                    aria-label="Search roles"
                    style={{
                      height: 34,
                      width: 190,
                      padding: '0 12px',
                      borderRadius: 999,
                      border: '1px solid var(--jb-a-line)',
                      background: 'var(--jb-a-card)',
                      fontFamily: 'inherit',
                      fontSize: 13.5,
                      color: 'var(--jb-a-ink)',
                    }}
                  />
                </form>
                <span style={{ fontSize: 14, color: 'var(--jb-a-ink-3)' }}>Sort</span>
                <button
                  type="button"
                  onClick={() => setSort((s) => (s === 'fit' ? 'newest' : 'fit'))}
                  style={{ background: 'none', border: 0, padding: 0, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--jb-a-ink)', cursor: 'pointer' }}
                >
                  {sort === 'fit' ? 'Best fit' : 'Newest'}
                </button>
              </>
            }
          />

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'clamp(28px, 4vw, 44px) clamp(20px, 4vw, 44px) 64px' }}>
            {loading && <LoadingState label="Finding roles you're eligible for…" />}
            {!loading && error && <ErrorState error={error} onRetry={() => load({})} />}

            {!loading && !error && (
              <>
                <h2
                  style={{
                    margin: 0,
                    fontFamily: 'var(--jb-font-display)',
                    fontWeight: 400,
                    fontSize: 'var(--jb-a-display-md)',
                    lineHeight: 1.04,
                    letterSpacing: '-0.02em',
                    maxWidth: '22ch',
                  }}
                >
                  {sortedJobs.length
                    ? `${sortedJobs.length} role${sortedJobs.length === 1 ? '' : 's'} you're eligible for.`
                    : 'Nothing clears your filters yet.'}
                </h2>
                <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: 1.55, color: 'var(--jb-a-ink-2)', maxWidth: '58ch' }}>
                  {browsing
                    ? 'Filtered to the countries you can legally work in. Open any row to see the reasoning — fit is a signal, never a promise.'
                    : 'Ranked on skills, seniority and availability. Open any row to see the reasoning — fit is a signal, never a promise.'}
                </p>

                {sortedJobs.length === 0 && (
                  <div style={{ marginTop: 32 }}>
                    <EmptyState
                      title={anyFilter ? 'No roles match these filters' : 'No eligible roles yet'}
                      hint={
                        anyFilter
                          ? 'Loosen a filter — the match-quality floor is usually the one doing the work.'
                          : impact
                            ? `${impact.totalJobs ?? impact.total ?? 0} roles in the pool, none of them in ${targetCountries.length ? targetCountries.join(', ') : 'your target countries'} yet.`
                            : 'Add a résumé and your preferences, and roles start arriving here ranked by fit.'
                      }
                      action={
                        anyFilter ? (
                          <Button onClick={resetFilters}>Reset filters</Button>
                        ) : (
                          <Button href="/app/preferences">Set preferences</Button>
                        )
                      }
                    />
                  </div>
                )}

                {sortedJobs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: 38, borderTop: '1px solid var(--jb-a-ink)' }}>
                    {sortedJobs.map((m, i) => {
                      const open = openRow === m.id;
                      const saved = m.jobId ? !!interested[m.jobId] : false;
                      const primary = i === 0;
                      return (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            borderBottom: '1px solid var(--jb-a-line-soft)',
                            background: open ? 'var(--jb-a-tint-wash)' : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '20px 18px 20px 6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setOpenRow(open ? null : m.id)}
                              aria-expanded={open}
                              style={{
                                flex: '1 1 340px',
                                minWidth: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 22,
                                background: 'none',
                                border: 0,
                                padding: 0,
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                color: 'inherit',
                                cursor: 'pointer',
                              }}
                            >
                              <FitScore fit={m.matchNum} caption="fit" style={{ width: 60, flexShrink: 0 }} />
                              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 19, fontWeight: 600 }}>{m.role}</span>
                                  <span style={{ fontSize: 16, color: 'var(--jb-a-ink-soft)' }}>{m.company}</span>
                                  {m.isNew && <Badge tone="flag">New today</Badge>}
                                  {m.lowConfidence && <Badge tone="neutral">Estimated</Badge>}
                                </span>
                                <span style={{ fontSize: 14.5, color: 'var(--jb-a-ink-3)' }}>
                                  {[m.location, m.type, m.salary].filter(Boolean).join(' · ')}
                                </span>
                              </span>
                            </button>

                            <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                              <Button
                                variant="icon"
                                aria-label={saved ? `Remove ${m.role} from saved` : `Save ${m.role}`}
                                aria-pressed={saved}
                                onClick={() => toggleInterest(m)}
                                style={{ color: saved ? 'var(--jb-a-accent)' : 'var(--jb-a-ink-soft)' }}
                              >
                                {saved ? '♥' : '♡'}
                              </Button>
                              <Button
                                size="sm"
                                variant={primary ? 'primary' : 'secondary'}
                                onClick={() => setDetail(m)}
                              >
                                {primary ? 'Review' : 'Open'}
                              </Button>
                            </span>
                          </div>

                          {open && (
                            <div style={{ display: 'flex', gap: 36, padding: '0 18px 24px 88px', flexWrap: 'wrap' }}>
                              {reasonsFor(m).map((r) => (
                                <span key={r.k} style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                  <MonoLabel style={{ letterSpacing: '0.14em' }}>{r.k}</MonoLabel>
                                  <span style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--jb-a-ink-2)' }}>{r.v}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {remaining > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                    <Button variant="secondary" onClick={loadMore}>
                      Load {Math.min(remaining, 40)} more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {detail && (
        <JobDetailModal
          job={detail}
          saved={detail.jobId ? !!interested[detail.jobId] : false}
          onToggleSave={() => toggleInterest(detail)}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

/* --------------------------------------------------- job detail modal --- */
const decodeAndSanitize = (html) => {
  let s = String(html || '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
  // Strip dangerous blocks / handlers (content is from trusted ATS sources).
  s = s.replace(/<(script|style|iframe|object|embed|link|meta)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<(script|style|iframe|object|embed|link|meta)[^>]*>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"');
  return s;
};

// Arbitrary-variant classes that style the sanitized job-description HTML — the
// Tailwind replacement for the old `.jb-jd` styled-jsx block. The injected
// markup can't carry utility classes, so we target its elements here.
const JD_PROSE =
  'text-sm leading-[1.7] text-[var(--jb-a-ink-2)] ' +
  '[&_h1]:text-[15px] [&_h1]:font-bold [&_h1]:mt-[18px] [&_h1]:mb-2 [&_h1]:text-[var(--jb-a-ink)] ' +
  '[&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:mt-[18px] [&_h2]:mb-2 [&_h2]:text-[var(--jb-a-ink)] ' +
  '[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:mt-[18px] [&_h3]:mb-2 [&_h3]:text-[var(--jb-a-ink)] ' +
  '[&_p]:mb-3 [&_ul]:mb-3.5 [&_ul]:pl-5 [&_ol]:mb-3.5 [&_ol]:pl-5 [&_li]:mb-1.5 ' +
  '[&_a]:text-[var(--jb-a-accent)] [&_b]:text-[var(--jb-a-ink)] [&_strong]:text-[var(--jb-a-ink)] [&_img]:max-w-full';

function JobDetailModal({ job, saved, onToggleSave, onClose }) {
  const [full, setFull] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getScrapedJobById(job.jobId);
        if (alive) setFull(res?.job || res);
      } catch (e) {
        if (alive) setErr(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { alive = false; document.removeEventListener('keydown', onKey); };
  }, [job.jobId, onClose]);

  const description = full?.description || '';
  const applyUrl = job.externalUrl || full?.externalUrl;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] bg-[var(--jb-a-scrim)] backdrop-blur-[2px] flex justify-end"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[720px] max-w-[94vw] h-screen bg-[var(--jb-a-stage)] border-l border-[var(--jb-a-line)] flex flex-col"
      >
        {/* header */}
        <div className="flex items-start gap-3.5 px-6 py-5 border-b border-[var(--jb-a-line)]">
          <CompanyAvatar logoUrl={job.logoUrl} initials={job.logo} bg={job.bg} fg={job.fg} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-1 leading-[1.2]">{job.role}</h2>
            <div className="text-[13.5px] text-[var(--jb-a-ink-2)]">
              <span className="font-semibold text-[var(--jb-a-ink)]">{job.company}</span>
              {job.location && <> · {job.location}</>}
              {job.type && <> · {job.type}</>}
            </div>
            {job.eligibility && (
              <div className="flex items-center gap-[9px] mt-2 flex-wrap">
                <EligBadge status={job.eligibility.status} label={job.eligibility.label} />
                <span className="text-[12.5px] text-[var(--jb-a-ink-3)]">{job.eligibility.geographyExplanation}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg border border-[var(--jb-a-line)] bg-[var(--jb-a-card)] cursor-pointer text-[15px] text-[var(--jb-a-ink-3)] flex-shrink-0">✕</button>
        </div>

        {/* eligibility reasons */}
        {job.eligibility?.reasons?.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 pt-3.5">
            {job.eligibility.reasons.map((r, i) => (
              <span
                key={i}
                title={r.code}
                className={`text-[11.5px] px-2.5 py-1 rounded-full ${r.severity === 'hard' ? 'bg-[var(--jb-a-danger-bg)] text-[var(--jb-a-danger-ink)]' : r.severity === 'soft' ? 'bg-[var(--jb-a-offer-bg)] text-[var(--jb-a-offer-ink)]' : 'bg-[var(--jb-a-control)] text-[var(--jb-a-ink-3)]'}`}
              >
                {r.message}
              </span>
            ))}
          </div>
        )}

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-[90px]">
          {job.tags?.length > 0 && (
            <div className="flex gap-[7px] flex-wrap mb-5">
              {job.tags.map((t, i) => (
                <span key={i} className="text-xs font-medium text-[var(--jb-a-ink-2)] bg-[var(--jb-a-control)] rounded-[7px] px-2.5 py-[5px]">{t}</span>
              ))}
            </div>
          )}
          {job.match && (
            <div className="mb-[22px] p-4 rounded-[14px] border border-[var(--jb-a-line)] bg-[var(--jb-a-card)]">
              <div className={`flex items-baseline gap-2.5 ${job.matchedSkills?.length || job.missingSkills?.length ? 'mb-3' : ''}`}>
                <span className="font-mono text-[22px] font-semibold text-[var(--jb-a-accent)] leading-none">{job.match}</span>
                <span className="text-[15px] font-bold">{job.matchLabel || 'Match'}</span>
              </div>
              {job.matchedSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center mb-2">
                  <span className="text-[11.5px] text-[var(--jb-a-ink-3)] mr-1">Your skills:</span>
                  {job.matchedSkills.map((s, i) => (
                    <span key={i} className="text-xs font-semibold text-[var(--jb-a-accent)] bg-[var(--jb-a-tint)] rounded-md px-[9px] py-[3px]">✓ {s}</span>
                  ))}
                </div>
              )}
              {job.missingSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center mb-3">
                  <span className="text-[11.5px] text-[var(--jb-a-ink-3)] mr-1">Not in profile:</span>
                  {job.missingSkills.map((s, i) => (
                    <span key={i} className="text-xs text-[var(--jb-a-ink-3)] bg-[var(--jb-a-control)] rounded-md px-[9px] py-[3px]">{s}</span>
                  ))}
                </div>
              )}
              {job.matchFactors?.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {job.matchFactors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="w-32 flex-shrink-0 text-[11.5px] text-[var(--jb-a-ink-3)]">{f.label}</span>
                      <div className="flex-1 h-[5px] rounded-full bg-[var(--jb-a-control)] overflow-hidden">
                        {/* width is data-driven → inline */}
                        <div className="h-full bg-[var(--jb-a-accent)]" style={{ width: `${Math.round((f.value || 0) * 100)}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-[var(--jb-a-ink-faint)]">{Math.round((f.weight || 0) * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--jb-a-ink-faint)] mb-3">
            Job description
          </div>
          {loading ? (
            <LoadingState label="Loading job description…" />
          ) : err ? (
            <ErrorState error={err} />
          ) : description ? (
            <div className={JD_PROSE} dangerouslySetInnerHTML={{ __html: decodeAndSanitize(description) }} />
          ) : (
            <EmptyState title="No description provided" hint="Open the original posting to read the full details." />
          )}
        </div>

        {/* footer actions */}
        <div className="flex gap-2.5 px-6 py-3.5 border-t border-[var(--jb-a-line)] bg-[var(--jb-a-stage)]">
          <button
            onClick={onToggleSave}
            title={saved ? 'Saved' : 'Save'}
            aria-label={saved ? 'Saved' : 'Save'}
            className={`w-11 h-11 rounded-xl cursor-pointer text-[17px] ${saved ? 'border border-[var(--jb-a-accent)] bg-[var(--jb-a-tint)] text-[var(--jb-a-accent)]' : 'border border-[var(--jb-a-line-strong)] bg-[var(--jb-a-card)] text-[var(--jb-a-ink-3)]'}`}
          >
            {saved ? '♥' : '♡'}
          </button>
          <div className="flex-1" />
          {applyUrl && (
            <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[var(--jb-a-ink)] text-[var(--jb-a-card)] text-[14.5px] font-bold px-[26px] py-[13px] rounded-xl no-underline">
              Apply on {job.source || 'company site'} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- components --- */
function CompanyAvatar({ logoUrl, initials, bg, fg }) {
  const [ok, setOk] = useState(!!logoUrl);
  // bg/fg are per-company data → inline; the frame is static.
  return (
    <span
      className="w-[52px] h-[52px] flex-shrink-0 rounded-[13px] overflow-hidden flex items-center justify-center font-bold text-[17px] border border-[var(--jb-a-line)]"
      style={{ background: ok ? 'var(--jb-a-card)' : bg, color: fg }}
    >
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" onError={() => setOk(false)} className="w-full h-full object-contain p-[7px]" />
      ) : (
        initials
      )}
    </span>
  );
}

function EligBadge({ status, label }) {
  const ok = status === 'ELIGIBLE';
  return (
    <span className={`text-[11px] font-bold px-[9px] py-[3px] rounded-full ${ok ? 'bg-[var(--jb-a-tint)] text-[var(--jb-a-accent)]' : 'bg-[var(--jb-a-offer-bg)] text-[var(--jb-a-offer-ink)]'}`}>
      {ok ? '✓ ' : '◑ '}
      {label}
    </span>
  );
}

/* ----------------------------------------------------------- skeleton --- */
