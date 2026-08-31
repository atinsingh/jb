'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { getEntitlement } from '@/services/subscriptionApi';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';

// ---------------------------------------------------------------------------
// Static product catalog — the feature list shown for a subscribed plan. This
// is product content (same for every subscriber), not the user's account data.
// ---------------------------------------------------------------------------
const PLAN_INCLUDES = [
  'Unlimited job matching',
  'Unlimited auto-apply',
  'AI résumé builder & cover letters',
  'Advanced per-company personalization',
  'Full AI interview prep + Live Interview copilot',
  'Concierge career coach',
  'Salary & offer insights',
  'Priority application routing & support',
];

const cardStyle = { background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2 };

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(d);
  }
};

export default function AppSubscription() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the user's real entitlement. No sample fallback — an authenticated
  // user with no subscription sees a genuine empty state.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ent = await getEntitlement();
        if (active) setSub(ent || null);
      } catch (e) {
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Derived, real-only view fields (nothing rendered unless the backend supplies it).
  const hasPlan = !!sub && !!(sub.planName || sub.planType || sub.plan);
  const planName = sub?.planName || sub?.planType || sub?.plan || 'Your plan';
  const paused = sub?.paused === true;
  const statusLabel = paused ? 'PAUSED' : 'ACTIVE';
  const cardLast4 = sub?.cardLast4 || sub?.paymentMethod?.last4 || null;
  const priceLabel =
    sub?.priceLabel || (typeof sub?.price === 'number' ? `$${sub.price}` : sub?.price) || null;
  const billNote = sub?.billingCycle
    ? sub.billingCycle === 'annual'
      ? 'billed annually'
      : 'billed monthly'
    : null;
  const renewNote =
    sub?.renewalNote ||
    (sub?.renewalDate || sub?.renewsAt || sub?.currentPeriodEnd
      ? `Renews ${fmtDate(sub.renewalDate || sub.renewsAt || sub.currentPeriodEnd)}`
      : null);
  const usage = Array.isArray(sub?.usage) ? sub.usage : [];
  const includes = Array.isArray(sub?.includes) && sub.includes.length ? sub.includes : PLAN_INCLUDES;

  return (
    <>
      <Head>
        <title>Your subscription — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp .jb-cta:hover {
          background: var(--jb-v3-ok);
        }
        #jbapp .jb-cancel:hover {
          color: var(--jb-v3-danger);
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
          minHeight: '100vh',
          background: 'var(--jb-v3-bg)',
          fontFamily: 'var(--jb-v3-font-display)',
          color: 'var(--jb-v3-fg)',
        }}
      >
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'relative',
              
              
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '15px 32px',
              background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid var(--jb-v3-line)',
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
                color: 'var(--jb-v3-fg-2)',
                textDecoration: 'none',
              }}
            >
              ← Back to settings
            </Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-fg-3)' }}>
              Plan &amp; billing
            </span>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 820, width: '100%', margin: '0 auto' }}>
            <h1
              style={{
                fontFamily: 'var(--jb-v3-font-display)',
                fontWeight: 400,
                fontSize: 38,
                lineHeight: 1,
                margin: '0 0 22px',
              }}
            >
              Your subscription
            </h1>

            {loading ? (
              <div style={{ ...cardStyle, padding: 8 }}>
                <LoadingState label="Loading your subscription…" />
              </div>
            ) : error ? (
              <div style={{ ...cardStyle, padding: 8 }}>
                <ErrorState error={error} onRetry={() => window.location.reload()} />
              </div>
            ) : !hasPlan ? (
              <div style={{ ...cardStyle, padding: 8 }}>
                <EmptyState
                  icon="✦"
                  title="No active subscription"
                  hint="You’re on the Free plan. Upgrade to unlock unlimited auto-apply, interview prep and more."
                  action={
                    <Link
                      href={appRoute('App Upgrade.dc.html')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        marginTop: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--jb-v3-accent-ink)',
                        background: 'var(--jb-v3-accent)',
                        borderRadius: 2,
                        padding: '11px 20px',
                        textDecoration: 'none',
                      }}
                    >
                      View plans →
                    </Link>
                  }
                />
              </div>
            ) : (
              <>
                {/* PAUSED BANNER */}
                {paused && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'var(--jb-v3-warn-soft)',
                      border: '1px solid var(--jb-v3-warn-line)',
                      borderRadius: 2,
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
                        background: 'var(--jb-v3-danger)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                      }}
                    >
                      ❙❙
                    </span>
                    <span style={{ flex: 1, fontSize: 13.5, color: 'var(--jb-v3-danger)' }}>
                      <b>Membership paused.</b> Your benefits stay available, then resume billing automatically.
                    </span>
                  </div>
                )}

                {/* CURRENT PLAN HERO */}
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'var(--jb-v3-invert)',
                    border: '1px solid var(--jb-v3-fg)',
                    borderRadius: 2,
                    padding: '28px 30px',
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle at 92% 12%, color-mix(in srgb, var(--jb-v3-accent) 28%, transparent), transparent 55%)',
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
                        <span style={{ fontFamily: 'var(--jb-v3-font-display)', fontSize: 30, lineHeight: 1, color: 'var(--jb-v3-panel)' }}>
                          {planName}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: 'var(--jb-v3-font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            color: 'var(--jb-v3-accent-ink)',
                            background: 'var(--jb-v3-ok)',
                            padding: '4px 10px',
                            borderRadius: 2,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      {priceLabel && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 30, fontWeight: 600, color: 'var(--jb-v3-panel)' }}>
                            {priceLabel}
                          </span>
                          {billNote && <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>/mo · {billNote}</span>}
                        </div>
                      )}
                      {renewNote && <div style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-3)' }}>{renewNote}</div>}
                    </div>
                    {cardLast4 && (
                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          alignItems: 'flex-end',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: 'var(--jb-v3-fg-3)' }}>
                          Payment method
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            background: 'var(--jb-v3-invert)',
                            border: '1px solid var(--jb-v3-fg)',
                            borderRadius: 2,
                            padding: '9px 13px',
                          }}
                        >
                          <span
                            style={{
                              width: 26,
                              height: 18,
                              borderRadius: 2,
                              background: 'linear-gradient(135deg,var(--jb-v3-accent),var(--jb-v3-accent))',
                            }}
                          />
                          <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 12, color: 'var(--jb-v3-line)' }}>
                            •••• {cardLast4}
                          </span>
                        </div>
                        <Link
                          href={appRoute('App Payment Methods.dc.html')}
                          style={{
                            fontFamily: 'var(--jb-v3-font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--jb-v3-ok)',
                            textDecoration: 'none',
                          }}
                        >
                          Update →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* USAGE */}
                {usage.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div
                      style={{
                        fontFamily: 'var(--jb-v3-font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--jb-v3-fg-3)',
                        marginBottom: 12,
                      }}
                    >
                      This period
                    </div>
                    <div
                      className="jb-usage-grid"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}
                    >
                      {usage.map((u, idx) => (
                        <div key={idx} style={{ ...cardStyle, padding: 18 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 10,
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-fg-2)' }}>{u.label}</span>
                            {u.unlimited && (
                              <span
                                style={{
                                  fontFamily: 'var(--jb-v3-font-mono)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--jb-v3-accent)',
                                  background: 'var(--jb-v3-accent-soft)',
                                  border: '1px solid var(--jb-v3-accent-line)',
                                  padding: '2px 7px',
                                  borderRadius: 2,
                                }}
                              >
                                UNLIMITED
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 24, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>
                              {u.value}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>{u.unit}</span>
                          </div>
                          {u.hasMeter && u.pct && (
                            <div style={{ height: 6, borderRadius: 2, background: 'var(--jb-v3-line)', overflow: 'hidden' }}>
                              <div style={{ width: u.pct, height: '100%', background: 'var(--jb-v3-accent)' }} />
                            </div>
                          )}
                          {u.sub && <div style={{ fontSize: 11.5, color: 'var(--jb-v3-fg-3)', marginTop: 8 }}>{u.sub}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                        color: 'var(--jb-v3-accent-ink)',
                        background: 'var(--jb-v3-accent)',
                        borderRadius: 2,
                        padding: '11px 20px',
                        textDecoration: 'none',
                      }}
                    >
                      Change plan
                    </Link>
                    <div style={{ flex: 1 }} />
                    <Link
                      href={appRoute('App Cancel.dc.html')}
                      className="jb-cancel"
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-fg-3)', textDecoration: 'none' }}
                    >
                      Cancel membership
                    </Link>
                  </div>
                </div>

                {/* PLAN INCLUDES */}
                <div style={{ ...cardStyle, padding: 24 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>
                    Your {planName} plan includes
                  </h2>
                  <div
                    className="jb-includes-grid"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
                  >
                    {includes.map((i, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                        <span style={{ color: 'var(--jb-v3-accent)', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--jb-v3-fg-2)' }}>{i}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
