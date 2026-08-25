'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import Button from '@/components/app/ui/Button';
import Badge from '@/components/app/ui/Badge';
import Card from '@/components/app/ui/Card';
import MonoLabel from '@/components/app/ui/MonoLabel';
import PageHeader from '@/components/app/ui/PageHeader';
import FitScore, { fitInk } from '@/components/app/ui/FitScore';
import { getMyApplications } from '@/services/trackerApi';

/* -------------------------------------------------------------------------- */
/* Columns.                                                                    */
/*                                                                             */
/* Statuses are compared LOWERCASE against the enum in                         */
/* backend/src/schemas/application.schema.ts, plus the upper/legacy spellings   */
/* some ATS sources push. This previously uppercased the status and matched     */
/* against an uppercase list that was missing `REVIEWING` and `INTERVIEWED` —   */
/* the two values the backend actually writes — so every application in those  */
/* states silently fell through to the "Applied" default bucket.               */
/* -------------------------------------------------------------------------- */
const COLUMNS = [
  {
    key: 'applied',
    title: 'Applied',
    dot: 'var(--jb-a-dot-applied)',
    statuses: [
      'pending', 'submitted', 'queued', 'applying', 'applied', 'auto_applied',
      // Pre-send states of the same application: a draft the runner filled in
      // and parked, one that needs a human to finish, or one mid-flight. They
      // live here because the board has four columns by design, and each card
      // states its true state in the note beneath the title.
      'preparing', 'awaiting_approval', 'needs_human', 'failed',
    ],
  },
  {
    key: 'review',
    title: 'In review',
    dot: 'var(--jb-a-dot-review)',
    statuses: ['reviewing', 'in_review', 'viewed', 'screening', 'recruiter_screen', 'under_review'],
  },
  {
    key: 'interviewing',
    title: 'Interviewing',
    dot: 'var(--jb-a-accent)',
    statuses: ['interviewed', 'interview', 'interviewing', 'final_round', 'tech_screen', 'phone_screen', 'onsite'],
  },
  {
    key: 'offers',
    title: 'Offers',
    dot: 'var(--jb-a-status-offer)',
    statuses: ['accepted', 'offer', 'offered', 'hired'],
  },
];

const emptyColumns = () => COLUMNS.map((c) => ({ ...c, count: 0, cards: [] }));

/* Statuses that have left the pipeline. The board has four columns by design
   and none of them is "closed", so these are held OUT of it rather than
   falling through to the "Applied" default — a rejected application sitting
   under "Applied" reads as still live, which is the opposite of the truth.
   They are still counted in the header and still listed in the table view,
   which is a full record rather than a picture of what is moving. */
const CLOSED = ['rejected', 'declined', 'expired'];
const isClosed = (status) => CLOSED.includes(String(status || '').toLowerCase());

const columnKeyForStatus = (status) => {
  const s = String(status || '').toLowerCase();
  for (const col of COLUMNS) if (col.statuses.includes(s)) return col.key;
  return 'applied';
};

/* The states that are the CANDIDATE's move, not the employer's. These are what
   the design marks in cobalt and what the headline counts as "need you". */
const NEEDS_YOU = {
  awaiting_approval: 'Draft waiting for your approval',
  needs_human: 'Needs you to finish the form',
  failed: 'Submission failed — retry when you can',
};

const prettyStatus = (status) => {
  const s = String(status || '').replace(/_/g, ' ').toLowerCase();
  if (!s) return 'Applied';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Short relative stamp, matching the design's "2m / 3h / 1d" column.
const shortWhen = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const scoreOf = (a) => {
  const raw = a?.matchScore ?? a?.score ?? a?.job?.matchScore;
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const toCard = (app) => {
  const status = String(app?.status || '').toLowerCase();
  const urgentNote = NEEDS_YOU[status];
  return {
    id: app.id || app._id || `${app.companyName || 'x'}-${app.role || app.title || 'y'}`,
    company: app.companyName || app.company || app.job?.company || app.job?.companyName || 'Company',
    role: app.role || app.title || app.job?.title || app.job?.role || 'Application',
    status,
    stage: prettyStatus(app.status),
    note: urgentNote || (status === 'preparing' ? 'Being prepared now' : ''),
    urgent: !!urgentNote,
    fit: scoreOf(app),
    when: shortWhen(app.updatedAt || app.appliedAt || app.createdAt || app.submittedAt),
  };
};

/* ----------------------------------------------------------------- the page */
export default function AppTracker() {
  const [columns, setColumns] = useState(emptyColumns);
  const [closed, setClosed] = useState([]); // rejected / declined / expired
  const [view, setView] = useState('Board'); // 'Board' | 'Table'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyApplications({ limit: 200 });
      const apps = Array.isArray(res?.applications) ? res.applications : Array.isArray(res) ? res : [];

      const buckets = COLUMNS.map((c) => ({ ...c, cards: [] }));
      const indexByKey = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
      const closedCards = [];
      apps.forEach((app) => {
        if (isClosed(app.status)) {
          closedCards.push(toCard(app));
          return;
        }
        const idx = indexByKey[columnKeyForStatus(app.status)] ?? 0;
        buckets[idx].cards.push(toCard(app));
      });
      setColumns(buckets.map((b) => ({ ...b, count: b.cards.length })));
      setClosed(closedCards);
    } catch (err) {
      // Never fall back to fabricated data — surface the error, keep board empty.
      setError(err || new Error('Could not load applications'));
      setColumns(emptyColumns());
      setClosed([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.map((col) => ({
      ...col,
      cards: col.cards.filter((c) => `${c.role} ${c.company}`.toLowerCase().includes(q)),
    }));
  }, [columns, query]);

  const q = query.trim().toLowerCase();
  const filteredClosed = useMemo(
    () => (q ? closed.filter((c) => `${c.role} ${c.company}`.toLowerCase().includes(q)) : closed),
    [closed, q]
  );

  // The table is the complete record — live rows first, then the closed ones.
  const flatList = useMemo(
    () => [
      ...filteredColumns.flatMap((col) => col.cards.map((c) => ({ ...c, columnTitle: col.title }))),
      ...filteredClosed.map((c) => ({ ...c, columnTitle: 'Closed' })),
    ],
    [filteredColumns, filteredClosed]
  );

  const total = columns.reduce((n, c) => n + c.cards.length, 0);
  const needYou = columns.reduce((n, c) => n + c.cards.filter((k) => k.urgent).length, 0);

  // The headline is two counted sentences, and the second one only exists when
  // it is true — "0 need you" would be noise dressed as urgency.
  const headline = total
    ? `${total} in flight.${needYou ? ` ${needYou} need${needYou === 1 ? 's' : ''} you.` : ''}`
    : 'Nothing in flight yet.';

  const stageTone = (title) =>
    title === 'Offers' ? 'offer' : title === 'Interviewing' ? 'accent' : 'neutral';

  return (
    <>
      <Head>
        <title>Applications · Jobocate</title>
      </Head>

      <div style={{ display: 'flex', height: '100vh', background: 'var(--jb-a-stage)', color: 'var(--jb-a-ink)', fontFamily: 'var(--jb-font-sans)', overflow: 'hidden' }}>
        <AppSidebar active="tracker" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PageHeader
            title="Applications"
            level="h1"
            action={
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter…"
                  aria-label="Filter applications by role or company"
                  style={{
                    height: 32,
                    width: 150,
                    padding: '0 12px',
                    borderRadius: 999,
                    border: '1px solid var(--jb-a-line)',
                    background: 'var(--jb-a-card)',
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    color: 'var(--jb-a-ink)',
                  }}
                />
                {['Board', 'Table'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 32,
                      padding: '0 13px',
                      borderRadius: 6,
                      fontFamily: 'inherit',
                      fontSize: 13.5,
                      cursor: 'pointer',
                      background: 'var(--jb-a-card)',
                      border: `1px solid ${view === v ? 'var(--jb-a-ink)' : 'transparent'}`,
                      color: view === v ? 'var(--jb-a-ink)' : 'var(--jb-a-ink-3)',
                      fontWeight: view === v ? 600 : 500,
                    }}
                  >
                    {v}
                  </button>
                ))}
                <span style={{ width: 1, height: 20, background: 'var(--jb-a-line)' }} />
                {/* The mockup's "Log an application" has no endpoint behind it —
                    an application is always created against a job — so this is
                    the real path to the same outcome. */}
                <Button size="xs" href={appRoute('App Matches.dc.html')}>
                  Find a role
                </Button>
              </>
            }
          />

          <div style={{ padding: 'clamp(24px, 4vw, 38px) clamp(20px, 4vw, 44px) 22px', flexShrink: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--jb-font-display)',
                fontWeight: 400,
                fontSize: 'var(--jb-a-display-sm)',
                lineHeight: 1.04,
                letterSpacing: '-0.02em',
              }}
            >
              {headline}
            </h2>
            <p style={{ margin: '12px 0 0', fontSize: 16.5, lineHeight: 1.5, color: 'var(--jb-a-ink-2)' }}>
              {needYou
                ? 'Anything with a cobalt marker is waiting on your move, not theirs.'
                : 'Every card here is with the employer. Nothing is waiting on you right now.'}
              {closed.length > 0 && (
                <>
                  {' '}
                  <span style={{ color: 'var(--jb-a-ink-3)' }}>
                    {closed.length} closed application{closed.length === 1 ? ' is' : 's are'} kept in the table view.
                  </span>
                </>
              )}
            </p>
          </div>

          {loading && (
            <div style={{ padding: '0 44px 44px' }}>
              <LoadingState label="Loading your applications…" />
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: '0 44px 44px' }}>
              <ErrorState error={error} onRetry={loadApplications} />
            </div>
          )}

          {!loading && !error && total === 0 && closed.length === 0 && (
            <div style={{ padding: '0 44px 44px' }}>
              <EmptyState
                title="No applications yet"
                hint="Once you apply — or approve an auto-apply draft — it shows up here and moves along as the employer responds."
                action={<Button href={appRoute('App Matches.dc.html')}>Review your matches</Button>}
              />
            </div>
          )}

          {/* ── BOARD ─────────────────────────────────────────────────────
              The 1px gap over a --jb-a-line ground is what draws the column
              rules: no borders on the columns themselves, just the ground
              showing through. */}
          {!loading && !error && (total > 0 || closed.length > 0) && view === 'Board' && (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))',
                gap: 1,
                background: 'var(--jb-a-line)',
                borderTop: '1px solid var(--jb-a-line)',
                overflowX: 'auto',
              }}
            >
              {filteredColumns.map((col) => (
                <section
                  key={col.key}
                  aria-label={col.title}
                  style={{ background: 'var(--jb-a-rail)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: col.dot }} />
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>{col.title}</span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: 'var(--jb-a-ink-3)' }}>
                      {col.cards.length}
                    </span>
                  </div>

                  {col.cards.map((k) => (
                    <Card
                      key={k.id}
                      variant={k.urgent ? 'attention' : 'default'}
                      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 15px' }}
                    >
                      <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35 }}>{k.role}</span>
                      <span style={{ fontSize: 13.5, color: 'var(--jb-a-ink-soft)' }}>{k.company}</span>
                      {k.note && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 2 }}>
                          <span
                            aria-hidden="true"
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: k.urgent ? 'var(--jb-a-accent)' : 'var(--jb-a-ink-faint)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              lineHeight: 1.35,
                              fontWeight: k.urgent ? 600 : 400,
                              color: k.urgent ? 'var(--jb-a-ink)' : 'var(--jb-a-ink-3)',
                            }}
                          >
                            {k.note}
                          </span>
                        </span>
                      )}
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          paddingTop: 6,
                          marginTop: 2,
                          borderTop: '1px solid var(--jb-a-line-soft)',
                        }}
                      >
                        <FitScore fit={k.fit} size={16} suffix="%" />
                        <span style={{ flex: 1 }} />
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: 'var(--jb-a-ink-warm)' }}>
                          {k.when}
                        </span>
                      </span>
                    </Card>
                  ))}

                  {col.cards.length === 0 && (
                    <span style={{ fontSize: 13, color: 'var(--jb-a-ink-faint)', paddingTop: 4 }}>Nothing here.</span>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* ── TABLE ─────────────────────────────────────────────────────── */}
          {!loading && !error && (total > 0 || closed.length > 0) && view === 'Table' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 clamp(20px, 4vw, 44px) 48px' }}>
              <div style={{ minWidth: 640 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.4fr 1fr 90px 90px',
                    gap: '0 24px',
                    padding: '12px 0',
                    borderTop: '1px solid var(--jb-a-ink)',
                    borderBottom: '1px solid var(--jb-a-line-strong)',
                  }}
                >
                  {['Role', 'Company', 'Stage', 'Fit', 'Updated'].map((h) => (
                    <MonoLabel key={h}>{h}</MonoLabel>
                  ))}
                </div>
                {flatList.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.4fr 1fr 90px 90px',
                      gap: '0 24px',
                      alignItems: 'center',
                      padding: '16px 0',
                      borderBottom: '1px solid var(--jb-a-line-soft)',
                    }}
                  >
                    <span style={{ fontSize: 15.5, fontWeight: 600 }}>{t.role}</span>
                    <span style={{ fontSize: 14.5, color: 'var(--jb-a-ink-2)' }}>{t.company}</span>
                    <span style={{ display: 'flex' }}>
                      <Badge tone={stageTone(t.columnTitle)}>{t.stage}</Badge>
                    </span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 15, fontWeight: 600, color: fitInk(t.fit) }}>
                      {t.fit == null ? '—' : `${t.fit}%`}
                    </span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12.5, color: 'var(--jb-a-ink-warm)', textAlign: 'right' }}>
                      {t.when}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
