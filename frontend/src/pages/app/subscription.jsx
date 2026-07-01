'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getEntitlement } from '@/services/subscriptionApi';

// ---------------------------------------------------------------------------
// Sample data — mirrors the design's DCLogic renderVals(). Used as the faithful
// fallback whenever the user is unauthenticated or the request fails.
// ---------------------------------------------------------------------------
const SAMPLE = {
  planName: 'Premium',
  cardLast4: '4242',
  usage: [
    { label: 'Auto-apply credits', value: '38 / 50', unit: 'this week', hasMeter: true, pct: '76%', unlimited: false, sub: 'Resets Monday' },
    { label: 'Live Interview', value: '84', unit: 'min', hasMeter: false, unlimited: true, sub: 'Used this month' },
    { label: 'Concierge', value: '3', unit: 'sessions', hasMeter: false, unlimited: true, sub: 'With Marcus this month' },
  ],
  includes: [
    'Unlimited job matching',
    'Unlimited auto-apply',
    'AI résumé builder & cover letters',
    'Advanced per-company personalization',
    'Full AI interview prep + Live Interview copilot',
    'Concierge career coach (Marcus Bell)',
    'Salary & offer insights',
    'Priority application routing & support',
  ],
};

const cardStyle = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 };

export default function AppSubscription() {
  // State translated 1:1 from the design's DCLogic Component.state
  const [cycle, setCycle] = useState('annual'); // 'annual' | 'monthly'
  const [paused, setPaused] = useState(false);

  // Live data (entitlement). Falls back to SAMPLE gracefully.
  const [plan, setPlan] = useState(SAMPLE);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ent = await getEntitlement();
        if (!active || !ent) return;
        // Merge any real fields onto the sample so the page always renders fully.
        const planName =
          ent.planName || ent.planType || ent.plan || SAMPLE.planName;
        const cardLast4 =
          ent.cardLast4 || ent.paymentMethod?.last4 || SAMPLE.cardLast4;
        setPlan((p) => ({
          ...p,
          planName: typeof planName === 'string' ? planName : p.planName,
          cardLast4,
          usage: Array.isArray(ent.usage) && ent.usage.length ? ent.usage : p.usage,
          includes:
            Array.isArray(ent.includes) && ent.includes.length
              ? ent.includes
              : p.includes,
        }));
        if (ent.billingCycle === 'monthly' || ent.billingCycle === 'annual') {
          setCycle(ent.billingCycle);
        }
        if (typeof ent.paused === 'boolean') setPaused(ent.paused);
      } catch {
        // Unauthenticated or request failed — keep the faithful sample data.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // renderVals() — derived values, faithfully ported.
  const v = useMemo(() => {
    const annual = cycle === 'annual';
    return {
      paused,
      statusLabel: paused ? 'PAUSED' : 'ACTIVE',
      price: annual ? '$39' : '$59',
      billNote: annual ? 'billed annually' : 'billed monthly',
      renewNote: paused
        ? 'Paused · resumes Jul 28, 2026'
        : annual
        ? 'Renews Jul 28, 2026 · $468/yr'
        : 'Renews Jul 28, 2026',
      cycleAction: annual ? 'Switch to monthly' : 'Switch to annual (−33%)',
      pauseAction: paused ? 'Resume membership' : 'Pause membership',
    };
  }, [cycle, paused]);

  const toggleCycle = () => setCycle((c) => (c === 'annual' ? 'monthly' : 'annual'));
  const togglePause = () => setPaused((p) => !p);

  return (
    <>
      <Head>
        <title>Your subscription — Jobocate</title>
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
        #jbapp .jb-cta:hover {
          background: #1b9159;
        }
        #jbapp .jb-ghost:hover {
          background: #f4efe4;
        }
        #jbapp .jb-cancel:hover {
          color: #c9622e;
        }
        @media (max-width: 720px) {
          #jbapp .jb-usage-grid {
            grid-template-columns: 1fr !important;
          }
          #jbapp .jb-includes-grid {
            grid-template-columns: 1fr !important;
          }
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
        <AppSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <Link
              href={appRoute('App Settings.dc.html')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13.5,
                fontWeight: 600,
                color: '#5A544A',
                textDecoration: 'none',
              }}
            >
              ← Back to settings
            </Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>
              Plan &amp; billing
            </span>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 820, width: '100%', margin: '0 auto' }}>
            <h1
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: 38,
                lineHeight: 1,
                margin: '0 0 22px',
              }}
            >
              Your subscription
            </h1>

            {/* PAUSED BANNER */}
            {v.paused && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#FBF1E2',
                  border: '1px solid #EAD9BE',
                  borderRadius: 14,
                  padding: '14px 18px',
                  marginBottom: 18,
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: '#C9622E',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                  }}
                >
                  ❙❙
                </span>
                <span style={{ flex: 1, fontSize: 13.5, color: '#7A4326' }}>
                  <b>Membership paused.</b> Your benefits stay available until Jul 28, then resume billing
                  automatically.
                </span>
              </div>
            )}

            {/* CURRENT PLAN HERO */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: '#15140F',
                border: '1px solid #2C2A22',
                borderRadius: 20,
                padding: '28px 30px',
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 92% 12%, rgba(31,164,99,0.28), transparent 55%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 20,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                    <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, lineHeight: 1, color: '#FBF8F1' }}>
                      {plan.planName}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: '#0C2C1C',
                        background: '#5BD08C',
                        padding: '4px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {v.statusLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 600, color: '#FBF8F1' }}>
                      {v.price}
                    </span>
                    <span style={{ fontSize: 13, color: '#9A9286' }}>/mo · {v.billNote}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: '#B8B1A4' }}>{v.renewNote}</div>
                </div>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'flex-end',
                  }}
                >
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>
                    Payment method
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      background: '#1E1C15',
                      border: '1px solid #2C2A22',
                      borderRadius: 10,
                      padding: '9px 13px',
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 18,
                        borderRadius: 4,
                        background: 'linear-gradient(135deg,#1FA463,#157A49)',
                      }}
                    />
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#E4DECF' }}>
                      •••• {plan.cardLast4}
                    </span>
                  </div>
                  <Link
                    href={appRoute('App Upgrade.dc.html')}
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#5BD08C',
                      textDecoration: 'none',
                    }}
                  >
                    Update →
                  </Link>
                </div>
              </div>
            </div>

            {/* USAGE */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10.5,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#9A9286',
                  marginBottom: 12,
                }}
              >
                This period
              </div>
              <div
                className="jb-usage-grid"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}
              >
                {plan.usage.map((u, idx) => (
                  <div key={idx} style={{ ...cardStyle, padding: 18 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#5A544A' }}>{u.label}</span>
                      {u.unlimited && (
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 9,
                            fontWeight: 600,
                            color: '#157A49',
                            background: '#EAF6EE',
                            border: '1px solid #CDE9D6',
                            padding: '2px 7px',
                            borderRadius: 999,
                          }}
                        >
                          UNLIMITED
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, color: '#1B1A16' }}>
                        {u.value}
                      </span>
                      <span style={{ fontSize: 12, color: '#8A8378' }}>{u.unit}</span>
                    </div>
                    {u.hasMeter && (
                      <div style={{ height: 6, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden' }}>
                        <div style={{ width: u.pct, height: '100%', background: '#1FA463' }} />
                      </div>
                    )}
                    <div style={{ fontSize: 11.5, color: '#A79E8F', marginTop: 8 }}>{u.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{ ...cardStyle, padding: '20px 22px', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
                <Link
                  href={appRoute('App Upgrade.dc.html')}
                  className="jb-cta"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0C2C1C',
                    background: '#1FA463',
                    borderRadius: 999,
                    padding: '11px 20px',
                    textDecoration: 'none',
                  }}
                >
                  Change plan
                </Link>
                <button
                  type="button"
                  onClick={toggleCycle}
                  className="jb-ghost"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #D9D0BE',
                    borderRadius: 999,
                    padding: '11px 18px',
                    cursor: 'pointer',
                  }}
                >
                  {v.cycleAction}
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  className="jb-ghost"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #D9D0BE',
                    borderRadius: 999,
                    padding: '11px 18px',
                    cursor: 'pointer',
                  }}
                >
                  {v.pauseAction}
                </button>
                <div style={{ flex: 1 }} />
                <Link
                  href={appRoute('App Cancel.dc.html')}
                  className="jb-cancel"
                  style={{ fontSize: 13, fontWeight: 600, color: '#A79E8F', textDecoration: 'none' }}
                >
                  Cancel membership
                </Link>
              </div>
            </div>

            {/* PLAN INCLUDES */}
            <div style={{ ...cardStyle, padding: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
                Your {plan.planName} plan includes
              </h2>
              <div
                className="jb-includes-grid"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
              >
                {plan.includes.map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                    <span style={{ color: '#1FA463', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 14, lineHeight: 1.45, color: '#46413A' }}>{i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
