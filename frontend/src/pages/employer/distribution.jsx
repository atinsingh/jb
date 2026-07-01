'use client';

import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ---------------------------------------------------------------- data --- */
// Mirrors the dc Component.boardData() sample data.
const BOARD_DATA = [
  { key: 'careers', name: 'Company careers page', tagline: 'stripe.com/jobs', logo: 'St', logoBg: '#EDF0FE', logoColor: '#4263EB', status: 'LIVE', statusKey: 'live', spend: 'Free', sponsorable: false },
  { key: 'linkedin', name: 'LinkedIn Jobs', tagline: 'Professional network', logo: 'in', logoBg: '#E6F0FE', logoColor: '#2A6FDB', status: 'LIVE', statusKey: 'live', spend: 'Sponsored · $120', sponsorable: true, sponsorLabel: 'Edit budget' },
  { key: 'indeed', name: 'Indeed', tagline: 'Largest job board', logo: 'IN', logoBg: '#E6F0FE', logoColor: '#2A6FDB', status: 'PENDING', statusKey: 'pending', spend: 'Sponsored · $80', sponsorable: true, sponsorLabel: 'Edit budget' },
  { key: 'zip', name: 'ZipRecruiter', tagline: 'Distributes to 100+ boards', logo: 'ZR', logoBg: '#E6F4EA', logoColor: '#1A7F4B', status: 'EXPIRED', statusKey: 'expired', spend: 'Free tier', sponsorable: true, sponsorLabel: 'Renew' },
  { key: 'niche', name: 'Designer News board', tagline: 'Niche · design roles', logo: 'DN', logoBg: '#F3EAF9', logoColor: '#7A2E9A', status: 'LIVE', statusKey: 'live', spend: '$40 flat', sponsorable: false },
];

const PERF_RAW = [
  { source: 'LinkedIn Jobs', views: '1,140', applies: '14', cost: '$120', cpa: '$8.57' },
  { source: 'Indeed', views: '820', applies: '8', cost: '$80', cpa: '$10.00' },
  { source: 'Company careers', views: '312', applies: '5', cost: '$0', cpa: '$0.00' },
  { source: 'Designer News', views: '140', applies: '1', cost: '$40', cpa: '$40.00' },
];

function statusStyle(k) {
  if (k === 'live') return { color: '#157A49', bg: '#EAF6EE', border: '#CDE9D6', dot: '#1FA463' };
  if (k === 'pending') return { color: '#9A6A2E', bg: '#FBF1E2', border: '#EAD9BE', dot: '#D89A3E' };
  return { color: '#C9622E', bg: '#FBEDE4', border: '#EAD0C4', dot: '#C9622E' };
}

/* ----------------------------------------------------------- component --- */
export default function EmployerDistribution() {
  // state.on — which channels are toggled on (from dc Component.state)
  const [on, setOn] = useState({ careers: true, linkedin: true, indeed: true, zip: false, niche: false });

  const toggle = (key) => setOn((s) => ({ ...s, [key]: !s[key] }));

  const boards = useMemo(
    () =>
      BOARD_DATA.map((b) => {
        const isOn = on[b.key];
        const ss = statusStyle(b.statusKey);
        return {
          ...b,
          on: isOn,
          off: !isOn,
          cardBorder: isOn ? '#E6DECF' : '#ECE6DA',
          track: isOn ? '#1FA463' : '#D2C9B7',
          knob: isOn ? '20px' : '2px',
          statusColor: ss.color,
          statusBg: ss.bg,
          statusBorder: ss.border,
          statusDot: ss.dot,
        };
      }),
    [on]
  );

  const liveCount = boards.filter((b) => b.on && b.statusKey === 'live').length;

  const perf = useMemo(
    () =>
      PERF_RAW.map((p, i, arr) => ({
        ...p,
        cpaColor: p.cpa === '$0.00' ? '#157A49' : parseFloat(p.cpa.replace('$', '')) <= 12 ? '#1B1A16' : '#C9622E',
        divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
      })),
    []
  );

  const monoLabel = { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' };
  const grid = '1.4fr 0.8fr 0.8fr 0.9fr 1fr';

  return (
    <>
      <Head>
        <title>Distribution · Senior Product Designer — Jobocate</title>
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
        #emapp .em-sponsor:hover,
        #emapp .em-boost:hover {
          background: #364fc7 !important;
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="jobs" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Job Detail.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to req</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>Distribution</span>
          </header>

          <div style={{ padding: '26px 32px 56px', maxWidth: 1000, width: '100%', margin: '0 auto' }}>
            {/* REQ HEADER */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: '20px 22px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 5 }}>Distributing</div>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Senior Product Designer</h1>
                <div style={{ fontSize: 13, color: '#8A8378', marginTop: 2 }}>Remote (US) · Full-time · $170–210k</div>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: '#1B1A16' }}>{liveCount}</div>
                  <div style={{ fontSize: 11.5, color: '#8A8378' }}>boards live</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: '#4263EB' }}>2.4k</div>
                  <div style={{ fontSize: 11.5, color: '#8A8378' }}>total views</div>
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: '#157A49' }}>28</div>
                  <div style={{ fontSize: 11.5, color: '#8A8378' }}>applicants</div>
                </div>
              </div>
            </div>

            {/* BOARDS */}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 13 }}>Channels</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 24 }}>
              {boards.map((b) => (
                <div key={b.key} style={{ background: '#FFFEFB', border: `1px solid ${b.cardBorder}`, borderRadius: 15, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 10, background: b.logoBg, color: b.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}>{b.logo}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: '#8A8378' }}>{b.tagline}</div>
                    </div>
                    <button onClick={() => toggle(b.key)} aria-label={`Toggle ${b.name}`} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0' }}>
                      <span style={{ width: 42, height: 24, borderRadius: 999, background: b.track, position: 'relative', display: 'block', transition: 'background 0.2s' }}>
                        <span style={{ position: 'absolute', top: 2, left: b.knob, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                      </span>
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 13, paddingTop: 13, borderTop: '1px solid #F2ECE0' }}>
                    {b.on ? (
                      <>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', color: b.statusColor, background: b.statusBg, border: `1px solid ${b.statusBorder}`, padding: '3px 9px', borderRadius: 999 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.statusDot }} />
                          {b.status}
                        </span>
                        <span style={{ fontSize: 12, color: '#8A8378' }}>{b.spend}</span>
                        <div style={{ flex: 1 }} />
                        {b.sponsorable && (
                          <button className="em-sponsor" style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>{b.sponsorLabel}</button>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 12.5, color: '#A79E8F' }}>Not published</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* PERFORMANCE TABLE */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Performance by source</h2>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>Last 14 days</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '11px 22px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                <span style={monoLabel}>Source</span>
                <span style={{ ...monoLabel, textAlign: 'right' }}>Views</span>
                <span style={{ ...monoLabel, textAlign: 'right' }}>Applies</span>
                <span style={{ ...monoLabel, textAlign: 'right' }}>Cost</span>
                <span style={{ ...monoLabel, textAlign: 'right' }}>Cost / applicant</span>
              </div>
              {perf.map((p) => (
                <div key={p.source} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '13px 22px', borderBottom: `1px solid ${p.divider}` }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{p.source}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#5A544A', textAlign: 'right' }}>{p.views}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#5A544A', textAlign: 'right' }}>{p.applies}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#5A544A', textAlign: 'right' }}>{p.cost}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: p.cpaColor, textAlign: 'right' }}>{p.cpa}</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '13px 22px', background: '#FBF9F4' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1B1A16' }}>Total</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, textAlign: 'right' }}>2,412</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, textAlign: 'right' }}>28</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, textAlign: 'right' }}>$340</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#157A49', textAlign: 'right' }}>$12.14</span>
              </div>
            </div>

            {/* BOOST */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#15140F', border: '1px solid #2C2A22', borderRadius: 16, padding: '20px 24px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FBF8F1', marginBottom: 3 }}>Boost this req</div>
                <div style={{ fontSize: 13, color: '#9A9286' }}>Sponsored placement gets ~3× the views. Indeed estimates 14 more applicants for $150.</div>
              </div>
              <button className="em-boost" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 14.5, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '12px 22px', cursor: 'pointer' }}>⚡ Boost for $150</button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
