'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import {
  Screen,
  BigCount,
  TableHead,
  Row,
  EndRule,
  MonoButton,
  MonoChip,
  mono,
  covInk,
} from '@/components/app/v3/kit';
import { getMyMatches, getEligibleJobs, markJobAsInterested } from '@/services/matchesApi';
import { getMatchPreviewForProfile } from '@/services/jobProfileApi';

/* ------------------------------------------------------- filter model --- */
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

const seniorPlus = (title) => seniorityIndex(title) >= LEVELS.indexOf('senior');
const within7d = (d) => !!d && (Date.now() - new Date(d).getTime()) / 86400000 <= 7;

const formatSalary = (job) => {
  if (job.salary) return job.salary;
  const min = job.salaryMin ?? job.minSalary;
  const max = job.salaryMax ?? job.maxSalary;
  const k = (n) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max).replace('$', '')}`;
  if (min) return `${k(min)}+`;
  if (max) return `Up to ${k(max)}`;
  return '—';
};

const isRecent = (job) => {
  const d = job.postedAt || job.createdAt || job.scrapedAt;
  if (!d) return false;
  return (Date.now() - new Date(d).getTime()) / 86400000 <= 1;
};

/* ----------------------------------------------------------- normalize --- */
const normalizeMatch = (m, i) => {
  const job = m.job || m.scrapedJob || m.jobDetails || m;
  const score = m.score ?? m.matchScore ?? m.overallScore ?? job.matchScore;
  return {
    id: m.id || m._id || job.id || job._id || `match-${i}`,
    jobId: job.id || job._id || m.jobId,
    company: job.company || job.companyName || 'Company',
    role: job.role || job.title || job.jobTitle || 'Role',
    comp: formatSalary(job),
    // Numeric floor in thousands, for the salary filter. Null means the
    // posting published no band — such a row is unknown, not low.
    salaryMinK: (() => {
      const v = job.salaryMin ?? job.minSalary;
      return v ? Math.round(Number(v) / 1000) : null;
    })(),
    matchNum: score != null ? Math.round(score) : null,
    workplaceType: job.workplaceType || m.workplaceType || null,
    mode: (job.workplaceType || m.workplaceType || job.jobType || 'onsite').toLowerCase(),
    scrapedAt: job.scrapedAt || m.scrapedAt || null,
    isNew: m.isNew ?? isRecent(job),
    isInterested: !!m.isInterested,
  };
};

/*
 * v3's filter row is five chips. They map onto the same predicates the old
 * 268px filter rail ran; the rail's extra controls (role family, a five-step
 * seniority radiogroup, a salary slider) collapse into these because the
 * design carries filtering as a single row of toggles, not a sidebar.
 */
const SALARY_FLOOR_K = 180;
const FILTERS = [
  { key: 'remote', label: 'Remote', test: (j) => j.workplaceType === 'REMOTE' },
  { key: 'senior', label: 'Senior+', test: (j) => seniorPlus(j.role) },
  { key: 'pay', label: `${SALARY_FLOOR_K}k+`, test: (j) => j.salaryMinK == null || j.salaryMinK >= SALARY_FLOOR_K },
  { key: 'strong', label: '88+', test: (j) => j.matchNum != null && j.matchNum >= 88 },
  { key: 'fresh', label: 'Posted 7d', test: (j) => within7d(j.scrapedAt) },
];

const COLS = '34px 1fr 150px 120px 96px 78px';

export default function AppMatches() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interested, setInterested] = useState({});
  const [impact, setImpact] = useState(null);
  const [on, setOn] = useState({});

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
        } catch {
          raw = [];
        }
      }

      // 2) Stage-1 ELIGIBLE jobs — geography/legally filtered pool (default).
      //
      // There is deliberately NO unfiltered fallback here. This used to drop to
      // `searchScrapedJobs` whenever the eligible call returned thin or threw,
      // which silently showed jobs from every country — the exact opposite of
      // what a candidate targeting one market asked for. An empty eligible set
      // is a real answer, and the impact preview explains it below.
      if (!Array.isArray(raw) || raw.length === 0) {
        const elig = await getEligibleJobs({
          keywords: opts.query || '',
          limit: 60,
          ...(opts.profileId ? { profileId: opts.profileId } : {}),
        });
        raw = elig.jobs || [];
        count = elig.total ?? raw.length;
      }

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
      const seed = {};
      mapped.forEach((j) => {
        if (j.jobId) seed[j.jobId] = !!j.isInterested;
      });
      setInterested(seed);
    } catch (err) {
      setError(err || new Error('Could not load roles'));
      setJobs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const profileId = typeof router.query.profileId === 'string' ? router.query.profileId : undefined;
    load({ profileId });
  }, [load, router.isReady, router.query.profileId]);

  const toggleInterest = async (job) => {
    if (!job.jobId) return;
    const wasOn = !!interested[job.jobId];
    setInterested((p) => ({ ...p, [job.jobId]: !wasOn }));
    try {
      await markJobAsInterested(job.jobId, !wasOn);
    } catch {
      setInterested((p) => ({ ...p, [job.jobId]: wasOn })); // revert
    }
  };

  const visible = useMemo(() => {
    const active = FILTERS.filter((f) => on[f.key]);
    return jobs
      .filter((j) => active.every((f) => f.test(j)))
      .sort((a, b) => (b.matchNum ?? -1) - (a.matchNum ?? -1));
  }, [jobs, on]);

  return (
    <>
      <Head>
        <title>Matches · Jobocate</title>
      </Head>

      <Screen>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 20,
            marginBottom: 22,
            flexWrap: 'wrap',
          }}
        >
          <BigCount value={visible.length} caption="Open roles" />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <MonoChip
                key={f.key}
                on={!!on[f.key]}
                onClick={() => setOn((p) => ({ ...p, [f.key]: !p[f.key] }))}
              >
                {f.label}
              </MonoChip>
            ))}
          </div>
        </div>

        {loading && <LoadingState label="Finding roles you're eligible for…" />}
        {!loading && error && <ErrorState error={error} onRetry={() => load()} />}

        {!loading && !error && visible.length > 0 && (
          <>
            <TableHead cols={COLS} labels={['Cov', 'Role', 'Company', 'Comp', 'Mode', '']} />
            {visible.map((m) => (
              <Row key={m.id} cols={COLS}>
                <span
                  style={{
                    fontFamily: 'var(--jb-v3-font-mono)',
                    fontSize: 14,
                    color: covInk(m.matchNum),
                  }}
                >
                  {m.matchNum ?? '—'}
                </span>
                <span style={{ fontSize: 14.5, fontWeight: 500 }}>
                  {m.role}
                  {m.isNew && (
                    <span style={{ ...mono(9.5, '0.12em', 'var(--jb-v3-accent)'), marginLeft: 10 }}>
                      New
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>{m.company}</span>
                <span
                  style={{
                    fontFamily: 'var(--jb-v3-font-mono)',
                    fontSize: 11.5,
                    color: 'var(--jb-v3-fg-2)',
                  }}
                >
                  {m.comp}
                </span>
                <span style={mono(10, '0.1em')}>{m.mode}</span>
                <MonoButton
                  block
                  onClick={() => toggleInterest(m)}
                  style={
                    interested[m.jobId]
                      ? { borderColor: 'var(--jb-v3-accent-line)', color: 'var(--jb-v3-accent)' }
                      : undefined
                  }
                >
                  {interested[m.jobId] ? 'Saved' : 'Save'}
                </MonoButton>
              </Row>
            ))}
            <EndRule />
          </>
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState
            title={jobs.length ? 'Nothing matches those filters' : 'No eligible roles yet'}
            hint={
              jobs.length
                ? 'Clear a filter to widen the list.'
                : impact
                  ? /* The real reason, from the backend — not a generic shrug. */
                    `${impact.totalJobs ?? impact.poolSize ?? 0} roles in the pool, ${impact.eligible ?? 0} you are eligible for. Widen your target countries or work authorisation to see more.`
                  : 'Set your target countries and work authorisation and roles start arriving here.'
            }
            action={
              <MonoButton
                href={jobs.length ? undefined : '/app/preferences'}
                onClick={jobs.length ? () => setOn({}) : undefined}
                style={{ marginTop: 8 }}
              >
                {jobs.length ? 'Clear filters' : 'Set preferences'}
              </MonoButton>
            }
          />
        )}

        {!loading && !error && total > visible.length && (
          <div style={{ ...mono(10, '0.1em'), marginTop: 16 }}>
            Showing {visible.length} of {total}
          </div>
        )}
      </Screen>
    </>
  );
}
