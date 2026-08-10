'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { getMyApplications } from '@/services/trackerApi';

/* -------------------------------------------------------------------------- */
/* Column definitions (from the design's renderVals()).                         */
/* Each column declares the backend statuses that map into it.                  */
/* -------------------------------------------------------------------------- */
const COLUMNS = [
  {
    key: 'applied',
    title: 'Applied',
    color: '#1B1A16',
    statuses: ['QUEUED', 'PENDING', 'APPLYING', 'APPLIED', 'SUBMITTED', 'AUTO_APPLIED'],
  },
  {
    key: 'review',
    title: 'In review',
    color: '#C9622E',
    statuses: ['IN_REVIEW', 'VIEWED', 'SCREENING', 'RECRUITER_SCREEN', 'UNDER_REVIEW'],
  },
  {
    key: 'interviewing',
    title: 'Interviewing',
    color: '#1FA463',
    statuses: ['INTERVIEW', 'INTERVIEWING', 'FINAL_ROUND', 'TECH_SCREEN', 'PHONE_SCREEN', 'ONSITE'],
  },
  {
    key: 'offers',
    title: 'Offers',
    color: '#5BD08C',
    statuses: ['OFFER', 'OFFERED', 'ACCEPTED', 'HIRED'],
  },
];

// Empty board derived from the static column config — the starting state
// before real applications load (and when the user has none).
const emptyColumns = () => COLUMNS.map((c) => ({ ...c, count: 0, cards: [] }));

/* ------------------------------------------------------------------ helpers */
const initials = (name) => {
  if (!name) return '?';
  const cleaned = String(name).trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const columnKeyForStatus = (status) => {
  const s = String(status || '').toUpperCase();
  for (const col of COLUMNS) {
    if (col.statuses.includes(s)) return col.key;
  }
  return 'applied'; // sensible default bucket
};

const prettyStatus = (status) => {
  const s = String(status || '').replace(/_/g, ' ').toLowerCase();
  if (!s) return 'Applied';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 36e5;
  if (diffH >= 0 && diffH < 24) {
    const h = Math.max(1, Math.round(diffH));
    return `${h}h ago`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isOfferColumn = (key) => key === 'offers';
const isReviewColumn = (key) => key === 'review';

// Map one backend application record into a board card. The colour fields are
// per-record data (driven by which column the app lands in), so they ride as
// inline style on the card rather than as static utilities.
const toCard = (app, columnKey) => {
  const company =
    app.companyName || app.company || app.job?.company || app.job?.companyName || 'Company';
  const role = app.role || app.title || app.job?.title || app.job?.role || 'Application';
  const offer = isOfferColumn(columnKey);
  const review = isReviewColumn(columnKey);
  const dateRaw =
    app.updatedAt || app.appliedAt || app.createdAt || app.submittedAt || null;

  return {
    id: app.id || app._id || `${company}-${role}`,
    logo: initials(company),
    company,
    role,
    bg: offer ? '#EAF6EE' : '#F4EFE4',
    fg: offer ? '#157A49' : '#1B1A16',
    meta: offer ? '✦ Offer' : prettyStatus(app.status),
    metaColor: offer ? '#0C2C1C' : review ? '#C9622E' : '#5A544A',
    metaBg: offer ? '#9BE3B6' : review ? '#FBEEE5' : '#F1ECE0',
    date: offer ? (app.salary || app.offerAmount || '') : formatDate(dateRaw),
  };
};

/* ----------------------------------------------------------------- skeleton */
function SkeletonColumn({ col }) {
  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col">
      <div className="flex items-center gap-[9px] px-1 pb-3.5">
        {/* col.color is data → inline */}
        <span className="w-[9px] h-[9px] rounded-full" style={{ background: col.color }} />
        <span className="text-sm font-bold">{col.title}</span>
      </div>
      <div className="flex flex-col gap-2.5 bg-jb-soft border border-jb-line rounded-2xl p-2.5 min-h-[160px]">
        {[0, 1].map((i) => (
          <div key={i} className="bg-jb-paper border border-jb-line-2 rounded-[13px] p-3.5">
            <div className="flex items-center gap-[11px] mb-[11px]">
              <span className="w-9 h-9 rounded-[9px] bg-[#EFE9DC] animate-jb-pulse" />
              <div className="flex-1">
                <div className="h-[11px] w-[70%] rounded-md bg-[#EFE9DC] mb-[7px] animate-jb-pulse" />
                <div className="h-[9px] w-[45%] rounded-md bg-[#EFE9DC] animate-jb-pulse" />
              </div>
            </div>
            <div className="h-4 w-[40%] rounded-full bg-[#EFE9DC] animate-jb-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- the page */
export default function AppTracker() {
  const [columns, setColumns] = useState(emptyColumns);
  const [view, setView] = useState('board'); // 'board' | 'list'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyApplications({ limit: 200 });
      const apps = Array.isArray(res?.applications)
        ? res.applications
        : Array.isArray(res)
          ? res
          : [];

      const buckets = COLUMNS.map((c) => ({ ...c, cards: [] }));
      const indexByKey = Object.fromEntries(buckets.map((b, i) => [b.key, i]));

      apps.forEach((app) => {
        const key = columnKeyForStatus(app.status);
        const idx = indexByKey[key] ?? 0;
        buckets[idx].cards.push(toCard(app, key));
      });

      const next = buckets.map((b) => ({ ...b, count: b.cards.length }));
      setColumns(next);
    } catch (err) {
      // Never fall back to fabricated data — surface the error, keep board empty.
      setError(err || new Error('Could not load applications'));
      setColumns(emptyColumns());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Live client-side filter across role + company.
  const filteredColumns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return columns;
    return columns.map((col) => ({
      ...col,
      cards: col.cards.filter((c) =>
        (`${c.role} ${c.company}`).toLowerCase().includes(q)
      ),
    }));
  }, [columns, query]);

  const totalApplied = columns.reduce((sum, c) => sum + (c.count || c.cards.length), 0);
  const activeConversations = (columns.find((c) => c.key === 'interviewing')?.count) ??
    (columns.find((c) => c.key === 'interviewing')?.cards.length ?? 0);

  const flatList = useMemo(
    () =>
      filteredColumns.flatMap((col) =>
        col.cards.map((c) => ({ ...c, columnTitle: col.title, columnColor: col.color }))
      ),
    [filteredColumns]
  );

  const viewBtn = (on) =>
    `font-sans text-[13px] font-semibold cursor-pointer border-none rounded-full px-[15px] py-[7px] ${on ? 'text-jb-green-ink bg-jb-paper shadow-[0_1px_2px_rgba(0,0,0,0.05)]' : 'text-jb-ink-subtle bg-transparent'}`;

  return (
    <>
      <Head>
        <title>Application tracker — Jobocate</title>
      </Head>

      <div className="flex min-h-screen bg-jb-cream font-sans text-jb-ink [&_::-webkit-scrollbar]:w-2 [&_::-webkit-scrollbar]:h-2 [&_::-webkit-scrollbar-thumb]:bg-jb-line-3 [&_::-webkit-scrollbar-thumb]:rounded-lg">
        <AppSidebar active="tracker" />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* HEADER */}
          <header className="sticky top-0 z-20 flex items-center flex-wrap gap-3 px-5 py-[15px] bg-[rgba(247,243,234,0.85)] backdrop-blur-[10px] border-b border-jb-line">
            <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-jb-ink-faint">Workspace / Applications</div>
            <div className="flex-1 min-w-[12px]" />
            {/* flexible width + minWidth:0 so the search box shrinks on narrow
                viewports instead of forcing the header wider than the screen */}
            <div className="flex items-center gap-[9px] bg-jb-paper border border-jb-line-3 rounded-full px-[15px] py-[9px] flex-[1_1_160px] max-w-[260px] min-w-0">
              <span className="text-jb-ink-ghost text-sm">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter applications…"
                aria-label="Filter applications"
                className="flex-1 border-none bg-transparent font-sans text-sm text-jb-ink min-w-0 focus:outline-none"
              />
            </div>
            <div className="flex bg-jb-soft border border-jb-line-3 rounded-full p-[3px]">
              <button onClick={() => setView('board')} className={viewBtn(view === 'board')}>Board</button>
              <button onClick={() => setView('list')} className={viewBtn(view === 'list')}>List</button>
            </div>
          </header>

          {/* TITLE */}
          <div className="px-8 pt-[30px] pb-5 w-full">
            <div className="flex items-end justify-between gap-6 mb-0.5">
              <div>
                <h1 className="font-display font-normal text-[40px] leading-none tracking-[-0.01em] mb-2">Application tracker</h1>
                <p className="text-[15.5px] text-jb-ink-muted m-0">
                  {totalApplied} application{totalApplied === 1 ? '' : 's'} ·{' '}
                  <span className="text-jb-green-text font-semibold">{activeConversations} active conversation{activeConversations === 1 ? '' : 's'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ERROR STATE */}
          {!loading && error && (
            <div className="px-8 pt-3 pb-10 w-full">
              <div className="bg-jb-paper border border-jb-line-2 rounded-2xl">
                <ErrorState error={error} onRetry={loadApplications} />
              </div>
            </div>
          )}

          {/* BOARD VIEW */}
          {!error && view === 'board' && (
            // minWidth:0 lets this flex child shrink below its content width so
            // overflowX:auto actually scrolls the board instead of widening the
            // whole page (horizontal-scroll bug on mobile).
            <div className="flex-1 min-w-0 overflow-x-auto px-8 pt-3 pb-10 [&::-webkit-scrollbar]:h-2.5">
              <div className="flex gap-3.5 min-w-min">
                {loading
                  ? COLUMNS.map((col) => <SkeletonColumn key={col.key} col={col} />)
                  : filteredColumns.map((col) => (
                      <div key={col.key} className="w-[300px] flex-shrink-0 flex flex-col">
                        <div className="flex items-center gap-[9px] px-1 pb-3.5">
                          <span className="w-[9px] h-[9px] rounded-full" style={{ background: col.color }} />
                          <span className="text-sm font-bold">{col.title}</span>
                          <span className="font-mono text-xs text-jb-ink-subtle">{col.count ?? col.cards.length}</span>
                          <div className="flex-1" />
                          <Link href={appRoute('App Matches.dc.html')} title="Add application" className="text-jb-ink-ghost text-[18px] leading-none no-underline">+</Link>
                        </div>
                        <div className="flex flex-col gap-2.5 bg-jb-soft border border-jb-line rounded-2xl p-2.5 min-h-[160px]">
                          {col.cards.length === 0 ? (
                            <div className="px-3 py-[26px] text-center text-[12.5px] text-jb-ink-ghost">
                              {query ? 'No matches here' : 'Nothing yet'}
                            </div>
                          ) : (
                            col.cards.map((c) => (
                              <Link
                                key={c.id}
                                href={appRoute('App Application Detail.dc.html')}
                                className="block bg-jb-paper border border-jb-line-2 rounded-[13px] p-3.5 no-underline text-inherit transition-[border-color,transform] duration-150 hover:border-jb-line-input hover:-translate-y-px"
                              >
                                <div className="flex items-center gap-[11px] mb-[11px]">
                                  <span className="w-9 h-9 flex-shrink-0 rounded-[9px] flex items-center justify-center font-bold text-[13px]" style={{ background: c.bg, color: c.fg }}>{c.logo}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis">{c.role}</div>
                                    <div className="text-xs text-jb-ink-subtle">{c.company}</div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[11px] px-[9px] py-[3px] rounded-full" style={{ color: c.metaColor, background: c.metaBg }}>{c.meta}</span>
                                  {c.date && <span className="text-[11.5px] text-jb-ink-ghost">{c.date}</span>}
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {/* LIST VIEW */}
          {!error && view === 'list' && (
            <div className="flex-1 px-8 pt-3 pb-10 w-full">
              {loading ? (
                <div className="flex flex-col gap-2.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 rounded-[13px] bg-jb-paper border border-jb-line-2 animate-jb-pulse" />
                  ))}
                </div>
              ) : flatList.length === 0 ? (
                <div className="px-5 py-[60px] text-center text-jb-ink-subtle">
                  <div className="font-display text-[26px] text-jb-ink mb-2">Nothing here yet</div>
                  <p className="text-[14.5px] mb-5">
                    {query ? 'No applications match your filter.' : 'Applications you submit will show up in your pipeline.'}
                  </p>
                  <Link href={appRoute('App Matches.dc.html')} className="inline-flex items-center gap-2 bg-jb-green text-jb-green-ink text-[14.5px] font-bold px-[22px] py-3 rounded-full no-underline">Browse matches →</Link>
                </div>
              ) : (
                <div className="bg-jb-paper border border-jb-line-2 rounded-2xl overflow-hidden">
                  {flatList.map((c, i) => (
                    <Link
                      key={c.id}
                      href={appRoute('App Application Detail.dc.html')}
                      className={`flex items-center gap-3.5 px-[18px] py-3.5 no-underline text-inherit ${i < flatList.length - 1 ? 'border-b border-jb-soft-2' : ''}`}
                    >
                      <span className="w-[38px] h-[38px] flex-shrink-0 rounded-[9px] flex items-center justify-center font-bold text-[13px]" style={{ background: c.bg, color: c.fg }}>{c.logo}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[14.5px] whitespace-nowrap overflow-hidden text-ellipsis">{c.role}</div>
                        <div className="text-[12.5px] text-jb-ink-subtle">{c.company}</div>
                      </div>
                      <span className="inline-flex items-center gap-[7px] text-[12.5px] text-jb-ink-muted">
                        <span className="w-2 h-2 rounded-full" style={{ background: c.columnColor }} />
                        {c.columnTitle}
                      </span>
                      <span className="font-mono text-[11px] px-[9px] py-[3px] rounded-full" style={{ color: c.metaColor, background: c.metaBg }}>{c.meta}</span>
                      {c.date && <span className="text-[11.5px] text-jb-ink-ghost w-16 text-right">{c.date}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
