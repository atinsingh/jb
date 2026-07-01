'use client';

import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ----------------------------------------------------------------- data --- */
// Ported from the dc Component.notifData() sample. No backend yet → render
// the design's own sample notifications.
const NOTIF_DATA = [
  { id: 1, type: 'applicants', group: 'today', tag: 'SC', tint: '#EAF6EE', ink: '#157A49', text: 'Sarah Chen applied to Senior Product Designer — 96% match.', time: '12m ago', href: 'Employer Candidate.dc.html', ai: false, baseUnread: true },
  { id: 2, type: 'ai', group: 'today', tag: '✦', tint: '#15140F', ink: '#5BD08C', text: 'Autopilot advanced 6 applicants and queued 4 actions for review.', time: '1h ago', href: 'Employer Autopilot.dc.html', ai: true, baseUnread: true },
  { id: 3, type: 'interviews', group: 'today', tag: 'IV', tint: '#EDF0FE', ink: '#4263EB', text: 'Jordan Lee confirmed his 11:00 AM onsite interview.', time: '2h ago', href: 'Employer Interviews.dc.html', ai: false, baseUnread: true },
  { id: 4, type: 'ai', group: 'today', tag: '✦', tint: '#15140F', ink: '#5BD08C', text: 'Sourcing Agent found 14 new candidates for PM, Growth.', time: '4h ago', href: 'Employer Sourcing Agent.dc.html', ai: true, baseUnread: true },
  { id: 5, type: 'offers', group: 'today', tag: 'OF', tint: '#EAF6EE', ink: '#157A49', text: 'Priya Nair accepted your offer for Staff Frontend Engineer. 🎉', time: '6h ago', href: 'Employer Offers.dc.html', ai: false, baseUnread: true },
  { id: 6, type: 'applicants', group: 'earlier', tag: '12', tint: '#EDF0FE', ink: '#4263EB', text: '12 new applicants across your 3 open reqs.', time: 'Yesterday', href: 'Employer Candidates.dc.html', ai: false, baseUnread: false },
  { id: 7, type: 'interviews', group: 'earlier', tag: 'IV', tint: '#EDF0FE', ink: '#4263EB', text: 'Reminder: Sarah Chen final round Mon Jun 29, 2:00 PM.', time: 'Yesterday', href: 'Employer Interviews.dc.html', ai: false, baseUnread: false },
  { id: 8, type: 'ai', group: 'earlier', tag: '✦', tint: '#15140F', ink: '#5BD08C', text: 'Copilot generated a scorecard for Sarah Chen — Strong hire.', time: 'Tue', href: 'Employer AI Interview.dc.html', ai: true, baseUnread: false },
  { id: 9, type: 'offers', group: 'earlier', tag: 'AP', tint: '#FBF1E2', ink: '#9A6A2E', text: 'Your Senior Data Scientist req is awaiting your approval.', time: 'Tue', href: 'Employer Req Approval.dc.html', ai: false, baseUnread: false },
];

const TYPE_LABELS = { applicants: 'Applicants', interviews: 'Interviews', offers: 'Offers', ai: 'AI agents' };
const typeLabel = (t) => TYPE_LABELS[t] || t;

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

  const markRead = (id) =>
    setRead((r) => (r.includes(id) ? r : r.concat(id)));

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
    const all = NOTIF_DATA;
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
  }, [filter, read]);

  const markAll = () => {
    if (unreadCount > 0) setRead(NOTIF_DATA.map((n) => n.id));
  };

  return (
    <>
      <Head>
        <title>Notifications — Jobocate for Employers</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
          fontFamily: "'Hanken Grotesk',sans-serif",
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
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: f.countColor }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* GROUPS */}
            {groups.map((g) => (
              <div key={g.label} style={{ marginBottom: 26 }}>
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
                          fontFamily: "'JetBrains Mono',monospace",
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
                                fontFamily: "'JetBrains Mono',monospace",
                                fontSize: 8.5,
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
                <p style={{ fontSize: 14.5, color: '#8A8378', margin: 0 }}>No notifications in this filter.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
