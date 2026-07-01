'use client';

import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ---------------------------------------------------------------- data --- */
// Sample audit events (mirrors the dc Component.events()).
const EVENTS = [
  { actor: 'Autopilot', role: 'AI automation', ai: true, action: 'Advanced', target: 'Sarah Chen → Interview', tcat: 'candidate', when: '2m ago', ip: '—' },
  { actor: 'Dana Whitfield', role: 'Senior Recruiter', action: 'Sent offer to', target: 'Priya Nair', tcat: 'candidate', when: '18m ago', ip: '73.12.8.4' },
  { actor: 'Autopilot', role: 'AI automation', ai: true, action: 'Auto-rejected', target: '8 applicants < 50%', tcat: 'candidate', when: '1h ago', ip: '—' },
  { actor: 'Raj Mehta', role: 'Recruiter', action: 'Moved', target: 'Marcus Obi → Screening', tcat: 'candidate', when: '2h ago', ip: '73.12.8.4' },
  { actor: 'Sourcing Agent', role: 'AI automation', ai: true, action: 'Sent outreach to', target: '6 sourced candidates', tcat: 'candidate', when: '3h ago', ip: '—' },
  { actor: 'Elena Cruz', role: 'Hiring Manager', action: 'Submitted scorecard for', target: 'Jordan Lee', tcat: 'candidate', when: '4h ago', ip: '104.28.9.11' },
  { actor: 'Dana Whitfield', role: 'Senior Recruiter', action: 'Published job', target: 'Senior Product Designer', tcat: 'job', when: '5h ago', ip: '73.12.8.4' },
  { actor: 'Copilot', role: 'AI automation', ai: true, action: 'Generated scorecard for', target: 'Sarah Chen', tcat: 'candidate', when: '6h ago', ip: '—' },
  { actor: 'Tom Baker', role: 'Interviewer', action: 'Viewed profile', target: 'Lena Fischer', tcat: 'candidate', when: '8h ago', ip: '98.207.4.66' },
  { actor: 'Dana Whitfield', role: 'Senior Recruiter', action: 'Invited member', target: 'tom@stripe.com', tcat: 'member', when: 'Yesterday', ip: '73.12.8.4' },
  { actor: 'Autopilot', role: 'AI automation', ai: true, action: 'Scheduled interview for', target: 'Sarah Chen · Mon 2:00 PM', tcat: 'candidate', when: 'Yesterday', ip: '—' },
  { actor: 'Raj Mehta', role: 'Recruiter', action: 'Updated screening rubric on', target: 'Staff Frontend Engineer', tcat: 'job', when: 'Yesterday', ip: '73.12.8.4' },
  { actor: 'Dana Whitfield', role: 'Senior Recruiter', action: 'Connected integration', target: 'Greenhouse', tcat: 'system', when: '2d ago', ip: '73.12.8.4' },
  { actor: 'System', role: 'Security', action: 'Failed login attempt', target: 'unknown device', tcat: 'alert', when: '2d ago', ip: '45.9.12.200' },
  { actor: 'Elena Cruz', role: 'Hiring Manager', action: 'Exported candidate data for', target: 'PM, Growth', tcat: 'job', when: '3d ago', ip: '104.28.9.11' },
];

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

export default function EmployerAuditLog() {
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = EVENTS;
    if (actor === 'ai') list = list.filter((e) => e.ai);
    else if (actor === 'human') list = list.filter((e) => !e.ai && e.actor !== 'System');
    if (q) list = list.filter((e) => (e.actor + ' ' + e.action + ' ' + e.target + ' ' + e.role).toLowerCase().includes(q));
    return list;
  }, [query, actor]);

  const empty = rows.length === 0;

  return (
    <>
      <Head>
        <title>Audit log — Jobocate for Employers</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <button className="audit-export" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}>↧ Export CSV</button>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 1040, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Audit log</h1>
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
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '12px 20px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Actor</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Action</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>When</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'right' }}>IP</span>
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
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap' }}>✦ AI</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#A79E8F' }}>{e.role}</div>
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: '#3A352C' }}>{e.action} </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: targetColor(e.tcat) }}>{e.target}</span>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#8A8378' }}>{e.when}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F', textAlign: 'right' }}>{e.ip}</span>
                  </div>
                );
              })}

              {empty && (
                <div style={{ padding: 40, textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>No events match your filters.</div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F' }}>Showing {rows.length} of 1,284 events</span>
              <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>Load more</button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
