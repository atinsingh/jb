'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { employerNotificationsApi } from '@/services/employerApi';

/* ----------------------------------------------------------------- data --- */
const TYPE_LABELS = { applicants: 'Applicants', interviews: 'Interviews', offers: 'Offers', ai: 'AI agents' };
const typeLabel = (t) => TYPE_LABELS[t] || t;

// Per-type tint/ink (mirrors the design's row swatches) for live notifications.
const TYPE_SWATCH = {
  ai: { tint: '#15140F', ink: '#5BD08C' },
  applicants: { tint: '#EAF6EE', ink: '#157A49' },
  interviews: { tint: '#EDF0FE', ink: '#4263EB' },
  offers: { tint: '#EAF6EE', ink: '#157A49' },
};
const swatch = (t) => TYPE_SWATCH[t] || { tint: '#EDF0FE', ink: '#4263EB' };

const timeAgo = (createdAt) => {
  const then = new Date(createdAt).getTime();
  if (!then) return '';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
};

const FILTER_DEFS = [
  { key: 'all', label: 'All' },
  { key: 'applicants', label: 'Applicants' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'offers', label: 'Offers' },
  { key: 'ai', label: '✦ AI' },
];

const GROUP_DEFS = [
  { key: 'today', label: 'Today' },
  { key: 'earlier', label: 'Earlier' },
];

/* ----------------------------------------------------------- component --- */
export default function EmployerNotifications() {
  // dc state = { filter: 'all', read: [] }
  const [filter, setFilter] = useState('all');
  const [read, setRead] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch live notifications. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerNotificationsApi.list();
      const list = Array.isArray(res?.notifications) ? res.notifications : [];
      const readIds = [];
      const mapped = list.map((n, i) => {
        const sw = swatch(n.type);
        const id = n._id || i + 1;
        if (n.read) readIds.push(id);
        return {
          id,
          type: n.type,
          group: n.group || 'today',
          tag: n.tag,
          tint: sw.tint,
          ink: sw.ink,
          text: n.text,
          time: timeAgo(n.createdAt),
          href: n.href,
          ai: !!n.ai,
          baseUnread: true,
        };
      });
      setNotifs(mapped);
      setRead(readIds);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = (id) => {
    setRead((r) => (r.includes(id) ? r : r.concat(id)));
    // Reflect real failure: revert the optimistic read if the write fails.
    employerNotificationsApi.markRead(id).catch(() => {
      setRead((r) => r.filter((x) => x !== id));
    });
  };

  // dc renderVals() derived state
  const {
    unreadCount,
    markLabel,
    markColor,
    markCursor,
    filters,
    groups,
    isEmpty,
  } = useMemo(() => {
    const all = notifs;
    const isUnread = (n) => n.baseUnread && !read.includes(n.id);
    const unread = all.filter(isUnread).length;

    const builtFilters = FILTER_DEFS.map((f) => {
      const on = filter === f.key;
      const cnt = f.key === 'all' ? unread : all.filter((n) => n.type === f.key && isUnread(n)).length;
      return {
        key: f.key,
        label: f.label,
        color: on ? '#fff' : '#46413A',
        bg: on ? '#4263EB' : '#FFFEFB',
        border: on ? '#4263EB' : '#E1D9C9',
        showCount: cnt > 0,
        count: cnt,
        countColor: on ? 'rgba(255,255,255,0.7)' : '#A79E8F',
      };
    });

    const filtered = all.filter((n) => filter === 'all' || n.type === filter);
    const buildGroup = (key, label) => {
      const items = filtered
        .filter((n) => n.group === key)
        .map((n, i, arr) => {
          const u = isUnread(n);
          return {
            ...n,
            unread: u,
            isAI: n.ai,
            typeLabel: typeLabel(n.type),
            weight: u ? 700 : 500,
            textColor: u ? '#1B1A16' : '#5A544A',
            rowBg: u ? '#FBFCFE' : '#FFFEFB',
            divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
          };
        });
      return { label, items };
    };
    const builtGroups = GROUP_DEFS.map((g) => buildGroup(g.key, g.label)).filter((g) => g.items.length > 0);

    return {
      unreadCount: unread,
      markLabel: unread > 0 ? 'Mark all read' : 'All caught up',
      markColor: unread > 0 ? '#5A544A' : '#A79E8F',
      markCursor: unread > 0 ? 'pointer' : 'default',
      filters: builtFilters,
      groups: builtGroups,
      isEmpty: builtGroups.length === 0,
    };
  }, [filter, read, notifs]);

  const markAll = () => {
    if (unreadCount <= 0) return;
    const prev = read;
    setRead(notifs.map((n) => n.id));
    // Reflect real failure: restore prior read state if the write fails.
    employerNotificationsApi.markAllRead().catch(() => setRead(prev));
  };

  return (
    <>
      <Head>
        <title>Notifications — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp * {
          box-sizing: border-box;
        }
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp .em-notif:hover {
          background: #f7f3ea !important;
        }
        #emapp .em-markall:hover {
          color: #364fc7 !important;
        }
      `}</style>

      <div
        id="emapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <EmployerSidebar active="" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
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
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              Workspace / Notifications
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={markAll}
              className="em-markall"
              style={{
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                color: markColor,
                background: 'none',
                border: 'none',
                cursor: markCursor,
              }}
            >
              {markLabel}
            </button>
          </header>

          <div style={{ padding: '30px 32px 56px', maxWidth: 780, width: '100%', margin: '0 auto' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 20 }}>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  margin: '0 0 8px',
                }}
              >
                Notifications
              </h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                <b style={{ color: '#1B1A16' }}>{unreadCount} unread</b> · activity across your reqs and AI agents.
              </p>
            </div>

            {/* FILTERS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: f.color,
                    background: f.bg,
                    border: `1px solid ${f.border}`,
                    borderRadius: 999,
                    padding: '8px 15px',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                  {f.showCount && (
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: f.countColor }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* GROUPS */}
            {loading ? (
              <LoadingState label="Loading notifications…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
            <>
            {groups.map((g) => (
              <div key={g.label} style={{ marginBottom: 26 }}>
                <div
                  style={{
                    fontFamily: 'var(--jb-font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#9A9286',
                    marginBottom: 11,
                  }}
                >
                  {g.label}
                </div>
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                  {g.items.map((n) => (
                    <Link
                      key={n.id}
                      href={appRoute(n.href)}
                      onClick={() => markRead(n.id)}
                      className="em-notif"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '16px 18px',
                        borderBottom: `1px solid ${n.divider}`,
                        background: n.rowBg,
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          borderRadius: 11,
                          background: n.tint,
                          color: n.ink,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--jb-font-mono)',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {n.tag}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: n.weight, lineHeight: 1.45, color: n.textColor }}>
                            {n.text}
                          </span>
                          {n.isAI && (
                            <span
                              style={{
                                fontFamily: 'var(--jb-font-mono)',
                                fontSize: 11,
                                fontWeight: 600,
                                letterSpacing: '0.04em',
                                color: '#157A49',
                                background: '#EAF6EE',
                                border: '1px solid #CDE9D6',
                                padding: '2px 6px',
                                borderRadius: 999,
                              }}
                            >
                              ✦ AI
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 11,
                            color: '#A79E8F',
                            marginTop: 3,
                          }}
                        >
                          {n.time} · {n.typeLabel}
                        </div>
                      </div>
                      {n.unread && (
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: '#4263EB',
                          }}
                        />
                      )}
                      <span style={{ color: '#C9BFAC', fontSize: 15, flexShrink: 0 }}>→</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* EMPTY */}
            {isEmpty && (
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px dashed #D2C9B7',
                  borderRadius: 16,
                  padding: 48,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 14.5, color: '#8A8378', margin: 0 }}>
                  {notifs.length === 0 ? "You're all caught up. No notifications yet." : 'No notifications in this filter.'}
                </p>
              </div>
            )}
            </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
