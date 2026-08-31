'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav, { AppShell } from '@/components/app/AppTopNav';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { useAuth } from '@/context/AuthContext';
import {
  getMyMatches,
  getMyApplications,
  getUserPreferences,
  getJobRecommendations,
} from '@/services/dashboardApi';

/* ----------------------------------------------------------- normalizers --- */
// The backend returns a match, a recommendation and an application in three
// slightly different shapes; every read of a job field goes through these so a
// shape change is a one-line fix rather than a hunt through the JSX.
const jobOf = (r) => r?.job || r?.scrapedJob || r || {};
const companyOf = (r) => jobOf(r).company || jobOf(r).companyName || 'Company';
const roleOf = (r) => jobOf(r).title || jobOf(r).role || jobOf(r).jobTitle || 'Role';

// Scores arrive either as 0–1 or 0–100 depending on the endpoint. Returns null
// when there is genuinely no score — callers render an em dash, never a zero.
const scoreOf = (r) => {
  const raw = r?.matchScore ?? r?.score ?? r?.overallScore ?? r?.match;
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const salaryOf = (r) => {
  const job = jobOf(r);
  if (job.salary) return job.salary;
  const min = job.salaryMin ?? job.salary_min;
  const max = job.salaryMax ?? job.salary_max;
  const k = (v) => `$${Math.round(Number(v) / 1000)}k`;
  if (min && max) return `${k(min)}–${Math.round(Number(max) / 1000)}k`;
  if (min) return `${k(min)}+`;
  return '';
};

/* v3's match row reads "Stripe · 180–220k · remote" — company first, then the
   money, then where. The old build put location before company. */
const metaOf = (r) => {
  const job = jobOf(r);
  const loc = job.location || job.jobLocation || '';
  return [companyOf(r), salaryOf(r), loc].filter(Boolean).join(' · ');
};

/* Application status buckets, mirroring the enum in
   backend/src/schemas/application.schema.ts. `awaiting_approval` is the
   candidate's own to-do (a prepared draft parked for approval) and is NOT the
   same as `reviewing`, which means the employer is looking at it. */
const IS = {
  awaitingApproval: (s) => s === 'awaiting_approval',
  needsHuman: (s) => s === 'needs_human' || s === 'failed',
  inReview: (s) => s === 'reviewing' || s === 'submitted',
  interviewing: (s) => s === 'interviewed',
  offer: (s) => s === 'accepted',
  closed: (s) => ['rejected', 'declined', 'expired'].includes(s),
};
const statusOf = (a) => String(a?.status || '').toLowerCase();

/* --------------------------------------------------------------- pieces --- */
/*
 * v3 states these once and reuses them on every screen, so they live here
 * rather than being retyped inline. Sizes are the artboard's, not rounded.
 */
const mono = (size = 9.5, tracking = '0.16em') => ({
  fontFamily: 'var(--jb-v3-font-mono)',
  fontSize: size,
  letterSpacing: tracking,
  textTransform: 'uppercase',
  color: 'var(--jb-v3-fg-3)',
});

const HAIR = '1px solid var(--jb-v3-line)';

/* The 1px-gap grid: cells sit on a --line ground so the gaps read as rules.
   Used by the readout strip and the pipeline strip. */
const gridRules = (cols) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: 1,
  background: 'var(--jb-v3-line)',
  border: HAIR,
  borderRadius: 2,
});

/*
 * The 16-bar sparkline under each readout. `pct` is a real ratio in 0..1; bars
 * at or under it take the accent, the rest the inactive tick colour.
 *
 * A null pct means "no denominator to measure against" — every bar stays off,
 * which reads as "nothing yet" rather than as a fabricated zero.
 */
function Ticks({ pct }) {
  const filled = pct == null ? 0 : Math.round(16 * Math.min(Math.max(pct, 0), 1));
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
      {Array.from({ length: 16 }, (_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 11,
            display: 'block',
            background: i < filled ? 'var(--jb-v3-tick-on)' : 'var(--jb-v3-tick-off)',
            transition: 'background .5s ease',
          }}
        />
      ))}
    </div>
  );
}

function Readout({ label, value, unit, pct }) {
  return (
    <div style={{ background: 'var(--jb-v3-panel)', padding: '20px 22px 18px' }}>
      <div style={{ ...mono(), marginBottom: 14 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
        <span style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: 'var(--jb-v3-fg-3)' }}>
            {unit}
          </span>
        )}
      </div>
      <Ticks pct={pct} />
    </div>
  );
}

/** Section label. In v3 a section is a mono word and a rule, never a card. */
function SectionLabel({ children, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 2,
      }}
    >
      <span style={mono()}>{children}</span>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------ component --- */
export default function AppDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [matchesRes, recsRes, appsRes, prefsRes] = await Promise.allSettled([
        getMyMatches({ minScore: 60 }),
        getJobRecommendations(60),
        getMyApplications({ limit: 200 }),
        getUserPreferences(),
      ]);
      if (cancelled) return;

      if (prefsRes.status === 'fulfilled') {
        setPrefs(prefsRes.value?.preferences || prefsRes.value || null);
      }

      // If every data call rejected, surface an error rather than a blank page.
      const dataCalls = [matchesRes, recsRes, appsRes, prefsRes];
      if (dataCalls.every((r) => r.status === 'rejected')) {
        setError(
          dataCalls.find((r) => r.status === 'rejected')?.reason ||
            new Error('Could not load your dashboard'),
        );
        setLoading(false);
        return;
      }

      const rawMatches =
        (matchesRes.status === 'fulfilled' && (matchesRes.value?.matches || matchesRes.value)) ||
        (recsRes.status === 'fulfilled' && (recsRes.value?.recommendations || recsRes.value)) ||
        null;
      const matchList = (Array.isArray(rawMatches) ? rawMatches : []).slice();
      // Highest fit first — the match rows read from the top of this list, so
      // the ordering has to happen once, here.
      matchList.sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
      setMatches(matchList);

      const rawApps =
        appsRes.status === 'fulfilled' &&
        (appsRes.value?.applications || (Array.isArray(appsRes.value) ? appsRes.value : null));
      setApps(Array.isArray(rawApps) ? rawApps : []);

      setLoading(false);
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

  const counts = useMemo(() => {
    const s = apps.map(statusOf);
    const inFlight = s.filter((x) => !IS.closed(x)).length;
    const responded = s.filter(
      (x) => IS.inReview(x) || IS.interviewing(x) || IS.offer(x) || x === 'rejected',
    ).length;
    const sent = s.filter(
      (x) => !IS.awaitingApproval(x) && x !== 'pending' && x !== 'preparing',
    ).length;
    return {
      total: s.length,
      sent,
      inFlight,
      inReview: s.filter(IS.inReview).length,
      interviewing: s.filter(IS.interviewing).length,
      offers: s.filter(IS.offer).length,
      responded,
    };
  }, [apps]);

  /*
   * The readouts. Each `pct` is a genuine ratio the data supports; where there
   * is no denominator (no applications yet) it is null and the bars stay dark.
   * v3's mockup shows "8 / 15" style quotas — this product has no per-period
   * application quota, so the unit carries the real denominator instead of an
   * invented target.
   */
  const readouts = useMemo(() => {
    const { total, sent, inFlight, interviewing, offers, responded } = counts;
    const of = (n, d) => (d ? n / d : null);
    return [
      { label: 'In flight', value: inFlight, unit: total ? `/ ${total}` : '', pct: of(inFlight, total) },
      { label: 'Interviewing', value: interviewing, unit: total ? `/ ${total}` : '', pct: of(interviewing, total) },
      { label: 'Offers', value: offers, unit: total ? `/ ${total}` : '', pct: of(offers, total) },
      {
        label: 'Response',
        value: sent ? Math.round((responded / sent) * 100) : '—',
        unit: sent ? '%' : '',
        pct: of(responded, sent),
      },
    ];
  }, [counts]);

  /* v3's pipeline is four stages. These map onto the real status buckets — no
     stage exists here that the schema cannot produce. */
  const pipeline = useMemo(
    () => [
      { stage: 'Applied', n: counts.sent },
      { stage: 'Screen', n: counts.inReview },
      { stage: 'Onsite', n: counts.interviewing },
      { stage: 'Offer', n: counts.offers },
    ],
    [counts],
  );

  /*
   * "Next" — interviews. v3 shows a scheduled time ("Tomorrow 14:00"), but the
   * candidate Application schema carries no scheduled-interview field, so the
   * slot renders the role instead of a fabricated time. When a schedule field
   * lands, put it in `when` and the row is already shaped for it.
   */
  const nextUp = useMemo(
    () =>
      apps
        .filter((a) => IS.interviewing(statusOf(a)))
        .slice(0, 3)
        .map((a) => ({
          id: a._id || a.id,
          company: companyOf(a),
          when: null,
          meta: roleOf(a),
        })),
    [apps],
  );

  /* "Log" — most recently touched applications, newest first. */
  const log = useMemo(() => {
    const stamp = (a) => new Date(a.updatedAt || a.createdAt || 0).getTime();
    return apps
      .filter((a) => stamp(a))
      .sort((a, b) => stamp(b) - stamp(a))
      .slice(0, 5)
      .map((a) => {
        const days = Math.floor((Date.now() - stamp(a)) / 86400000);
        return {
          id: a._id || a.id,
          t: days <= 0 ? 'today' : days === 1 ? '1d' : `${days}d`,
          text: `${companyOf(a)} · ${statusOf(a).replace(/_/g, ' ') || 'updated'}`,
        };
      });
  }, [apps]);

  const topMatches = matches.slice(0, 3);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Your dashboard';

  /* "Staff / backend · Toronto" in v3 — the user's target, from preferences.
     Omitted rather than guessed when preferences are empty. */
  const targetLine = useMemo(() => {
    const titles = prefs?.titles || [];
    const locations = prefs?.locations || [];
    return [titles[0], locations[0]].filter(Boolean).join(' · ');
  }, [prefs]);

  /* v3's "Day 7" counter, from the account's own age. */
  const dayNumber = useMemo(() => {
    if (!user?.createdAt) return null;
    const started = new Date(user.createdAt).getTime();
    if (!started) return null;
    return Math.max(1, Math.floor((Date.now() - started) / 86400000) + 1);
  }, [user]);

  const isNew = !loading && !error && apps.length === 0 && matches.length === 0;

  return (
    <>
      <Head>
        <title>Dashboard · Jobocate</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', color: 'var(--jb-v3-fg)' }}>
        <AppTopNav />

        <AppShell>
          {loading && <LoadingState label="Loading your dashboard…" />}
          {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

          {!loading && !error && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 24,
                  marginBottom: 30,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em' }}>
                    {displayName}
                  </h1>
                  {targetLine && <span style={mono(10.5, '0.14em')}>{targetLine}</span>}
                </div>
                {dayNumber && (
                  <span style={{ ...mono(10.5, '0.14em'), color: 'var(--jb-v3-accent)' }}>
                    Day {dayNumber}
                  </span>
                )}
              </div>

              <div style={{ ...gridRules(4), marginBottom: 34 }}>
                {readouts.map((r) => (
                  <Readout key={r.label} {...r} />
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr',
                  gap: 44,
                  alignItems: 'start',
                }}
              >
                <div>
                  <SectionLabel
                    action={
                      <Link href="/app/matches" style={{ fontSize: 12, color: 'var(--jb-v3-accent)' }}>
                        {matches.length || 'None'}
                      </Link>
                    }
                  >
                    Matches
                  </SectionLabel>

                  {topMatches.map((m, i) => (
                    <div
                      key={jobOf(m)._id || jobOf(m).id || `${roleOf(m)}-${i}`}
                      style={{
                        borderTop: HAIR,
                        padding: '15px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--jb-v3-font-mono)',
                          fontSize: 15,
                          color: 'var(--jb-v3-accent)',
                          flex: 'none',
                          width: 30,
                        }}
                      >
                        {scoreOf(m) ?? '—'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{roleOf(m)}</div>
                        <div
                          style={{
                            fontFamily: 'var(--jb-v3-font-mono)',
                            fontSize: 10.5,
                            color: 'var(--jb-v3-fg-3)',
                            marginTop: 2,
                          }}
                        >
                          {metaOf(m)}
                        </div>
                      </div>
                      <Link
                        href="/app/resume"
                        style={{
                          ...mono(10, '0.1em'),
                          border: '1px solid var(--jb-v3-line-2)',
                          borderRadius: 2,
                          padding: '5px 12px',
                          color: 'var(--jb-v3-fg-2)',
                        }}
                      >
                        Tailor
                      </Link>
                    </div>
                  ))}

                  {topMatches.length === 0 && (
                    <EmptyState
                      title={isNew ? 'Nothing here yet' : 'No matches yet'}
                      hint="Once your résumé and preferences are in, roles arrive here ranked by fit."
                      action={
                        <Link
                          href="/app/preferences"
                          style={{
                            ...mono(10, '0.1em'),
                            marginTop: 8,
                            border: '1px solid var(--jb-v3-line-2)',
                            borderRadius: 2,
                            padding: '7px 14px',
                            color: 'var(--jb-v3-fg-2)',
                          }}
                        >
                          Set preferences
                        </Link>
                      }
                    />
                  )}

                  <div style={{ borderTop: HAIR, marginBottom: 34 }} />

                  <span style={mono()}>Pipeline</span>
                  <div style={{ ...gridRules(4), marginTop: 10 }}>
                    {pipeline.map((p) => (
                      <Link
                        key={p.stage}
                        href="/app/tracker"
                        style={{
                          background: 'var(--jb-v3-panel)',
                          padding: '16px 18px',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ ...mono(9.5, '0.14em'), marginBottom: 10 }}>{p.stage}</div>
                        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.04em' }}>
                          {p.n}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <span style={mono()}>Next</span>
                  {nextUp.map((v) => (
                    <div key={v.id} style={{ borderTop: HAIR, padding: '15px 0' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 14.5, fontWeight: 500 }}>{v.company}</span>
                        {v.when && (
                          <span
                            style={{
                              fontFamily: 'var(--jb-v3-font-mono)',
                              fontSize: 10.5,
                              color: 'var(--jb-v3-accent)',
                            }}
                          >
                            {v.when}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--jb-v3-font-mono)',
                          fontSize: 10.5,
                          color: 'var(--jb-v3-fg-3)',
                          marginTop: 3,
                        }}
                      >
                        {v.meta}
                      </div>
                    </div>
                  ))}
                  {nextUp.length === 0 && (
                    <div style={{ borderTop: HAIR, padding: '15px 0', fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>
                      No interviews scheduled.
                    </div>
                  )}
                  <div style={{ borderTop: HAIR, marginBottom: 30 }} />

                  <span style={mono()}>Log</span>
                  {log.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        borderTop: HAIR,
                        padding: '11px 0',
                        display: 'flex',
                        gap: 14,
                        alignItems: 'baseline',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--jb-v3-font-mono)',
                          fontSize: 10,
                          color: 'var(--jb-v3-fg-3)',
                          flex: 'none',
                          width: 42,
                        }}
                      >
                        {a.t}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>{a.text}</span>
                    </div>
                  ))}
                  {log.length === 0 && (
                    <div style={{ borderTop: HAIR, padding: '11px 0', fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>
                      Nothing yet.
                    </div>
                  )}
                  <div style={{ borderTop: HAIR }} />
                </div>
              </div>
            </>
          )}
        </AppShell>
      </div>
    </>
  );
}
