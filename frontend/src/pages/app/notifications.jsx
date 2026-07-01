'use client';

import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';

// Sample notification set — mirrors the AppSidebar notification set, expanded
// with grouping/type metadata. No dedicated backend endpoint exists for this
// screen, so this design sample data is the source of truth.
const NOTIF_DATA = [
  { id: 1, type: 'applications', group: 'today', tag: 'St', tint: '#EAF6EE', ink: '#157A49', text: 'Stripe moved you to the final round for Senior Product Designer.', time: '12m ago', href: 'App Application Detail.dc.html', baseUnread: true },
  { id: 2, type: 'auto', group: 'today', tag: 'MB', tint: '#FBEDE4', ink: '#C9622E', text: 'Marcus applied to Airbnb on your behalf.', time: '1h ago', href: 'App Concierge.dc.html', baseUnread: true },
  { id: 3, type: 'matches', group: 'today', tag: 'JM', tint: '#F4EFE4', ink: '#5A544A', text: '12 new matches above 90% are waiting for you.', time: '3h ago', href: 'App Matches.dc.html', baseUnread: true },
  { id: 4, type: 'auto', group: 'today', tag: 'AA', tint: '#E6F6EC', ink: '#157A49', text: 'Auto-Apply sent 6 applications overnight.', time: '8h ago', href: 'App Auto-Apply.dc.html', baseUnread: true },
  { id: 5, type: 'messages', group: 'today', tag: 'MS', tint: '#E6F6EC', ink: '#157A49', text: 'New message from Marcus Bell about your search.', time: '9h ago', href: 'App Messages.dc.html', baseUnread: true },
  { id: 6, type: 'applications', group: 'earlier', tag: 'Fi', tint: '#F4EFE4', ink: '#1B1A16', text: 'Figma viewed your application for Product Designer, Design Systems.', time: 'Yesterday', href: 'App Application Detail.dc.html', baseUnread: false },
  { id: 7, type: 'matches', group: 'earlier', tag: 'JM', tint: '#F4EFE4', ink: '#5A544A', text: 'Your match score with Linear rose to 91%.', time: 'Tue', href: 'App Matches.dc.html', baseUnread: false },
  { id: 8, type: 'applications', group: 'earlier', tag: 'OF', tint: '#EAF6EE', ink: '#157A49', text: 'New offer from Stripe — review the details before it expires.', time: 'Wed', href: 'App Offers.dc.html', baseUnread: false },
];

const TYPE_LABELS = {
  applications: 'Applications',
  matches: 'Matches',
  auto: 'Auto-Apply',
  messages: 'Messages',
};

const FILTER_DEFS = [
  { key: 'all', label: 'All' },
  { key: 'applications', label: 'Applications' },
  { key: 'matches', label: 'Matches' },
  { key: 'auto', label: 'Auto-Apply' },
  { key: 'messages', label: 'Messages' },
];

export default function AppNotifications() {
  const [filter, setFilter] = useState('all');
  const [read, setRead] = useState([]);

  const all = NOTIF_DATA;

  const isUnread = useMemo(
    () => (n) => n.baseUnread && !read.includes(n.id),
    [read]
  );

  const unreadCount = useMemo(
    () => all.filter(isUnread).length,
    [all, isUnread]
  );

  const filters = FILTER_DEFS.map((f) => {
    const on = filter === f.key;
    const cnt = f.key === 'all'
      ? unreadCount
      : all.filter((n) => n.type === f.key && isUnread(n)).length;
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

  const filtered = all.filter((n) => filter === 'all' || n.type === filter);

  const buildGroup = (key, label) => {
    const items = filtered
      .filter((n) => n.group === key)
      .map((n, i, arr) => {
        const u = isUnread(n);
        return {
          ...n,
          unread: u,
          typeLabel: TYPE_LABELS[n.type] || n.type,
          weight: u ? 700 : 500,
          textColor: u ? '#1B1A16' : '#5A544A',
          rowBg: u ? '#FBFCFA' : '#FFFEFB',
          divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
          read: () =>
            setRead((s) => (s.includes(n.id) ? s : s.concat(n.id))),
        };
      });
    return { key, label, items };
  };

  const groups = [
    buildGroup('today', 'Today'),
    buildGroup('earlier', 'Earlier'),
  ].filter((g) => g.items.length > 0);

  const isEmpty = groups.length === 0;

  const hasUnread = unreadCount > 0;
  const markLabel = hasUnread ? 'Mark all read' : 'All caught up';
  const markColor = hasUnread ? '#5A544A' : '#A79E8F';
  const markCursor = hasUnread ? 'pointer' : 'default';
  const markAll = () => {
    if (hasUnread) setRead(all.map((n) => n.id));
  };

  return (
    <>
      <Head>
        <title>Notifications — Jobocate</title>
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
          fontFamily: "'Hanken Grotesk',sans-serif",
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
                fontFamily: "'JetBrains Mono',monospace",
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
                  fontFamily: "'Instrument Serif',serif",
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
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: f.countColor }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* GROUPS */}
            {groups.map((g) => (
              <div key={g.key} style={{ marginBottom: 26 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
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
                          fontFamily: "'JetBrains Mono',monospace",
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
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 10.5,
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
                <p style={{ fontSize: 14.5, color: '#8A8378', margin: 0 }}>No notifications in this filter.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
