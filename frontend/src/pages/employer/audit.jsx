'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { LoadingState, ErrorState } from '@/components/employer/EmployerStates';
import { appRoute } from '@/components/app/appRoutes';
import { employerAuditApi } from '@/services/employerApi';

/* ---------------------------------------------------------------- data --- */
const FILTERS = [
  { key: 'all', label: 'All activity' },
  { key: 'ai', label: '✦ AI only' },
  { key: 'human', label: 'People only' },
];

function avatarFor(e) {
  if (e.ai) return { bg: '#15140F', color: '#5BD08C', initials: '✦' };
  if (e.actor === 'System') return { bg: '#FBEDE4', color: '#C9622E', initials: '!' };
  const parts = e.actor.split(' ');
  const initials = parts.length > 1 ? parts[0][0] + parts[1][0] : e.actor.slice(0, 2);
  return { bg: '#4263EB', color: '#fff', initials };
}

function targetColor(cat) {
  if (cat === 'alert') return '#C9622E';
  if (cat === 'job' || cat === 'system') return '#364FC7';
  return '#1B1A16';
}

const GRID = '1.4fr 2.2fr 1fr 0.9fr';

// Format an ISO timestamp into a short relative/time string.
function relTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}

export default function EmployerAuditLog() {
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch live audit events. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerAuditApi.list();
      const list = Array.isArray(res?.events) ? res.events : [];
      setEvents(
        list.map((e) => ({
          actor: e.actor,
          role: e.actorRole,
          ai: Boolean(e.ai),
          action: e.action,
          target: e.target,
          tcat: e.category,
          when: relTime(e.createdAt),
          ip: e.ip || '—',
        })),
      );
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

  // Export the currently-visible rows as a real CSV download.
  const exportCsv = () => {
    if (!rows.length) return;
    const header = ['Actor', 'Role', 'AI', 'Action', 'Target', 'When', 'IP'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map((e) =>
      [e.actor, e.role, e.ai ? 'yes' : 'no', e.action, e.target, e.when, e.ip]
        .map(esc)
        .join(','),
    );
    const csv = [header.join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = events;
    if (actor === 'ai') list = list.filter((e) => e.ai);
    else if (actor === 'human') list = list.filter((e) => !e.ai && e.actor !== 'System');
    if (q) list = list.filter((e) => (e.actor + ' ' + e.action + ' ' + e.target + ' ' + e.role).toLowerCase().includes(q));
    return list;
  }, [query, actor, events]);

  const empty = rows.length === 0;

  return (
    <>
      <Head>
        <title>Audit log — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp input:focus,
        #emapp select:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        #emapp .audit-export:hover {
          background: #f4efe4;
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <button onClick={exportCsv} disabled={!rows.length} className="audit-export" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '8px 15px', cursor: rows.length ? 'pointer' : 'not-allowed', opacity: rows.length ? 1 : 0.5 }}>↧ Export CSV</button>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 1040, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Audit log</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                Every action across your workspace, including <span style={{ color: '#157A49', fontWeight: 600 }}>✦ AI</span> automations.
              </p>
            </div>

            {/* FILTERS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '9px 15px', flex: 1, minWidth: 220 }}>
                <span style={{ color: '#A79E8F', fontSize: 13 }}>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search actions, members, targets…"
                  style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {FILTERS.map((f) => {
                  const on = actor === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setActor(f.key)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: on ? '#fff' : '#46413A',
                        background: on ? '#4263EB' : '#FFFEFB',
                        border: `1px solid ${on ? '#4263EB' : '#E1D9C9'}`,
                        borderRadius: 999,
                        padding: '7px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TABLE */}
            {loading ? (
              <LoadingState label="Loading audit log…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 20px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Actor</span>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Action</span>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>When</span>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'right' }}>IP</span>
              </div>

              {rows.map((e, i) => {
                const av = avatarFor(e);
                const divider = i < rows.length - 1 ? '#F2ECE0' : 'transparent';
                return (
                  <div key={`${e.actor}-${e.when}-${i}`} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center', padding: '13px 20px', borderBottom: `1px solid ${divider}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{av.initials}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.actor}</span>
                          {e.ai && (
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap' }}>✦ AI</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#A79E8F' }}>{e.role}</div>
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: '#3A352C' }}>{e.action} </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: targetColor(e.tcat) }}>{e.target}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#8A8378' }}>{e.when}</span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F', textAlign: 'right' }}>{e.ip}</span>
                  </div>
                );
              })}

              {empty && (
                <div style={{ padding: 40, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>
                  {events.length === 0
                    ? 'No activity has been recorded yet.'
                    : 'No events match your filters.'}
                </div>
              )}
            </div>
            )}

            {!loading && !error && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F' }}>
                  Showing {rows.length} of {events.length} event{events.length === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
