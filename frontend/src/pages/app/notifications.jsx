'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { notificationsApi } from '@/services/notificationsApi';

// Presentation metadata per candidate notification `type`. The backend stores
// the substance (type/text/href/tag/read/createdAt/group); the visual accent
// for each type lives here on the client.
const TYPE_META = {
  applications: { label: 'Applications', tint: '#EAF6EE', ink: '#157A49' },
  auto: { label: 'Auto-Apply', tint: '#FBEDE4', ink: '#C9622E' },
  matches: { label: 'Matches', tint: '#F4EFE4', ink: '#5A544A' },
  messages: { label: 'Messages', tint: '#E6F6EC', ink: '#157A49' },
};

const FILTER_DEFS = [
  { key: 'all', label: 'All' },
  { key: 'applications', label: 'Applications' },
  { key: 'matches', label: 'Matches' },
  { key: 'auto', label: 'Auto-Apply' },
  { key: 'messages', label: 'Messages' },
];

const GROUP_ORDER = [
  { key: 'today', label: 'Today' },
  { key: 'earlier', label: 'Earlier' },
];

// Compact relative-time formatter from an ISO timestamp.
const relTime = (iso) => {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const initials = (n) => {
  if (n.tag) return n.tag;
  const src = (n.text || n.type || '?').trim();
  return src.slice(0, 2).toUpperCase();
};

export default function AppNotifications() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsApi.list();
      setItems(Array.isArray(res.notifications) ? res.notifications : []);
    } catch (e) {
      setError(e.message || 'Could not load notifications.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const idOf = (n) => n._id || n.id;

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const filters = FILTER_DEFS.map((f) => {
    const on = filter === f.key;
    const cnt =
      f.key === 'all'
        ? unreadCount
        : items.filter((n) => n.type === f.key && !n.read).length;
    return {
      key: f.key,
      label: f.label,
      color: on ? '#0C2C1C' : '#46413A',
      bg: on ? '#1FA463' : '#FFFEFB',
      border: on ? '#1FA463' : '#E1D9C9',
      showCount: cnt > 0,
      count: cnt,
      countColor: on ? '#0C2C1C' : '#A79E8F',
      pick: () => setFilter(f.key),
    };
  });

  const markRow = async (n) => {
    if (n.read) return;
    const id = idOf(n);
    setItems((s) => s.map((x) => (idOf(x) === id ? { ...x, read: true } : x)));
    try {
      await notificationsApi.markRead(id);
    } catch {
      // optimistic; a failed write self-heals on next load
    }
  };

  const filtered = items.filter(
    (n) => filter === 'all' || n.type === filter
  );

  const buildGroup = (key, label) => {
    const rows = filtered.filter((n) => (n.group || 'today') === key);
    const groupItems = rows.map((n, i, arr) => {
      const meta = TYPE_META[n.type] || { label: n.type, tint: '#F4EFE4', ink: '#5A544A' };
      const unread = !n.read;
      return {
        id: idOf(n),
        text: n.text,
        href: n.href,
        tag: initials(n),
        tint: meta.tint,
        ink: meta.ink,
        typeLabel: meta.label,
        time: relTime(n.createdAt),
        unread,
        weight: unread ? 700 : 500,
        textColor: unread ? '#1B1A16' : '#5A544A',
        rowBg: unread ? '#FBFCFA' : '#FFFEFB',
        divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
        read: () => markRow(n),
      };
    });
    return { key, label, items: groupItems };
  };

  // Known groups in order, plus any unexpected group keys appended.
  const knownKeys = GROUP_ORDER.map((g) => g.key);
  const extraKeys = Array.from(
    new Set(filtered.map((n) => n.group || 'today'))
  ).filter((k) => !knownKeys.includes(k));

  const groups = [
    ...GROUP_ORDER.map((g) => buildGroup(g.key, g.label)),
    ...extraKeys.map((k) => buildGroup(k, k.charAt(0).toUpperCase() + k.slice(1))),
  ].filter((g) => g.items.length > 0);

  const isEmpty = !loading && !error && groups.length === 0;

  const hasUnread = unreadCount > 0;
  const markLabel = hasUnread ? 'Mark all read' : 'All caught up';
  const markColor = hasUnread ? '#5A544A' : '#A79E8F';
  const markCursor = hasUnread ? 'pointer' : 'default';
  const markAll = async () => {
    if (!hasUnread) return;
    setItems((s) => s.map((x) => ({ ...x, read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      // optimistic
    }
  };

  return (
    <>
      <Head>
        <title>Notifications — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp .jb-mark:hover {
          color: #157a49 !important;
        }
        #jbapp .jb-notif-row:hover {
          background: #f7f3ea !important;
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="" />

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
              className="jb-mark"
              onClick={markAll}
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
                <b style={{ color: '#1B1A16' }}>{unreadCount} unread</b> · everything your copilot did while you were away.
              </p>
            </div>

            {/* FILTER ROW */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={f.pick}
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

            {/* LOADING */}
            {loading && (
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 16,
                  padding: 48,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 14.5, color: '#8A8378', margin: 0 }}>Loading notifications…</p>
              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6CFCF',
                  borderRadius: 16,
                  padding: 32,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 14.5, color: '#B4463C', margin: '0 0 14px' }}>{error}</p>
                <button
                  type="button"
                  onClick={load}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0C2C1C',
                    background: '#1FA463',
                    border: '1px solid #1FA463',
                    borderRadius: 999,
                    padding: '8px 18px',
                    cursor: 'pointer',
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {/* GROUPS */}
            {!loading && !error && groups.map((g) => (
              <div key={g.key} style={{ marginBottom: 26 }}>
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
                      onClick={n.read}
                      className="jb-notif-row"
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
                        <div style={{ fontSize: 14, fontWeight: n.weight, lineHeight: 1.45, color: n.textColor }}>
                          {n.text}
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
                        <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: '50%', background: '#1FA463' }} />
                      )}
                      <span style={{ color: '#C9BFAC', fontSize: 15, flexShrink: 0 }}>→</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

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
                  {filter === 'all'
                    ? "You're all caught up — no notifications yet."
                    : 'No notifications in this filter.'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
