'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import AppSidebar, { openCommandPalette } from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import Button from '@/components/app/ui/Button';
import PageHeader from '@/components/app/ui/PageHeader';
import Hero from '@/components/app/ui/Hero';
import MonoLabel from '@/components/app/ui/MonoLabel';
import RuleHeading from '@/components/app/ui/RuleHeading';
import FitScore from '@/components/app/ui/FitScore';
import {
  getMyMatches,
  getMyApplications,
  getUserPreferences,
  getJobRecommendations,
} from '@/services/dashboardApi';
import { listResumes } from '@/services/resumeApi';

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

const metaOf = (r) => {
  const loc = jobOf(r).location || jobOf(r).jobLocation || '';
  return [loc, salaryOf(r)].filter(Boolean).join(' · ');
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

/* ------------------------------------------------------------- the hero --- */
/* "One thing today" is a real answer, not a slogan: it picks the single most
   actionable thing in the user's data, in the order the product cares about.
   A parked draft outranks an interview because it expires; an interview
   outranks a match because it is already a conversation.

   The design's mockup headline names a day and time ("Tuesday, 2pm"), but the
   candidate Application schema carries no scheduled-interview field — see
   "Data gaps" in the plan — so the interview case names the company and role
   it can actually prove, and does not invent a slot. */
function pickOneThing({ apps, matches }) {
  const by = (fn) => apps.filter((a) => fn(statusOf(a)));

  const parked = by(IS.awaitingApproval);
  if (parked.length) {
    const one = parked[0];
    return {
      eyebrow: 'One thing today',
      title:
        parked.length === 1
          ? `Your ${roleOf(one)} draft is ready to send.`
          : `${parked.length} drafts are waiting on your approval.`,
      deck:
        parked.length === 1
          ? `Prepared for ${companyOf(one)}. Nothing goes out until you say so — read it through and send, or edit first.`
          : `Each one is filled in and parked. Nothing sends until you approve it.`,
      primary: { label: 'Review drafts', href: appRoute('App Auto-Apply.dc.html') },
      secondary: { label: 'See all applications', href: appRoute('App Tracker.dc.html') },
    };
  }

  const blocked = by(IS.needsHuman);
  if (blocked.length) {
    return {
      eyebrow: 'Needs your hand',
      title: `${blocked.length} application${blocked.length > 1 ? 's' : ''} couldn't be finished automatically.`,
      deck: 'The form needed something we could not answer for you. Finishing one takes a couple of minutes.',
      primary: { label: 'Finish them', href: appRoute('App Tracker.dc.html') },
      secondary: null,
    };
  }

  const offers = by(IS.offer);
  if (offers.length) {
    const one = offers[0];
    return {
      eyebrow: 'On the table',
      title:
        offers.length === 1
          ? `${companyOf(one)} made you an offer.`
          : `You have ${offers.length} offers to compare.`,
      deck: `${roleOf(one)}. Take the time you need — comparing them side by side usually helps.`,
      primary: { label: 'Open offers', href: appRoute('App Offers.dc.html') },
      secondary: null,
    };
  }

  const interviews = by(IS.interviewing);
  if (interviews.length) {
    const one = interviews[0];
    return {
      eyebrow: 'One thing today',
      title: `${companyOf(one)} wants to talk.`,
      deck: `You're at the interview stage for ${roleOf(one)}. The prep pack is ready and takes about twenty minutes.`,
      primary: { label: 'Open prep pack', href: appRoute('App Interview.dc.html') },
      secondary: { label: 'See the application', href: appRoute('App Tracker.dc.html') },
    };
  }

  const top = matches[0];
  if (top && scoreOf(top) != null) {
    return {
      eyebrow: 'One thing today',
      title: `${companyOf(top)} is your strongest match.`,
      deck: `${roleOf(top)} — ${scoreOf(top)}% fit${metaOf(top) ? `. ${metaOf(top)}` : ''}. Worth twenty minutes of your morning.`,
      primary: { label: 'Review the match', href: appRoute('App Matches.dc.html') },
      secondary: { label: 'See all matches', href: appRoute('App Matches.dc.html') },
    };
  }

  if (matches.length) {
    return {
      eyebrow: 'One thing today',
      title: `${matches.length} roles are waiting on you.`,
      deck: 'Ranked on skills, seniority and availability. Open any one to see the reasoning behind it.',
      primary: { label: 'Review matches', href: appRoute('App Matches.dc.html') },
      secondary: null,
    };
  }

  return null;
}

/* ------------------------------------------------------------ component --- */
export default function AppDashboard() {
  const [apps, setApps] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumeCount, setResumeCount] = useState(0);
  const [hasPrefs, setHasPrefs] = useState(false);

  // "Thu 21 Aug" — day before month, and no comma. en-US puts the month first
  // and inserts a comma after the weekday, which breaks the mono label's rhythm,
  // so the parts are assembled rather than taken from one locale string.
  const today = useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday} ${d.getDate()} ${month}`;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [matchesRes, recsRes, appsRes, prefsRes, resumesRes] = await Promise.allSettled([
        getMyMatches({ minScore: 60 }),
        getJobRecommendations(60),
        getMyApplications({ limit: 200 }),
        getUserPreferences(),
        listResumes(),
      ]);
      if (cancelled) return;

      if (resumesRes.status === 'fulfilled') {
        const list = Array.isArray(resumesRes.value) ? resumesRes.value : resumesRes.value?.resumes || [];
        setResumeCount(list.length);
      }
      if (prefsRes.status === 'fulfilled') {
        const p = prefsRes.value?.preferences || prefsRes.value || {};
        setHasPrefs(!!(p.titles?.length || p.locations?.length));
      }

      // If every data call rejected, surface an error rather than a blank page.
      const dataCalls = [matchesRes, recsRes, appsRes, prefsRes];
      if (dataCalls.every((r) => r.status === 'rejected')) {
        setError(dataCalls.find((r) => r.status === 'rejected')?.reason || new Error('Could not load your dashboard'));
        setLoading(false);
        return;
      }

      const rawMatches =
        (matchesRes.status === 'fulfilled' && (matchesRes.value?.matches || matchesRes.value)) ||
        (recsRes.status === 'fulfilled' && (recsRes.value?.recommendations || recsRes.value)) ||
        null;
      const matchList = (Array.isArray(rawMatches) ? rawMatches : []).slice();
      // Highest fit first — the hero and the "waiting on you" rows both read
      // from the top of this list, so the ordering has to happen once, here.
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
      (x) => IS.inReview(x) || IS.interviewing(x) || IS.offer(x) || x === 'rejected'
    ).length;
    const sent = s.filter((x) => !IS.awaitingApproval(x) && x !== 'pending' && x !== 'preparing').length;
    return {
      inFlight,
      interviewing: s.filter(IS.interviewing).length,
      offers: s.filter(IS.offer).length,
      responseRate: sent ? `${Math.round((responded / sent) * 100)}%` : '—',
    };
  }, [apps]);

  const one = useMemo(() => pickOneThing({ apps, matches }), [apps, matches]);
  const topMatches = matches.slice(0, 3);

  // A brand-new workspace has nothing to lead with. Show the setup path
  // instead of an editorial headline about data that does not exist.
  const isNew = !loading && !error && apps.length === 0 && matches.length === 0;

  const stats = [
    { label: 'In flight', value: counts.inFlight || '—', ink: 'var(--jb-a-ink)' },
    { label: 'Interviewing', value: counts.interviewing || '—', ink: 'var(--jb-a-ink)' },
    { label: 'Offers', value: counts.offers || '—', ink: counts.offers ? 'var(--jb-a-status-offer)' : 'var(--jb-a-ink)' },
    { label: 'Response rate', value: counts.responseRate, ink: 'var(--jb-a-accent)' },
  ];

  const setupSteps = [
    { key: 'resume', label: 'Add your résumé', hint: 'Import one or build it here', done: resumeCount > 0, href: '/app/resume-library' },
    { key: 'prefs', label: 'Set your preferences', hint: 'Titles, locations, salary floor', done: hasPrefs, href: '/app/preferences' },
    { key: 'matches', label: 'Review your matches', hint: 'Roles ranked by fit', done: matches.length > 0, href: appRoute('App Matches.dc.html') },
    { key: 'auto', label: 'Turn on Auto-Apply', hint: 'Drafts prepared for your approval', done: apps.length > 0, href: appRoute('App Auto-Apply.dc.html') },
  ];

  return (
    <>
      <Head>
        <title>Dashboard · Jobocate</title>
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--jb-a-stage)', color: 'var(--jb-a-ink)', fontFamily: 'var(--jb-font-sans)' }}>
        <AppSidebar active="dashboard" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <PageHeader
            title="Dashboard"
            level="h1"
            style={{ padding: '0 clamp(20px, 4vw, 48px)' }}
            action={
              <>
                <button
                  type="button"
                  onClick={openCommandPalette}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 999,
                    border: '1px solid var(--jb-a-line)',
                    background: 'var(--jb-a-card)',
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    color: 'var(--jb-a-ink-soft)',
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden="true">⌕</span>
                  <span>Search</span>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11 }}>⌘K</span>
                </button>
                <MonoLabel tracking="normal" style={{ fontSize: 11.5, letterSpacing: '0.14em' }}>
                  {today}
                </MonoLabel>
              </>
            }
          />

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'clamp(32px, 5vw, 56px) clamp(20px, 4vw, 48px) 64px' }}>
            <div style={{ maxWidth: 1180 }}>
              {loading && <LoadingState label="Loading your dashboard…" />}
              {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

              {isNew && (
                <>
                  <Hero
                    eyebrow="First things first"
                    title="Let's get you set up."
                    deck="Four short steps and Jobocate can start ranking roles for you. None of them takes more than a couple of minutes."
                    size="hero"
                  />
                  <div style={{ marginTop: 48, borderTop: '1px solid var(--jb-a-line-strong)' }}>
                    {setupSteps.map((s) => (
                      <a
                        key={s.key}
                        href={s.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 20,
                          padding: '20px 0',
                          borderBottom: '1px solid var(--jb-a-line-soft)',
                          textDecoration: 'none',
                          color: 'inherit',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 22,
                            height: 22,
                            flexShrink: 0,
                            borderRadius: '50%',
                            border: `1.5px solid ${s.done ? 'var(--jb-a-accent)' : 'var(--jb-a-line-strong)'}`,
                            background: s.done ? 'var(--jb-a-accent)' : 'transparent',
                            color: 'var(--jb-a-accent-ink)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {s.done ? '✓' : ''}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 17, fontWeight: 600 }}>{s.label}</span>
                          <span style={{ display: 'block', fontSize: 14.5, color: 'var(--jb-a-ink-soft)' }}>{s.hint}</span>
                        </span>
                        <span style={{ color: 'var(--jb-a-accent)', fontSize: 14, fontWeight: 600 }}>
                          {s.done ? 'Done' : 'Start →'}
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {!loading && !error && !isNew && one && (
                <>
                  <Hero
                    eyebrow={one.eyebrow}
                    title={one.title}
                    deck={one.deck}
                    size="hero"
                    actions={
                      <>
                        <Button size="lg" href={one.primary.href}>
                          {one.primary.label}
                        </Button>
                        {one.secondary && (
                          <Button size="lg" variant="secondary" href={one.secondary.href}>
                            {one.secondary.label}
                          </Button>
                        )}
                      </>
                    }
                  />

                  {/* Stat row — four bare figures on a rule. The design retired
                      the KPI cards: a number in Instrument Serif at 44px does
                      not need a box around it to read as important. */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 24,
                      marginTop: 76,
                      paddingTop: 28,
                      borderTop: '1px solid var(--jb-a-line-strong)',
                    }}
                  >
                    {stats.map((s) => (
                      <div key={s.label} style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <MonoLabel>{s.label}</MonoLabel>
                        <span
                          style={{
                            fontFamily: 'var(--jb-font-display)',
                            fontWeight: 400,
                            fontSize: 'var(--jb-a-display-stat)',
                            lineHeight: 1,
                            color: s.ink,
                          }}
                        >
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <RuleHeading
                    label="Waiting on you"
                    style={{ marginTop: 56 }}
                    action={
                      <Button variant="quiet" href={appRoute('App Matches.dc.html')} style={{ fontSize: 14 }}>
                        {matches.length ? `All ${matches.length} matches →` : 'Find matches →'}
                      </Button>
                    }
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
                    {topMatches.map((m, i) => (
                      <div
                        key={jobOf(m)._id || jobOf(m).id || `${roleOf(m)}-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 24,
                          padding: '22px 0',
                          borderBottom: '1px solid var(--jb-a-line-soft)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <FitScore fit={scoreOf(m)} size={20} suffix="" style={{ width: 56, flexShrink: 0 }} />
                        <span style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 19, fontWeight: 600 }}>{roleOf(m)}</span>
                          <span style={{ fontSize: 16, color: 'var(--jb-a-ink-soft)' }}>{companyOf(m)}</span>
                        </span>
                        <span style={{ fontSize: 15, color: 'var(--jb-a-ink-soft)', width: 200 }}>{metaOf(m)}</span>
                        <Button variant="secondary" size="sm" href={appRoute('App Matches.dc.html')}>
                          Review
                        </Button>
                      </div>
                    ))}
                    {topMatches.length === 0 && (
                      <EmptyState
                        title="No matches yet"
                        hint="Once your résumé and preferences are in, roles start arriving here ranked by fit."
                        action={<Button href="/app/preferences">Set preferences</Button>}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
