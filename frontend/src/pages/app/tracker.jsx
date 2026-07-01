'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
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

/* The design's own sample board — used as graceful fallback whenever the       */
/* backend is unavailable or the user is not authenticated.                     */
const SAMPLE_COLUMNS = [
  {
    key: 'applied',
    title: 'Applied',
    count: 247,
    color: '#1B1A16',
    cards: [
      { id: 's1', logo: 'Re', company: 'Retool', role: 'Frontend Engineer', bg: '#F4EFE4', fg: '#1B1A16', meta: 'Auto-applied', metaColor: '#157A49', metaBg: '#EAF6EE', date: '2h ago' },
      { id: 's2', logo: 'Pl', company: 'Plaid', role: 'Senior PM, Payments', bg: '#F4EFE4', fg: '#1B1A16', meta: 'Applied', metaColor: '#5A544A', metaBg: '#F1ECE0', date: 'Jun 25' },
      { id: 's3', logo: 'Br', company: 'Brex', role: 'Product Designer II', bg: '#F4EFE4', fg: '#1B1A16', meta: 'Applied', metaColor: '#5A544A', metaBg: '#F1ECE0', date: 'Jun 24' },
    ],
  },
  {
    key: 'review',
    title: 'In review',
    count: 52,
    color: '#C9622E',
    cards: [
      { id: 's4', logo: 'No', company: 'Notion', role: 'Design Systems Lead', bg: '#F4EFE4', fg: '#1B1A16', meta: 'Viewed', metaColor: '#C9622E', metaBg: '#FBEEE5', date: 'Jun 23' },
      { id: 's5', logo: 'Va', company: 'Vanta', role: 'Staff Product Designer', bg: '#F4EFE4', fg: '#1B1A16', meta: 'Recruiter screen', metaColor: '#C9622E', metaBg: '#FBEEE5', date: 'Jun 22' },
    ],
  },
  {
    key: 'interviewing',
    title: 'Interviewing',
    count: 18,
    color: '#1FA463',
    cards: [
      { id: 's6', logo: 'St', company: 'Stripe', role: 'Senior Product Designer', bg: '#EAF6EE', fg: '#157A49', meta: 'Final round', metaColor: '#157A49', metaBg: '#EAF6EE', date: 'Jun 29' },
      { id: 's7', logo: 'Fi', company: 'Figma', role: 'Product Manager, Growth', bg: '#F4EFE4', fg: '#1B1A16', meta: 'Round 2', metaColor: '#157A49', metaBg: '#EAF6EE', date: 'Jul 1' },
      { id: 's8', logo: 'Li', company: 'Linear', role: 'Senior Frontend Eng', bg: '#F4EFE4', fg: '#1B1A16', meta: 'Tech screen', metaColor: '#157A49', metaBg: '#EAF6EE', date: 'Jul 2' },
    ],
  },
  {
    key: 'offers',
    title: 'Offers',
    count: 3,
    color: '#5BD08C',
    cards: [
      { id: 's9', logo: 'Ra', company: 'Ramp', role: 'Senior PM, Platform', bg: '#EAF6EE', fg: '#157A49', meta: '✦ Offer', metaColor: '#0C2C1C', metaBg: '#9BE3B6', date: '$225k' },
      { id: 's10', logo: 'He', company: 'Height', role: 'Lead Designer', bg: '#F4EFE4', fg: '#1B1A16', meta: '✦ Offer', metaColor: '#0C2C1C', metaBg: '#9BE3B6', date: '$205k' },
    ],
  },
];

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

// Map one backend application record into a board card.
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
    <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 4px 14px' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>{col.title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F1ECE0', border: '1px solid #E7E0D2', borderRadius: 16, padding: 10, minHeight: 160 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 13, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
              <span style={{ width: 36, height: 36, borderRadius: 9, background: '#EFE9DC' }} className="jb-shimmer" />
              <div style={{ flex: 1 }}>
                <div style={{ height: 11, width: '70%', borderRadius: 6, background: '#EFE9DC', marginBottom: 7 }} className="jb-shimmer" />
                <div style={{ height: 9, width: '45%', borderRadius: 6, background: '#EFE9DC' }} className="jb-shimmer" />
              </div>
            </div>
            <div style={{ height: 16, width: '40%', borderRadius: 999, background: '#EFE9DC' }} className="jb-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- the page */
export default function AppTracker() {
  const [columns, setColumns] = useState(SAMPLE_COLUMNS);
  const [view, setView] = useState('board'); // 'board' | 'list'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(true);
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

      if (!apps.length) {
        // No real data yet — keep the faithful sample board so the screen
        // always renders something meaningful, but mark it as a demo.
        setColumns(SAMPLE_COLUMNS);
        setUsingSample(true);
        return;
      }

      const buckets = COLUMNS.map((c) => ({ ...c, cards: [] }));
      const indexByKey = Object.fromEntries(buckets.map((b, i) => [b.key, i]));

      apps.forEach((app) => {
        const key = columnKeyForStatus(app.status);
        const idx = indexByKey[key] ?? 0;
        buckets[idx].cards.push(toCard(app, key));
      });

      const next = buckets.map((b) => ({ ...b, count: b.cards.length }));
      setColumns(next);
      setUsingSample(false);
    } catch (err) {
      // Graceful fallback to the design's sample data — never crash the screen.
      setError(err?.message || 'Could not load applications');
      setColumns(SAMPLE_COLUMNS);
      setUsingSample(true);
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

  const totalApplied = usingSample ? 247 : columns.reduce((sum, c) => sum + (c.count || c.cards.length), 0);
  const activeConversations = (columns.find((c) => c.key === 'interviewing')?.count) ??
    (columns.find((c) => c.key === 'interviewing')?.cards.length ?? 0);

  const flatList = useMemo(
    () =>
      filteredColumns.flatMap((col) =>
        col.cards.map((c) => ({ ...c, columnTitle: col.title, columnColor: col.color }))
      ),
    [filteredColumns]
  );

  return (
    <>
      <Head>
        <title>Application tracker — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbboard::-webkit-scrollbar {
          height: 10px;
        }
        #jbapp input:focus {
          outline: none;
        }
        .jb-card {
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .jb-card:hover {
          border-color: #d2c9b7 !important;
          transform: translateY(-1px);
        }
        @keyframes jbshimmer {
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
        .jb-shimmer {
          animation: jbshimmer 1.3s ease-in-out infinite;
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="tracker" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Workspace / Applications</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '9px 15px', width: 260 }}>
              <span style={{ color: '#A79E8F', fontSize: 14 }}>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter applications…"
                style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#1B1A16', minWidth: 0 }}
              />
            </div>
            <div style={{ display: 'flex', background: '#F1ECE0', border: '1px solid #E1D9C9', borderRadius: 999, padding: 3 }}>
              <button
                onClick={() => setView('board')}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: 999,
                  padding: '7px 15px',
                  color: view === 'board' ? '#0C2C1C' : '#8A8378',
                  background: view === 'board' ? '#FFFEFB' : 'transparent',
                  boxShadow: view === 'board' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                Board
              </button>
              <button
                onClick={() => setView('list')}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: 999,
                  padding: '7px 15px',
                  color: view === 'list' ? '#0C2C1C' : '#8A8378',
                  background: view === 'list' ? '#FFFEFB' : 'transparent',
                  boxShadow: view === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                List
              </button>
            </div>
          </header>

          {/* TITLE */}
          <div style={{ padding: '30px 32px 20px', maxWidth: 1180, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 2 }}>
              <div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Application tracker</h1>
                <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                  {totalApplied} application{totalApplied === 1 ? '' : 's'} ·{' '}
                  <span style={{ color: '#157A49', fontWeight: 600 }}>{activeConversations} active conversation{activeConversations === 1 ? '' : 's'}</span>
                </p>
              </div>
            </div>

            {/* graceful, non-blocking notice when running on sample data */}
            {!loading && usingSample && (
              <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: '#8A6A33', background: '#FBF1DF', border: '1px solid #EBD9B5', borderRadius: 999, padding: '6px 13px' }}>
                <span>●</span>
                <span>{error ? `Showing sample board — ${error}` : 'Showing a sample board. Connect your account to see live applications.'}</span>
              </div>
            )}
          </div>

          {/* BOARD VIEW */}
          {view === 'board' && (
            <div id="jbboard" style={{ flex: 1, overflowX: 'auto', padding: '12px 32px 40px' }}>
              <div style={{ display: 'flex', gap: 14, minWidth: 'min-content' }}>
                {loading
                  ? COLUMNS.map((col) => <SkeletonColumn key={col.key} col={col} />)
                  : filteredColumns.map((col) => (
                      <div key={col.key} style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 4px 14px' }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.color }} />
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{col.title}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>{col.count ?? col.cards.length}</span>
                          <div style={{ flex: 1 }} />
                          <Link href={appRoute('App Matches.dc.html')} title="Add application" style={{ color: '#A79E8F', fontSize: 18, lineHeight: 1, textDecoration: 'none' }}>+</Link>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F1ECE0', border: '1px solid #E7E0D2', borderRadius: 16, padding: 10, minHeight: 160 }}>
                          {col.cards.length === 0 ? (
                            <div style={{ padding: '26px 12px', textAlign: 'center', fontSize: 12.5, color: '#A79E8F' }}>
                              {query ? 'No matches here' : 'Nothing yet'}
                            </div>
                          ) : (
                            col.cards.map((c) => (
                              <Link
                                key={c.id}
                                href={appRoute('App Application Detail.dc.html')}
                                className="jb-card"
                                style={{ display: 'block', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 13, padding: 14, textDecoration: 'none', color: 'inherit' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 11 }}>
                                  <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{c.logo}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role}</div>
                                    <div style={{ fontSize: 12, color: '#8A8378' }}>{c.company}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: c.metaColor, background: c.metaBg, padding: '3px 9px', borderRadius: 999 }}>{c.meta}</span>
                                  {c.date && <span style={{ fontSize: 11.5, color: '#A79E8F' }}>{c.date}</span>}
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
          {view === 'list' && (
            <div style={{ flex: 1, padding: '12px 32px 40px', maxWidth: 1180, width: '100%' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ height: 64, borderRadius: 13, background: '#FFFEFB', border: '1px solid #E6DECF' }} className="jb-shimmer" />
                  ))}
                </div>
              ) : flatList.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8A8378' }}>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, color: '#1B1A16', marginBottom: 8 }}>Nothing here yet</div>
                  <p style={{ fontSize: 14.5, margin: '0 0 20px' }}>
                    {query ? 'No applications match your filter.' : 'Applications you submit will show up in your pipeline.'}
                  </p>
                  <Link href={appRoute('App Matches.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1FA463', color: '#0C2C1C', fontSize: 14.5, fontWeight: 700, padding: '12px 22px', borderRadius: 999, textDecoration: 'none' }}>Browse matches →</Link>
                </div>
              ) : (
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                  {flatList.map((c, i) => (
                    <Link
                      key={c.id}
                      href={appRoute('App Application Detail.dc.html')}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < flatList.length - 1 ? '1px solid #F2ECE0' : 'none', textDecoration: 'none', color: 'inherit' }}
                    >
                      <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 9, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{c.logo}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role}</div>
                        <div style={{ fontSize: 12.5, color: '#8A8378' }}>{c.company}</div>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#5A544A' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.columnColor }} />
                        {c.columnTitle}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: c.metaColor, background: c.metaBg, padding: '3px 9px', borderRadius: 999 }}>{c.meta}</span>
                      {c.date && <span style={{ fontSize: 11.5, color: '#A79E8F', width: 64, textAlign: 'right' }}>{c.date}</span>}
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
