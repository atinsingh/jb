'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getMyOffers } from '@/services/offersApi';

/* -------------------------------------------------------------------------- */
/* Design sample data (mirrors the .dc.html Component.offerData)               */
/* -------------------------------------------------------------------------- */
const SAMPLE_OFFERS = [
  { id: 'stripe', logo: 'St', bg: '#EAF6EE', fg: '#157A49', company: 'Stripe', title: 'Senior Product Designer', base: 195, equity: 220, signon: 25, bonus: 29, total: 444, location: 'Remote (US)', start: 'Aug 4', deadlineDays: 5, pto: 'Unlimited', ptoBest: true, remote: 'Remote (US)', remoteBest: true },
  { id: 'figma', logo: 'Fi', bg: '#F4EFE4', fg: '#1B1A16', company: 'Figma', title: 'Product Designer, Design Systems', base: 205, equity: 180, signon: 30, bonus: 31, total: 416, location: 'San Francisco · Hybrid', start: 'Aug 18', deadlineDays: 8, pto: '20 days', ptoBest: false, remote: 'Hybrid · SF', remoteBest: false },
  { id: 'linear', logo: 'Li', bg: '#F4EFE4', fg: '#1B1A16', company: 'Linear', title: 'Design Engineer', base: 210, equity: 150, signon: 20, bonus: 21, total: 381, location: 'Remote', start: 'Sep 1', deadlineDays: 12, pto: 'Unlimited', ptoBest: true, remote: 'Remote', remoteBest: true },
];

const k = (n) => '$' + n + 'k';

// Two-letter logo from a company name.
const initials = (name = '') => {
  const t = name.trim();
  if (!t) return '??';
  const parts = t.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).replace(/^\w/, (c) => c.toUpperCase());
};

// Map a live application record into the offer shape the design expects.
// We are defensive: backend offer schemas vary, so we read several likely
// fields and fall back to zeros / placeholders rather than crashing.
const fromApplication = (app, i) => {
  const company = app.companyName || app.company || app.job?.company || 'Company';
  const title = app.jobTitle || app.title || app.job?.title || 'Role';
  const offer = app.offer || app.offerDetails || {};
  const base = Math.round((offer.baseSalary ?? offer.base ?? app.baseSalary ?? 0) / 1000) || 0;
  const equity = Math.round((offer.equityPerYear ?? offer.equity ?? 0) / 1000) || 0;
  const signon = Math.round((offer.signOnBonus ?? offer.signon ?? 0) / 1000) || 0;
  const bonus = Math.round((offer.targetBonus ?? offer.bonus ?? 0) / 1000) || 0;
  const total = base + equity + signon + bonus;
  const tint = i === 0 ? '#EAF6EE' : '#F4EFE4';
  const ink = i === 0 ? '#157A49' : '#1B1A16';
  return {
    id: app._id || app.id || `app-${i}`,
    logo: initials(company),
    bg: tint,
    fg: ink,
    company,
    title,
    base,
    equity,
    signon,
    bonus,
    total,
    location: offer.location || app.location || app.job?.location || '—',
    start: offer.startDate || app.startDate || '—',
    deadlineDays: offer.deadlineDays ?? app.deadlineDays ?? 14,
    pto: offer.pto || '—',
    ptoBest: false,
    remote: offer.remote || offer.location || app.location || '—',
    remoteBest: false,
  };
};

/* -------------------------------------------------------------------------- */
/* renderVals — faithful port of the design's compute logic                   */
/* -------------------------------------------------------------------------- */
function buildVals(data, sel) {
  const totals = data.map((o) => o.total);
  const bestIdx = totals.indexOf(Math.max(...totals));

  const offers = data.map((o, i) => ({
    ...o,
    best: i === bestIdx,
    selected: i === sel,
    border: i === bestIdx ? '#1FA463' : '#E6DECF',
    ring: i === sel ? '0 0 0 3px rgba(31,164,99,0.18)' : '0 1px 2px rgba(27,26,22,0.04)',
    totalFmt: k(o.total),
    signonFmt: k(o.signon),
    baseFmt: k(o.base),
    equityFmt: k(o.equity) + '/yr',
    bonusFmt: k(o.bonus),
    deadlineColor: o.deadlineDays <= 5 ? '#C9622E' : '#8A8378',
    deadlineBg: o.deadlineDays <= 5 ? '#FBEDE4' : '#F4EFE4',
    deadlineBorder: o.deadlineDays <= 5 ? '#EAD0C4' : '#E6DECF',
  }));

  const headers = data.map((o, i) => ({
    logo: o.logo,
    bg: o.bg,
    fg: o.fg,
    company: o.company,
    nameColor: i === bestIdx ? '#157A49' : '#1B1A16',
  }));

  const win = '#157A49';
  const winBg = '#E6F6EC';
  const winBorder = '#BFE6CD';

  const mkNum = (label, key, total) => {
    const vals = data.map((o) => o[key]);
    const max = Math.max(...vals);
    const cells = data.map((o, i) => {
      const w = vals[i] === max;
      return {
        text: k(o[key]) + (key === 'equity' ? '/yr' : ''),
        size: total ? '15px' : '13px',
        weight: w || total ? 700 : 500,
        color: w ? win : '#1B1A16',
        bg: w ? winBg : 'transparent',
        cellBorder: w ? winBorder : 'transparent',
      };
    });
    return { label, cells, total };
  };

  const mkText = (label, key, bestKey) => {
    const cells = data.map((o) => {
      const w = o[bestKey];
      return {
        text: o[key],
        size: '13px',
        weight: w ? 700 : 500,
        color: w ? win : '#1B1A16',
        bg: w ? winBg : 'transparent',
        cellBorder: w ? winBorder : 'transparent',
      };
    });
    return { label, cells, total: false };
  };

  const rawRows = [
    mkNum('Base salary', 'base', false),
    mkNum('Equity', 'equity', false),
    mkNum('Sign-on', 'signon', false),
    mkNum('Bonus (target)', 'bonus', false),
    mkNum('Total comp / yr', 'total', true),
    mkText('PTO', 'pto', 'ptoBest'),
    mkText('Remote', 'remote', 'remoteBest'),
  ];

  const rows = rawRows.map((r, i) => ({
    ...r,
    labelWeight: r.total ? 700 : 600,
    rowBg: r.total ? '#FBF9F4' : '#FFFEFB',
    divider: i === rawRows.length - 1 ? 'transparent' : '#F2ECE0',
  }));

  return { offerCount: data.length, offers, headers, rows };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */
export default function AppOffers() {
  const [data, setData] = useState(SAMPLE_OFFERS);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMyOffers({ limit: 3 });
        const apps = res?.applications || res?.data || (Array.isArray(res) ? res : []);
        const mapped = (apps || []).map(fromApplication).filter((o) => o.total > 0);
        if (alive && mapped.length > 0) {
          setData(mapped);
          setSelected(0);
        }
      } catch {
        // Unauthenticated or request failed — keep the design sample data.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const { offerCount, offers, headers, rows } = useMemo(
    () => buildVals(data, selected),
    [data, selected]
  );

  const earliestDeadline = useMemo(
    () => Math.min(...data.map((o) => o.deadlineDays)),
    [data]
  );

  return (
    <>
      <Head>
        <title>Offers — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbapp * {
          box-sizing: border-box;
        }
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        #jbapp .jb-offer-accept:hover {
          background: #1b9159;
        }
        #jbapp .jb-offer-neg:hover {
          background: #f4efe4;
        }
        #jbapp .jb-offer-decline:hover {
          color: #c9622e;
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="offers" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Workspace / Offers</div>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#C9622E' }}>
              ⏳ Earliest deadline · {earliestDeadline} days
            </span>
          </header>

          <div style={{ padding: '30px 32px 56px', maxWidth: 1180, width: '100%' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Offers</h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                <b style={{ color: '#1B1A16' }}>{offerCount} active offers</b> on the table · compare and decide before they expire.
              </p>
            </div>

            {/* OFFER CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
              {offers.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelected(offers.indexOf(o))}
                  style={{ position: 'relative', background: '#FFFEFB', border: `1.5px solid ${o.border}`, boxShadow: o.ring, borderRadius: 18, padding: 22, cursor: 'pointer', animation: 'rbpop 0.2s ease' }}
                >
                  {o.best && (
                    <span style={{ position: 'absolute', top: -11, left: 22, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#0C2C1C', background: '#1FA463', padding: '4px 11px', borderRadius: 999 }}>★ BEST TOTAL</span>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
                    <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: o.bg, color: o.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{o.logo}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16.5, fontWeight: 700, lineHeight: 1.1 }}>{o.company}</div>
                      <div style={{ fontSize: 12.5, color: '#8A8378' }}>{o.title}</div>
                    </div>
                    {o.selected && (
                      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 38, fontWeight: 600, lineHeight: 1, color: '#1B1A16' }}>{o.totalFmt}</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378', marginBottom: 18 }}>/ yr total comp · +{o.signonFmt} sign-on</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderTop: '1px solid #F2ECE0', borderBottom: '1px solid #F2ECE0', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: '#8A8378' }}>Base</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{o.baseFmt}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: '#8A8378' }}>Equity / yr</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{o.equityFmt}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: '#8A8378' }}>Bonus (target)</span><span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{o.bonusFmt}</span></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#5A544A' }}><span style={{ color: '#A79E8F' }}>◷</span>{o.location}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#5A544A' }}><span style={{ color: '#A79E8F' }}>▷</span>Starts {o.start}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: o.deadlineColor, background: o.deadlineBg, border: `1px solid ${o.deadlineBorder}`, padding: '4px 10px', borderRadius: 999 }}>⏳ {o.deadlineDays} days to respond</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <button
                      className="jb-offer-accept"
                      onClick={(e) => { e.stopPropagation(); setSelected(offers.indexOf(o)); }}
                      style={{ width: '100%', fontSize: 14, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Accept offer
                    </button>
                    <div style={{ display: 'flex', gap: 9 }}>
                      <button
                        className="jb-offer-neg"
                        onClick={(e) => { e.stopPropagation(); setSelected(offers.indexOf(o)); }}
                        style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: 10, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Negotiate
                      </button>
                      <button
                        className="jb-offer-decline"
                        onClick={(e) => { e.stopPropagation(); setSelected(offers.indexOf(o)); }}
                        style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#A79E8F', background: 'none', border: 'none', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CONCIERGE NUDGE */}
            <Link
              href={appRoute('App Concierge.dc.html')}
              style={{ display: 'flex', alignItems: 'center', gap: 15, background: '#15140F', border: '1px solid #2C2A22', borderRadius: 16, padding: '16px 20px', marginBottom: 30, textDecoration: 'none' }}
            >
              <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', background: '#1E2D24', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>MB</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: '#FBF8F1' }}>Talk to Marcus about these</div>
                <div style={{ fontSize: 13, color: '#9A9286' }}>Your concierge can pressure-test each offer and draft a counter before your deadline.</div>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: '#5BD08C', flexShrink: 0 }}>Start a chat →</span>
            </Link>

            {/* COMPARISON TABLE */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #F2ECE0' }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Side-by-side comparison</h2>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5BD08C' }}>Mint = best in row</span>
              </div>

              {/* table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid #F2ECE0' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' }}>Component</span>
                {headers.map((h, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8, background: h.bg, color: h.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{h.logo}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: h.nameColor }}>{h.company}</span>
                  </span>
                ))}
              </div>

              {/* table rows */}
              {rows.map((r, ri) => (
                <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr', alignItems: 'center', padding: '13px 22px', borderBottom: `1px solid ${r.divider}`, background: r.rowBg }}>
                  <span style={{ fontSize: 13.5, fontWeight: r.labelWeight, color: '#5A544A' }}>{r.label}</span>
                  {r.cells.map((c, ci) => (
                    <span key={ci} style={{ justifySelf: 'start', fontFamily: "'JetBrains Mono',monospace", fontSize: c.size, fontWeight: c.weight, color: c.color, background: c.bg, border: `1px solid ${c.cellBorder}`, padding: '5px 11px', borderRadius: 8 }}>{c.text}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
