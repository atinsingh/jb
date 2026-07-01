'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ----------------------------------------------------------- EEO funnel --- */
const STAGE_COLORS = ['#5C7CEF', '#4263EB', '#364FC7', '#1FA463'];
const STAGE_NAMES = ['Applied', 'Screened', 'Interviewed', 'Hired/Offer'];

const mkRow = (label, vals) => ({
  label,
  segs: vals.map((v, i) => ({
    stage: STAGE_NAMES[i],
    width: v + '%',
    color: STAGE_COLORS[i],
    label: v >= 12 ? v + '%' : '',
  })),
});

const EEO_GROUPS = [
  {
    label: 'Gender',
    rows: [
      mkRow('Women', [44, 41, 38, 40]),
      mkRow('Men', [52, 55, 58, 60]),
      mkRow('Non-binary / undisclosed', [4, 4, 4, 0]),
    ],
  },
  {
    label: 'Race / ethnicity (US)',
    rows: [
      mkRow('Underrepresented', [38, 35, 33, 40]),
      mkRow('Non-underrepresented', [54, 57, 59, 60]),
      mkRow('Undisclosed', [8, 8, 8, 0]),
    ],
  },
];

const STAGE_LEGEND = STAGE_NAMES.map((label, i) => ({ label, color: STAGE_COLORS[i] }));

/* ----------------------------------------------------------- requests --- */
const typeStyle = (t) =>
  t === 'Delete'
    ? { color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4', icon: '⌫', iconBg: '#FBEDE4', iconColor: '#C9622E', actBg: '#C9622E' }
    : { color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB', icon: '↧', iconBg: '#EDF0FE', iconColor: '#4263EB', actBg: '#4263EB' };

const statusStyle = (k) => {
  if (k === 'done') return { label: 'COMPLETED', color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6' };
  if (k === 'progress') return { label: 'IN PROGRESS', color: '#4263EB', bg: '#EDF0FE', border: '#C7D2FB' };
  return { label: 'PENDING', color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE' };
};

const REQ_RAW = [
  { id: 'r1', name: 'Anonymous candidate #4821', type: 'Delete', detail: 'Right to erasure (GDPR Art. 17)', requested: 'Jun 24', statusKey: 'pending' },
  { id: 'r2', name: 'Daniel Okafor', type: 'Export', detail: 'Data access request (CCPA)', requested: 'Jun 22', statusKey: 'progress' },
  { id: 'r3', name: 'Hannah Weiss', type: 'Export', detail: 'Data access request (GDPR Art. 15)', requested: 'Jun 12', statusKey: 'done' },
];

const CONSENTS = [
  { label: 'Application data consent', detail: 'Captured at apply · 100% of candidates' },
  { label: 'Talent-pool retention consent', detail: 'Opt-in for future-role contact' },
  { label: 'AI screening disclosure', detail: 'Candidates notified before AI screening' },
];

const RETENTION = [
  { label: 'Rejected candidates', value: '2 years' },
  { label: 'Talent pool', value: '3 years' },
  { label: 'Interview recordings', value: '90 days' },
  { label: 'Hired → HRIS handoff', value: 'On start date' },
];

export default function EmployerCompliance() {
  const [handled, setHandled] = useState({});

  const handle = (id) => setHandled((s) => ({ ...s, [id]: true }));

  const requests = REQ_RAW.map((r, i, arr) => {
    const ts = typeStyle(r.type);
    const isDone = r.statusKey === 'done' || handled[r.id];
    const ss = statusStyle(handled[r.id] ? 'done' : r.statusKey);
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      detail: r.detail,
      requested: r.requested,
      icon: ts.icon,
      iconBg: ts.iconBg,
      iconColor: ts.iconColor,
      typeColor: ts.color,
      typeBg: ts.bg,
      typeBorder: ts.border,
      status: ss.label,
      statusColor: ss.color,
      statusBg: ss.bg,
      statusBorder: ss.border,
      actionable: !isDone,
      done: isDone,
      doneLabel: r.type === 'Delete' ? 'Deleted' : 'Exported',
      actLabel: r.type === 'Delete' ? 'Delete data' : 'Fulfill export',
      actBg: ts.actBg,
      divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
    };
  });
  const openRequests = requests.filter((r) => r.actionable).length;

  return (
    <>
      <Head>
        <title>Compliance — Jobocate</title>
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
        #emapp .em-export:hover {
          background: #f4efe4 !important;
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <button className="em-export" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}>↧ Audit-ready export</button>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Compliance</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Anonymized hiring reporting and candidate data-rights tooling.</p>
            </div>

            {/* EEO SNAPSHOT */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>EEO / DEI funnel</h2>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#9A9286' }}>Anonymized · self-reported · all reqs</span>
              </div>
              <p style={{ fontSize: 12.5, color: '#8A8378', margin: '0 0 20px' }}>Aggregated representation at each stage. Counts under 5 are suppressed to protect anonymity.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {EEO_GROUPS.map((g) => (
                  <div key={g.label}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 11 }}>{g.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {g.rows.map((r) => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                          <span style={{ width: 120, flexShrink: 0, fontSize: 13, color: '#3A352C' }}>{r.label}</span>
                          <div style={{ flex: 1, display: 'flex', gap: 4, height: 24 }}>
                            {r.segs.map((s, si) => (
                              <div key={si} title={s.stage} style={{ width: s.width, background: s.color, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#fff' }}>{s.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, paddingTop: 16, borderTop: '1px solid #F2ECE0', flexWrap: 'wrap' }}>
                {STAGE_LEGEND.map((l) => (
                  <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#5A544A' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            {/* DATA REQUESTS */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>GDPR / CCPA requests</h2>
                  <p style={{ fontSize: 12.5, color: '#8A8378', margin: '3px 0 0' }}>{openRequests} open · SLA 30 days</p>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#9A9286' }}>Candidate data rights</span>
              </div>
              {requests.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 22px', borderBottom: `1px solid ${r.divider}` }}>
                  <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: r.iconBg, color: r.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{r.name}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', color: r.typeColor, background: r.typeBg, border: `1px solid ${r.typeBorder}`, padding: '2px 8px', borderRadius: 999 }}>{r.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8378' }}>{r.detail} · requested {r.requested}</div>
                  </div>
                  <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', color: r.statusColor, background: r.statusBg, border: `1px solid ${r.statusBorder}`, padding: '4px 10px', borderRadius: 999 }}>{r.status}</span>
                  {r.actionable && (
                    <button onClick={() => handle(r.id)} style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: r.actBg, border: 'none', borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}>{r.actLabel}</button>
                  )}
                  {r.done && (
                    <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: '#157A49' }}>✓ {r.doneLabel}</span>
                  )}
                </div>
              ))}
              <div style={{ padding: '13px 22px', background: '#FBF9F4' }}>
                <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>＋ Log a new request</button>
              </div>
            </div>

            {/* CONSENT + RETENTION */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Consent &amp; policy</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {CONSENTS.map((c) => (
                    <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{c.label}</div>
                        <div style={{ fontSize: 11.5, color: '#8A8378' }}>{c.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Retention windows</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {RETENTION.map((r) => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>{r.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 600, color: '#1B1A16' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <Link href={appRoute('Employer Security.dc.html')} style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 600, color: '#4263EB', textDecoration: 'none', marginTop: 14 }}>Edit in Security →</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
