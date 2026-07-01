'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ----------------------------------------------------------- sample data --- */
// Mirrors the dc Component.reqData() sample approval workflow.
const REQ_DATA = {
  req1: {
    title: 'Senior Data Scientist',
    team: 'Data · Risk',
    location: 'Remote (US)',
    type: 'Full-time',
    level: 'Senior',
    requester: 'Elena Cruz',
    reqInitials: 'EC',
    reqAccent: 'indigo',
    fields: [
      { label: 'Headcount', value: '1' },
      { label: 'Budget', value: '$185–220k' },
      { label: 'Start by', value: 'Q3 2026' },
    ],
    chain: [
      { name: 'Elena Cruz', role: 'Hiring Manager · requester', state: 'done', note: 'Backfill for a departing IC; critical for the risk-model roadmap.' },
      { name: 'Dana Whitfield', role: 'Senior Recruiter', state: 'current' },
      { name: 'Priya Shah', role: 'Finance / HR', state: 'pending' },
    ],
  },
  req2: {
    title: 'Product Marketing Manager',
    team: 'Marketing',
    location: 'New York · Hybrid',
    type: 'Full-time',
    level: 'Mid–Senior',
    requester: 'Tom Baker',
    reqInitials: 'TB',
    reqAccent: 'indigo',
    fields: [
      { label: 'Headcount', value: '1' },
      { label: 'Budget', value: '$140–165k' },
      { label: 'Start by', value: 'Q4 2026' },
    ],
    chain: [
      { name: 'Tom Baker', role: 'Hiring Manager · requester', state: 'done', note: 'New role to support the Q4 launch; not a backfill.' },
      { name: 'Dana Whitfield', role: 'Senior Recruiter', state: 'current' },
      { name: 'Priya Shah', role: 'Finance / HR', state: 'pending' },
    ],
  },
};

const avatarStyle = (a) => (a === 'green' ? { bg: '#1FA463', color: '#0C2C1C' } : { bg: '#4263EB', color: '#fff' });

const statusFor = (decision) => {
  if (decision === 'approve') return { label: 'APPROVED', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  if (decision === 'reject') return { label: 'REJECTED', color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4' };
  if (decision === 'changes') return { label: 'CHANGES REQ.', color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };
  return { label: 'AWAITING YOU', color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' };
};

const stepStyle = (state) => {
  if (state === 'done') return { dotBg: '#1FA463', dotBorder: '#1FA463', iconColor: '#fff', icon: '✓', badge: 'APPROVED', badgeColor: '#157A49', badgeBg: '#EAF6EE', badgeBorder: '#CDE9D6', lineColor: '#1FA463' };
  if (state === 'current') return { dotBg: '#EDF0FE', dotBorder: '#4263EB', iconColor: '#4263EB', icon: '●', badge: 'YOU · PENDING', badgeColor: '#4263EB', badgeBg: '#EDF0FE', badgeBorder: '#C7D2FB', lineColor: '#E1D9C9' };
  return { dotBg: '#FFFEFB', dotBorder: '#D2C9B7', iconColor: '#C9BFAC', icon: '○', badge: 'WAITING', badgeColor: '#A79E8F', badgeBg: '#F2ECE0', badgeBorder: '#E6DECF', lineColor: '#E1D9C9' };
};

const DECIDED_MAP = {
  approve: { text: 'You approved this req. It’s now with Finance / HR.', bg: '#EAF6EE', border: '#CDE9D6', iconBg: '#1FA463', iconColor: '#0C2C1C', icon: '✓', textColor: '#1F4733' },
  changes: { text: 'You requested changes. Sent back to the requester.', bg: '#FBF1E2', border: '#EAD9BE', iconBg: '#D89A3E', iconColor: '#fff', icon: '↩', textColor: '#7A4326' },
  reject: { text: 'You rejected this req. The requester has been notified.', bg: '#FBEDE4', border: '#EAD0C4', iconBg: '#C9622E', iconColor: '#fff', icon: '✕', textColor: '#7A4326' },
};

/* ----------------------------------------------------------- component --- */
export default function EmployerApprovals() {
  const [selected, setSelected] = useState('req1');
  const [note, setNote] = useState('');
  const [decisions, setDecisions] = useState({});

  const keys = Object.keys(REQ_DATA);

  const inbox = keys.map((k) => {
    const r = REQ_DATA[k];
    const on = selected === k;
    const ss = statusFor(decisions[k]);
    const av = avatarStyle(r.reqAccent);
    return {
      key: k,
      title: r.title,
      team: r.team,
      location: r.location,
      requester: r.requester,
      reqInitials: r.reqInitials,
      reqAvatarBg: av.bg,
      reqAvatarColor: av.color,
      statusLabel: ss.label,
      statusColor: ss.color,
      statusBg: ss.bg,
      statusBorder: ss.border,
      border: on ? '#4263EB' : '#E6DECF',
      ring: on ? '0 0 0 3px rgba(66,99,235,0.16)' : 'none',
    };
  });

  const sel = REQ_DATA[selected];
  const decision = decisions[selected];
  const ss = statusFor(decision);

  const chain = sel.chain.map((c, i, arr) => {
    let state = c.state;
    if (c.state === 'current' && decision) state = decision === 'approve' ? 'done' : 'current';
    const ssx = stepStyle(state);
    const youDecided = c.state === 'current' && decision;
    return {
      name: c.name,
      role: c.role,
      icon: ssx.icon,
      dotBg: ssx.dotBg,
      dotBorder: ssx.dotBorder,
      iconColor: ssx.iconColor,
      lineColor: ssx.lineColor,
      badge: youDecided ? ss.label : ssx.badge,
      badgeColor: youDecided ? ss.color : ssx.badgeColor,
      badgeBg: youDecided ? ss.bg : ssx.badgeBg,
      badgeBorder: youDecided ? ss.border : ssx.badgeBorder,
      connector: i < arr.length - 1,
      hasNote: !!c.note,
      note: c.note || '',
    };
  });

  const dec = decision ? DECIDED_MAP[decision] : null;

  const selectReq = (k) => {
    setSelected(k);
    setNote('');
  };
  const setDecision = (d) => setDecisions((s) => ({ ...s, [selected]: d }));

  const awaitingCount = keys.filter((k) => !decisions[k]).length;

  return (
    <>
      <Head>
        <title>Req approvals — Jobocate</title>
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
        #emapp textarea:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        #emapp .em-inbox-btn:hover {
          border-color: #4263eb !important;
        }
        #emapp .em-approve:hover {
          background: #1b9159 !important;
        }
        @keyframes emrise {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="jobs" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Jobs.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to jobs</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>Requisition approvals</span>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1040, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 18 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Req approvals</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>
                <b style={{ color: '#1B1A16' }}>{awaitingCount} awaiting your approval</b> · sign off before a role can be posted.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* INBOX */}
              <div style={{ width: 300, flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12 }}>Approval inbox</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {inbox.map((r) => (
                    <button
                      key={r.key}
                      className="em-inbox-btn"
                      onClick={() => selectReq(r.key)}
                      style={{ textAlign: 'left', background: '#FFFEFB', border: `1.5px solid ${r.border}`, boxShadow: r.ring, borderRadius: 14, padding: 15, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16', flex: 1, minWidth: 0 }}>{r.title}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, fontWeight: 600, letterSpacing: '0.03em', color: r.statusColor, background: r.statusBg, border: `1px solid ${r.statusBorder}`, padding: '2px 7px', borderRadius: 999 }}>{r.statusLabel}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8A8378', marginBottom: 8 }}>{r.team} · {r.location}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', background: r.reqAvatarBg, color: r.reqAvatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9.5 }}>{r.reqInitials}</span>
                        <span style={{ fontSize: 11.5, color: '#8A8378' }}>Requested by {r.requester}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* DETAIL */}
              <div key={selected} style={{ flex: 1, minWidth: 0, animation: 'emrise 0.2s ease' }}>
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 26 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 6 }}>{sel.team}</div>
                      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>{sel.title}</h2>
                      <div style={{ fontSize: 13.5, color: '#8A8378' }}>{sel.location} · {sel.type} · {sel.level}</div>
                    </div>
                    <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`, padding: '5px 11px', borderRadius: 999 }}>{ss.label}</span>
                  </div>

                  {/* HEADCOUNT / BUDGET */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                    {sel.fields.map((f) => (
                      <div key={f.label} style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, padding: 14 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 6 }}>{f.label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 600, color: '#1B1A16' }}>{f.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* APPROVAL CHAIN */}
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 14 }}>Approval chain</div>
                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
                    {chain.map((c, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ width: 30, height: 30, borderRadius: '50%', background: c.dotBg, border: `2px solid ${c.dotBorder}`, color: c.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{c.icon}</span>
                          {c.connector && <span style={{ width: 2, flex: 1, minHeight: 22, background: c.lineColor }} />}
                        </div>
                        <div style={{ paddingBottom: 20, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{c.name}</span>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', color: c.badgeColor, background: c.badgeBg, border: `1px solid ${c.badgeBorder}`, padding: '2px 7px', borderRadius: 999 }}>{c.badge}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: '#8A8378' }}>{c.role}</div>
                          {c.hasNote && <div style={{ fontSize: 12.5, color: '#5A544A', marginTop: 6, padding: '9px 12px', background: '#FBF9F4', border: '1px solid #EFE8DA', borderRadius: 9 }}>{c.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* YOUR ACTION */}
                  {!decision && (
                    <div style={{ paddingTop: 20, borderTop: '1px solid #F2ECE0' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Your decision</div>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add an optional note for the requester…"
                        style={{ width: '100%', minHeight: 72, fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 12, padding: 13, resize: 'vertical', marginBottom: 14 }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="em-approve" onClick={() => setDecision('approve')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '12px 22px', cursor: 'pointer' }}>✓ Approve</button>
                        <button onClick={() => setDecision('changes')} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#9A6A2E', background: '#FBF1E2', border: '1px solid #EAD9BE', borderRadius: 999, padding: '12px 18px', cursor: 'pointer' }}>Request changes</button>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => setDecision('reject')} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#C9622E', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 8px' }}>Reject</button>
                      </div>
                    </div>
                  )}

                  {decision && dec && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 16, background: dec.bg, border: `1px solid ${dec.border}`, borderRadius: 13 }}>
                      <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: dec.iconBg, color: dec.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{dec.icon}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: dec.textColor }}>{dec.text}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
