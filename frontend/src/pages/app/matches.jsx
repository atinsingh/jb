'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
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
  { bg: '#EAF6EE', fg: '#157A49' },
  { bg: '#F4EFE4', fg: '#1B1A16' },
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

// Shared card shell.
const CARD = 'bg-jb-paper border border-jb-line-2 rounded-[18px] p-[22px]';

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
  const [filters, setFilters] = useState({ remote: false, role: null, minMatch: null, seniority: null, thisWeek: false });

  const setFilter = (k, v) => setFilters((p) => ({ ...p, [k]: p[k] === v ? (typeof v === 'boolean' ? false : null) : v }));
  const resetFilters = () => setFilters({ remote: false, role: null, minMatch: null, seniority: null, thisWeek: false });
  const anyFilter = filters.remote || filters.role || filters.minMatch || filters.seniority || filters.thisWeek;

  const visibleJobs = jobs.filter((j) => {
    if (filters.remote && j.workplaceType !== 'REMOTE') return false;
    if (filters.thisWeek && !within7d(j.scrapedAt)) return false;
    if (filters.minMatch && (j.matchNum == null || j.matchNum < filters.minMatch)) return false;
    if (filters.role && roleFamilyOf(j.role) !== filters.role) return false;
    if (filters.seniority && !seniorityMatches(j.role, filters.seniority)) return false;
    return true;
  });

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
        <title>Job Matches — Jobocate</title>
      </Head>

      <div className="flex min-h-screen bg-jb-cream font-sans text-jb-ink [&_::-webkit-scrollbar]:w-2 [&_::-webkit-scrollbar]:h-2 [&_::-webkit-scrollbar-thumb]:bg-jb-line-3 [&_::-webkit-scrollbar-thumb]:rounded-lg">
        <AppSidebar active="matches" />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* HEADER */}
          <header className="sticky top-0 z-20 flex items-center flex-wrap gap-3 px-5 py-[15px] bg-[rgba(247,243,234,0.85)] backdrop-blur-[10px] border-b border-jb-line">
            <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-jb-ink-faint">Workspace / Job Matches</div>
            <div className="flex-1 min-w-[12px]" />
            {/* flexible search so the header can't push wider than the viewport */}
            <div className="flex items-center gap-[9px] bg-jb-paper border border-jb-line-3 rounded-full px-[15px] py-[9px] flex-[1_1_180px] max-w-[280px] min-w-0">
              <span className="text-jb-ink-ghost text-sm">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                placeholder="Search roles, companies…"
                aria-label="Search roles"
                className="flex-1 border-none bg-transparent font-sans text-sm text-jb-ink min-w-0 focus:outline-none"
              />
              <span className="font-mono text-[11px] text-jb-ink-ghost border border-jb-line-3 rounded-[5px] px-[5px] py-px">↵</span>
            </div>
            {/* Was "Auto-apply all ✦" — the loudest control on the page promised
                exactly the bulk-blast behaviour this product positions against,
                and linked to a settings page rather than applying to anything.
                Now it describes its destination, and is styled as secondary so
                it stops competing with the per-role Apply action. */}
            <Link
              href={appRoute('App Auto-Apply.dc.html')}
              className="inline-flex items-center gap-[7px] border border-jb-line-2 text-jb-ink text-[13.5px] font-semibold px-4 py-2.5 rounded-full no-underline hover:bg-jb-surface-2"
            >
              Auto-apply settings
            </Link>
          </header>

          <div className="px-8 pt-[30px] pb-12 w-full">
            {/* TITLE */}
            <div className="flex items-end justify-between gap-6 mb-[22px]">
              <div>
                <h1 className="font-display font-normal text-[40px] leading-none tracking-[-0.01em] mb-2">
                  {browsing ? 'Open roles' : 'Your matches'}
                </h1>
                <p className="text-[15.5px] text-jb-ink-muted m-0">
                  {browsing ? (
                    <>
                      <b className="text-jb-ink">{total} roles</b> you’re eligible for
                      {targetCountries.length ? (
                        <> · in or remote to {targetCountries.join(', ')}</>
                      ) : candidateCountry ? (
                        <> · in or remote to {candidateCountry}</>
                      ) : (
                        <> · <Link href="/app/preferences" className="text-jb-green-text font-semibold">set your job preferences</Link> to filter by location</>
                      )}
                      {query ? <> · “{query}”</> : null}
                    </>
                  ) : (
                    <>
                      <b className="text-jb-ink">{total} roles</b> fit your profile · <span className="text-jb-green-text font-semibold">{newToday} new today</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* FILTER BAR */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <FilterChip label="All matches" active={!anyFilter} onClick={resetFilters} />
              <FilterChip label="Remote" active={filters.remote} onClick={() => setFilter('remote', true)} />
              <FilterDropdown label="Role" value={filters.role} options={ROLE_FAMILIES.map((r) => ({ key: r, label: r }))} onSelect={(v) => setFilter('role', v)} />
              <FilterDropdown label="Min match" value={filters.minMatch} options={MATCH_OPTS} onSelect={(v) => setFilter('minMatch', v)} />
              <FilterDropdown label="Seniority" value={filters.seniority} options={SENIORITY_OPTS} onSelect={(v) => setFilter('seniority', v)} />
              <FilterChip label="This week" active={filters.thisWeek} onClick={() => setFilter('thisWeek', true)} />
              <div className="flex-1" />
              <span className="font-mono text-xs text-jb-ink-subtle">
                {anyFilter ? `${visibleJobs.length} shown` : browsing ? 'Latest roles' : 'Sorted by match'}
              </span>
            </div>

            {/* ERROR STATE */}
            {error && !loading && (
              <div className={CARD}>
                <ErrorState error={error} onRetry={load} />
              </div>
            )}

            {/* JOB CARDS */}
            <div className="flex flex-col gap-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : error
                ? null
                : visibleJobs.map((job, i) => {
                    const on = job.jobId ? !!interested[job.jobId] : false;
                    return (
                      <div key={job.id || i} onClick={() => job.jobId && setDetail(job)} className={`${CARD} transition-[border-color] duration-150 hover:border-jb-green ${job.jobId ? 'cursor-pointer' : 'cursor-default'}`}>
                        <div className="flex items-start gap-4">
                          <CompanyAvatar logoUrl={job.logoUrl} initials={job.logo} bg={job.bg} fg={job.fg} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-[5px]">
                              <h3 className="text-[17.5px] font-bold m-0">{job.role}</h3>
                              {job.isNew && <span className="font-mono text-[11px] font-semibold text-jb-green-ink bg-jb-green px-2 py-0.5 rounded-full">NEW</span>}
                            </div>
                            <div className="flex items-center gap-[9px] text-[13.5px] text-jb-ink-muted mb-3.5 flex-wrap">
                              <span className="font-semibold text-jb-ink">{job.company}</span>
                              {job.location && <><span className="text-[#c9bfac]">·</span><span>{job.location}</span></>}
                              {job.type && <><span className="text-[#c9bfac]">·</span><span>{job.type}</span></>}
                              {job.salary && <><span className="text-[#c9bfac]">·</span><span className="font-mono text-jb-green-text">{job.salary}</span></>}
                            </div>
                            <div className="flex items-center gap-[7px] flex-wrap">
                              {job.tags.map((t, ti) => (
                                <span key={ti} className="text-xs font-medium text-jb-ink-muted bg-[#f4efe4] rounded-[7px] px-2.5 py-[5px]">{t}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end gap-3.5">
                            <div className="text-right">
                              {/* A score derived from a posting that listed no
                                  skills is a default, not a measurement. Showing
                                  a confident "60% match" beside our own note that
                                  "skills weren't listed on this posting" is false
                                  precision, so low-confidence scores are rendered
                                  muted and labelled as an estimate. */}
                              {job.match ? (
                                <>
                                  <div
                                    className={`font-mono text-2xl font-semibold leading-none ${
                                      job.lowConfidence ? 'text-jb-ink-subtle' : 'text-jb-green-text'
                                    }`}
                                    title={job.lowConfidence ? 'This posting listed no skills, so the score is a rough estimate.' : undefined}
                                  >
                                    {job.match}
                                  </div>
                                  <div className="text-[11px] text-jb-ink-subtle font-mono">
                                    {job.lowConfidence ? 'estimate' : 'match'}
                                  </div>
                                </>
                              ) : job.source ? (
                                <span className="font-mono text-[11px] font-semibold text-jb-ink-subtle bg-[#f4efe4] px-[9px] py-1 rounded-full">via {job.source}</span>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleInterest(job); }}
                                title={on ? 'Saved as interested' : 'Mark as interested'}
                                aria-label={on ? 'Saved as interested' : 'Mark as interested'}
                                className={`w-10 h-10 rounded-[11px] cursor-pointer text-base hover:bg-[#f4efe4] ${on ? 'border border-jb-green bg-jb-green-tint text-jb-green-text' : 'border border-jb-line-3 bg-jb-paper text-jb-ink-subtle'}`}
                              >
                                {on ? '♥' : '♡'}
                              </button>
                              {job.externalUrl ? (
                                <a href={job.externalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-2 bg-jb-ink text-jb-cream text-[13.5px] font-semibold px-[18px] py-[11px] rounded-[11px] no-underline hover:bg-[#2a2820]">Apply →</a>
                              ) : (
                                <Link href={appRoute('App Apply.dc.html')} className="inline-flex items-center gap-2 bg-jb-ink text-jb-cream text-[13.5px] font-semibold px-[18px] py-[11px] rounded-[11px] no-underline hover:bg-[#2a2820]">Apply →</Link>
                              )}
                            </div>
                          </div>
                        </div>
                        {(job.eligibility || job.reason) && (
                          <div className="mt-4 pt-[15px] border-t border-jb-soft-2 flex flex-col gap-[9px]">
                            {job.eligibility && (
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <EligBadge status={job.eligibility.status} label={job.eligibility.label} />
                                <span className="text-[13px] text-jb-ink-muted">{job.eligibility.geographyExplanation}</span>
                                {/* "Eligible with conditions" without naming the
                                    condition makes the candidate guess. The
                                    engine already produces a reason per soft
                                    finding — show it. */}
                                {(job.eligibility.reasons || [])
                                  .filter((r) => r.severity === 'soft')
                                  .slice(0, 1)
                                  .map((r) => (
                                    <span key={r.code} className="text-[13px] text-[#8A6100]">
                                      — {r.message}
                                    </span>
                                  ))}
                              </div>
                            )}
                            {job.reason && (
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-jb-green flex-shrink-0">{job.matchLabel || (browsing ? 'About' : 'Why it fits')}</span>
                                <span className="text-[13px] text-jb-ink-muted overflow-hidden text-ellipsis whitespace-nowrap">{job.reason}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>

            {/* EMPTY STATE — explains itself with real pool counts rather than
                falling back to an unfiltered, out-of-country job list. */}
            {!loading && !error && jobs.length === 0 && (
              <div className={`${CARD} px-[30px] py-5`}>
                {impact && impact.poolSize > 0 && targetCountries.length > 0 ? (
                  <EmptyState
                    icon="◎"
                    title={`No roles in ${targetCountries.join(', ')} right now`}
                    hint={`${impact.poolSize} jobs in the pool · ${impact.excludedByGeography} outside your target countries · ${impact.excludedByPreference} filtered by your preferences · ${impact.belowMinMatch} below your match threshold.`}
                    action={
                      <Link
                        href={appRoute('App Job Profiles.dc.html')}
                        className="mt-1 inline-flex items-center gap-2 font-sans text-[13.5px] font-semibold text-jb-green-text no-underline"
                      >
                        Widen your target countries →
                      </Link>
                    }
                  />
                ) : impact && impact.poolSize === 0 ? (
                  <EmptyState
                    icon="◎"
                    title="No roles ingested yet"
                    hint="The job pool is empty — roles from company boards will appear here once ingested."
                  />
                ) : !targetCountries.length ? (
                  <EmptyState
                    icon="◎"
                    title="Tell us where you're looking"
                    hint="Set the countries you're targeting and we'll only show roles you can actually take."
                    action={
                      <Link
                        href={appRoute('App Job Profiles.dc.html')}
                        className="mt-1 inline-flex items-center gap-2 font-sans text-[13.5px] font-semibold text-jb-green-text no-underline"
                      >
                        Set up a job profile →
                      </Link>
                    }
                  />
                ) : (
                  <EmptyState
                    icon="◎"
                    title={query ? 'No roles found' : 'No roles yet'}
                    hint={query ? 'Try a different search term.' : 'Roles from company boards will appear here once ingested.'}
                  />
                )}
              </div>
            )}
            {!loading && !error && jobs.length > 0 && visibleJobs.length === 0 && (
              <div className={`${CARD} px-[30px] py-5`}>
                <EmptyState
                  icon="⚑"
                  title="No roles match these filters"
                  hint="Loosen a filter to see more roles."
                  action={<button type="button" onClick={resetFilters} className="mt-1 font-sans text-[13.5px] font-semibold text-jb-green-text bg-transparent border-none cursor-pointer">Clear filters</button>}
                />
              </div>
            )}

            {/* LOAD MORE */}
            {!loading && !error && jobs.length > 0 && remaining > 0 && (
              <div className="flex justify-center mt-[26px]">
                <button onClick={browsing ? loadMore : undefined} className="font-sans text-sm font-semibold text-jb-ink bg-jb-paper border border-jb-line-input rounded-full px-[26px] py-[13px] cursor-pointer hover:bg-[#f4efe4]">Load {Math.min(remaining, 60)} more {browsing ? 'roles' : 'matches'}</button>
              </div>
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
  'text-sm leading-[1.7] text-[#2a2820] ' +
  '[&_h1]:text-[15px] [&_h1]:font-bold [&_h1]:mt-[18px] [&_h1]:mb-2 [&_h1]:text-jb-ink ' +
  '[&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:mt-[18px] [&_h2]:mb-2 [&_h2]:text-jb-ink ' +
  '[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:mt-[18px] [&_h3]:mb-2 [&_h3]:text-jb-ink ' +
  '[&_p]:mb-3 [&_ul]:mb-3.5 [&_ul]:pl-5 [&_ol]:mb-3.5 [&_ol]:pl-5 [&_li]:mb-1.5 ' +
  '[&_a]:text-jb-green-text [&_b]:text-jb-ink [&_strong]:text-jb-ink [&_img]:max-w-full';

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
      className="fixed inset-0 z-[90] bg-[rgba(27,26,22,0.45)] backdrop-blur-[2px] flex justify-end"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[720px] max-w-[94vw] h-screen bg-jb-cream border-l border-jb-line flex flex-col"
      >
        {/* header */}
        <div className="flex items-start gap-3.5 px-6 py-5 border-b border-jb-line">
          <CompanyAvatar logoUrl={job.logoUrl} initials={job.logo} bg={job.bg} fg={job.fg} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-1 leading-[1.2]">{job.role}</h2>
            <div className="text-[13.5px] text-jb-ink-muted">
              <span className="font-semibold text-jb-ink">{job.company}</span>
              {job.location && <> · {job.location}</>}
              {job.type && <> · {job.type}</>}
            </div>
            {job.eligibility && (
              <div className="flex items-center gap-[9px] mt-2 flex-wrap">
                <EligBadge status={job.eligibility.status} label={job.eligibility.label} />
                <span className="text-[12.5px] text-[#6b655a]">{job.eligibility.geographyExplanation}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg border border-[#e0d8c7] bg-jb-paper cursor-pointer text-[15px] text-[#6b655a] flex-shrink-0">✕</button>
        </div>

        {/* eligibility reasons */}
        {job.eligibility?.reasons?.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 pt-3.5">
            {job.eligibility.reasons.map((r, i) => (
              <span
                key={i}
                title={r.code}
                className={`text-[11.5px] px-2.5 py-1 rounded-full ${r.severity === 'hard' ? 'bg-[#FBEDE4] text-[#9B4A2F]' : r.severity === 'soft' ? 'bg-jb-amber-tint text-[#B26A29]' : 'bg-[#EFEAE0] text-[#6b655a]'}`}
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
                <span key={i} className="text-xs font-medium text-jb-ink-muted bg-[#f4efe4] rounded-[7px] px-2.5 py-[5px]">{t}</span>
              ))}
            </div>
          )}
          {job.match && (
            <div className="mb-[22px] p-4 rounded-[14px] border border-jb-line bg-jb-paper">
              <div className={`flex items-baseline gap-2.5 ${job.matchedSkills?.length || job.missingSkills?.length ? 'mb-3' : ''}`}>
                <span className="font-mono text-[22px] font-semibold text-jb-green-text leading-none">{job.match}</span>
                <span className="text-[15px] font-bold">{job.matchLabel || 'Match'}</span>
              </div>
              {job.matchedSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center mb-2">
                  <span className="text-[11.5px] text-jb-ink-subtle mr-1">Your skills:</span>
                  {job.matchedSkills.map((s, i) => (
                    <span key={i} className="text-xs font-semibold text-jb-green-text bg-jb-green-tint rounded-md px-[9px] py-[3px]">✓ {s}</span>
                  ))}
                </div>
              )}
              {job.missingSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center mb-3">
                  <span className="text-[11.5px] text-jb-ink-subtle mr-1">Not in profile:</span>
                  {job.missingSkills.map((s, i) => (
                    <span key={i} className="text-xs text-jb-ink-subtle bg-[#f4efe4] rounded-md px-[9px] py-[3px]">{s}</span>
                  ))}
                </div>
              )}
              {job.matchFactors?.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {job.matchFactors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="w-32 flex-shrink-0 text-[11.5px] text-[#6b655a]">{f.label}</span>
                      <div className="flex-1 h-[5px] rounded-full bg-jb-soft-2 overflow-hidden">
                        {/* width is data-driven → inline */}
                        <div className="h-full bg-jb-green" style={{ width: `${Math.round((f.value || 0) * 100)}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-[#b7ae9c]">{Math.round((f.weight || 0) * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-jb-ink-faint mb-3">
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
        <div className="flex gap-2.5 px-6 py-3.5 border-t border-jb-line bg-jb-cream">
          <button
            onClick={onToggleSave}
            title={saved ? 'Saved' : 'Save'}
            aria-label={saved ? 'Saved' : 'Save'}
            className={`w-11 h-11 rounded-xl cursor-pointer text-[17px] ${saved ? 'border border-jb-green bg-jb-green-tint text-jb-green-text' : 'border border-jb-line-3 bg-jb-paper text-jb-ink-subtle'}`}
          >
            {saved ? '♥' : '♡'}
          </button>
          <div className="flex-1" />
          {applyUrl && (
            <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-jb-ink text-jb-cream text-[14.5px] font-bold px-[26px] py-[13px] rounded-xl no-underline">
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
      className="w-[52px] h-[52px] flex-shrink-0 rounded-[13px] overflow-hidden flex items-center justify-center font-bold text-[17px] border border-[#eee7d9]"
      style={{ background: ok ? '#FFFFFF' : bg, color: fg }}
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
    <span className={`text-[11px] font-bold px-[9px] py-[3px] rounded-full ${ok ? 'bg-jb-green-tint text-jb-green-text' : 'bg-jb-amber-tint text-[#B26A29]'}`}>
      {ok ? '✓ ' : '◑ '}
      {label}
    </span>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-[7px] font-sans text-[13.5px] font-semibold rounded-full px-[15px] py-2 cursor-pointer ${active ? 'text-jb-green-ink bg-jb-green border border-jb-green' : 'text-jb-ink-heading bg-jb-paper border border-jb-line-3'}`}
    >
      {label}
    </button>
  );
}

function FilterDropdown({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const active = value != null && value !== false;
  const selLabel = active ? options.find((o) => o.key === value)?.label || label : label;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-[7px] font-sans text-[13.5px] font-semibold rounded-full px-[15px] py-2 cursor-pointer ${active ? 'text-jb-green-text bg-jb-green-tint border border-jb-green' : 'text-jb-ink-heading bg-jb-paper border border-jb-line-3'}`}
      >
        {selLabel}
        <span className="text-[11px] text-jb-ink-faint">▼</span>
      </button>
      {open && (
        <div className="absolute top-[42px] left-0 z-30 min-w-[190px] bg-jb-paper border border-jb-line rounded-xl shadow-[0_18px_40px_-20px_rgba(27,26,22,0.4)] p-1.5">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => { onSelect(o.key); setOpen(false); }}
              className={`block w-full text-left px-2.5 py-2 rounded-lg border-none cursor-pointer font-sans text-[13px] ${value === o.key ? 'bg-jb-green-tint text-jb-green-text' : 'bg-transparent text-[#2a2820]'}`}
            >
              {o.label}
            </button>
          ))}
          {active && (
            <button
              type="button"
              onClick={() => { onSelect(value); setOpen(false); }}
              className="block w-full text-left px-2.5 py-2 mt-1 border-none border-t border-[#f1ebdf] bg-transparent cursor-pointer font-sans text-[12.5px] text-jb-ink-subtle"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- skeleton --- */
function SkeletonCard() {
  const bar = 'bg-[linear-gradient(90deg,#F1EBDD_25%,#F7F2E7_37%,#F1EBDD_63%)] bg-[length:480px_100%] animate-jb-shimmer rounded-[7px]';
  return (
    <div className={CARD}>
      <div className="flex items-start gap-4">
        <span className={`w-[52px] h-[52px] flex-shrink-0 rounded-[13px] ${bar}`} />
        <div className="flex-1 min-w-0">
          <div className={`w-[220px] h-[18px] mb-2.5 ${bar}`} />
          <div className={`w-[300px] h-[13px] mb-4 ${bar}`} />
          <div className="flex gap-[7px]">
            <span className={`w-[78px] h-[26px] ${bar}`} />
            <span className={`w-16 h-[26px] ${bar}`} />
            <span className={`w-[70px] h-[26px] ${bar}`} />
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-3.5">
          <div className={`w-12 h-7 ${bar}`} />
          <div className="flex gap-2">
            <span className={`w-10 h-10 ${bar}`} />
            <span className={`w-[82px] h-10 ${bar}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
