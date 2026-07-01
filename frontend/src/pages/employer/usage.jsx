'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { employerBillingApi } from '@/services/employerApi';

// --- Sample data, ported from the design's DCLogic.renderVals() ---

const METER_RAW = [
  { label: 'Active jobs', used: 3, limit: 5, unit: 'slots', projection: '2 slots left', action: 'Increase limit' },
  { label: 'Team seats', used: 4, limit: 6, unit: 'seats', projection: '2 seats left', action: 'Add seats' },
  { label: 'AI actions', used: 240, limit: 500, unit: 'this month', projection: 'On track · ~480 projected', action: 'Upgrade' },
  { label: 'Sourcing credits', used: 60, limit: 100, unit: 'credits', projection: 'Projected to run out Jun 27', action: 'Upgrade' },
  { label: 'Candidate exports', used: 18, limit: 50, unit: 'this month', projection: 'Plenty remaining', action: 'Increase limit' },
];

const buildMeters = (rows) =>
  rows.map((m) => {
    const ratio = m.limit ? m.used / m.limit : 0;
    const near = ratio >= 0.6;
    const danger = ratio >= 0.8;
    return {
      ...m,
      pct: Math.round(ratio * 100) + '%',
      barColor: danger ? '#C9622E' : near ? '#4263EB' : '#1FA463',
      cardBorder: danger ? '#EAD0C4' : '#E6DECF',
      tag: danger ? 'NEAR LIMIT' : near ? 'IN USE' : 'HEALTHY',
      tagColor: danger ? '#C9622E' : near ? '#4263EB' : '#157A49',
      tagBg: danger ? '#FBEDE4' : near ? '#EDF0FE' : '#EAF6EE',
      tagBorder: danger ? '#EAD0C4' : near ? '#C7D2FB' : '#CDE9D6',
    };
  });

const METERS = buildMeters(METER_RAW);

const REQ_RAW = [
  { title: 'Senior Product Designer', actions: 112, pct: 47, trend: '▲ 18%', up: true },
  { title: 'Staff Frontend Engineer', actions: 88, pct: 37, trend: '▲ 9%', up: true },
  { title: 'Product Manager, Growth', actions: 40, pct: 16, trend: '▼ 4%', up: false },
];

const REQ_ROWS = REQ_RAW.map((r, i, arr) => ({
  title: r.title,
  actions: r.actions,
  pct: r.pct + '%',
  trend: r.trend,
  trendColor: r.up ? '#157A49' : '#8A8378',
  divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
}));

const av = (a) =>
  a === 'indigo'
    ? { bg: '#4263EB', color: '#fff' }
    : a === 'green'
      ? { bg: '#1FA463', color: '#0C2C1C' }
      : { bg: '#EDE7DA', color: '#5A544A' };

const SEAT_RAW = [
  { initials: 'DW', name: 'Dana Whitfield', role: 'Senior Recruiter · Admin', actions: 128, lastActive: 'now', accent: 'indigo' },
  { initials: 'RM', name: 'Raj Mehta', role: 'Recruiter', actions: 74, lastActive: '2h ago', accent: 'neutral' },
  { initials: 'EC', name: 'Elena Cruz', role: 'Hiring Manager', actions: 31, lastActive: 'Yesterday', accent: 'neutral' },
  { initials: 'TB', name: 'Tom Baker', role: 'Interviewer', actions: 7, lastActive: '3d ago', accent: 'neutral' },
];

const SEAT_ROWS = SEAT_RAW.map((s, i, arr) => {
  const a = av(s.accent);
  return { ...s, avatarBg: a.bg, avatarColor: a.color, divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent' };
});

const MONO = "'JetBrains Mono',monospace";

export default function EmployerUsage() {
  // Live meters seeded with design samples; overridden on successful fetch.
  const [meters, setMeters] = useState(METERS);

  // Fetch live usage; on any failure keep the sample fallback.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await employerBillingApi.usage();
        if (!alive) return;
        const u = res?.usage;
        if (!u) return;

        const overrides = {
          'Active jobs': { used: u.jobSlotsUsed, limit: u.jobSlotsLimit },
          'Team seats': { used: u.seatsUsed, limit: u.seatsLimit },
          'AI actions': { used: u.aiActionsUsed, limit: u.aiActionsLimit },
          'Sourcing credits': { used: u.sourcingCreditsUsed, limit: u.sourcingCreditsLimit },
        };

        setMeters(
          buildMeters(
            METER_RAW.map((m) => {
              const o = overrides[m.label];
              return o && typeof o.used === 'number' && typeof o.limit === 'number'
                ? { ...m, used: o.used, limit: o.limit }
                : m;
            }),
          ),
        );
      } catch {
        /* keep samples */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>Usage &amp; limits — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
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
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Plans.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: '#9A9286' }}>Growth plan · resets Jul 1</span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Usage &amp; limits</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Where you stand against your Growth-plan quotas this billing period.</p>
            </div>

            {/* WARNING STRIP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FBEDE4', border: '1px solid #EAD0C4', borderRadius: 14, padding: '14px 18px', marginBottom: 18 }}>
              <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', background: '#C9622E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>!</span>
              <span style={{ flex: 1, fontSize: 13.5, color: '#7A4326' }}>
                <b>You&rsquo;re near your job-slot limit.</b> 3 of 5 active — posting 2 more will hit the Growth cap. Sourcing credits are projected to run out by Jun 27.
              </span>
              <Link href={appRoute('Employer Plans.dc.html')} style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', borderRadius: 999, padding: '8px 15px', textDecoration: 'none' }}>Upgrade</Link>
            </div>

            {/* METER CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 18 }}>
              {meters.map((m) => (
                <div key={m.label} style={{ background: '#FFFEFB', border: `1px solid ${m.cardBorder}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{m.label}</span>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', color: m.tagColor, background: m.tagBg, border: `1px solid ${m.tagBorder}`, padding: '3px 8px', borderRadius: 999 }}>{m.tag}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 11 }}>
                    <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: '#1B1A16' }}>{m.used}</span>
                    <span style={{ fontSize: 13, color: '#8A8378' }}>/ {m.limit} {m.unit}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ width: m.pct, height: '100%', background: m.barColor }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#8A8378' }}>{m.projection}</span>
                    <Link href={appRoute('Employer Plans.dc.html')} style={{ fontSize: 12, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}>{m.action} →</Link>
                  </div>
                </div>
              ))}
            </div>

            {/* PER-REQ BREAKDOWN */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>AI actions by req</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.4fr 0.8fr', gap: 10, padding: '11px 22px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Requisition</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'center' }}>Actions</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286' }}>Share</span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9A9286', textAlign: 'right' }}>Trend</span>
              </div>
              {REQ_ROWS.map((r) => (
                <div key={r.title} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.4fr 0.8fr', gap: 10, alignItems: 'center', padding: '13px 22px', borderBottom: `1px solid ${r.divider}` }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{r.title}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: '#5A544A', textAlign: 'center' }}>{r.actions}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden' }}>
                      <div style={{ width: r.pct, height: '100%', background: '#4263EB' }} />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#8A8378', width: 34, textAlign: 'right' }}>{r.pct}</span>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: r.trendColor, textAlign: 'right' }}>{r.trend}</span>
                </div>
              ))}
            </div>

            {/* PER-SEAT */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Seats in use</h2>
                <Link href={appRoute('Employer Notifications.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}>Manage team →</Link>
              </div>
              {SEAT_ROWS.map((s) => (
                <div key={s.initials} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 22px', borderBottom: `1px solid ${s.divider}` }}>
                  <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: s.avatarBg, color: s.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{s.initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: '#8A8378' }}>{s.role}</div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: '#5A544A' }}>{s.actions} actions</span>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, color: '#A79E8F', width: 80, textAlign: 'right' }}>{s.lastActive}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 22px', background: '#FBF9F4' }}>
                <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', border: '1.5px dashed #C9BFAC', color: '#A79E8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>＋</span>
                <span style={{ flex: 1, fontSize: 13, color: '#8A8378' }}>2 seats remaining on Growth</span>
                <Link href={appRoute('Employer Notifications.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}>Invite →</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
