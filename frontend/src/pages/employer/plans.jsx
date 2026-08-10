'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { employerBillingApi } from '@/services/employerApi';
import {
  LoadingState,
  ErrorState,
  InlineError,
} from '@/components/employer/EmployerStates';

/* -------------------------------------------------------------- transform --- */
// Map a live plan (from the billing API) to the card's visual model.
function computeTiers(annual, data) {
  return data.map((t) => {
    const custom = !t.monthly && !t.annual; // e.g. Enterprise
    const dark = t.key === 'scale';
    const price = custom ? null : annual ? t.annual : t.monthly;
    const levers = Array.isArray(t.levers) ? t.levers : [];
    return {
      key: t.key,
      name: t.name,
      tagline: t.tagline,
      popular: !!t.popular,
      current: !!t.current,
      cardBg: dark ? '#15140F' : '#FFFEFB',
      border: t.current ? '#1FA463' : dark ? '#4263EB' : '#E6DECF',
      ring: t.popular
        ? '0 0 0 3px rgba(66,99,235,0.18)'
        : t.current
          ? '0 0 0 3px rgba(31,164,99,0.16)'
          : 'none',
      nameColor: dark ? '#FBF8F1' : '#1B1A16',
      taglineColor: dark ? '#9A9286' : '#8A8378',
      leverLabelColor: dark ? '#9A9286' : '#8A8378',
      hasPrice: !custom,
      noPrice: custom,
      price: custom ? '' : '$' + price,
      per: '/mo',
      isCurrent: !!t.current,
      cta: 'Choose ' + t.name,
      ctaBg: dark ? '#4263EB' : '#1B1A16',
      ctaColor: dark ? '#fff' : '#F7F3EA',
      levers: levers.map((l) => ({
        label: l[0],
        value: l[1],
        valColor:
          l[1] === '—'
            ? dark
              ? '#5A544A'
              : '#C9BFAC'
            : l[1] === '✓' || String(l[1]).startsWith('✓')
              ? '#1FA463'
              : dark
                ? '#FBF8F1'
                : '#1B1A16',
      })),
    };
  });
}

/* -------------------------------------------------------------- component --- */
export default function EmployerPlans() {
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tierData, setTierData] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [choosing, setChoosing] = useState(null);
  const [chooseError, setChooseError] = useState(null);

  // Fetch live plans. No sample fallback — surface real state only.
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employerBillingApi.plans();
      setTierData(Array.isArray(res?.plans) ? res.plans : []);
      setCurrentPlan(res?.currentPlan || null);
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

  // Persist the chosen plan, surface failures, then refetch to reflect state.
  const choosePlan = async (key) => {
    setChoosing(key);
    setChooseError(null);
    try {
      const res = await employerBillingApi.upgrade({
        plan: key,
        billingCycle: annual ? 'annual' : 'monthly',
      });
      // The plan is granted by Stripe, not by this call: hand off to Checkout
      // and let the webhook update the subscription. Reloading here instead
      // would just re-render the old plan.
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      await load();
    } catch (err) {
      setChooseError(err);
    } finally {
      setChoosing(null);
    }
  };

  const tiers = computeTiers(annual, tierData);
  const currentName =
    tierData.find((t) => t.current)?.name ||
    (currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : null);
  const scale = tierData.find((t) => t.key === 'scale');
  const showScaleUpsell = scale && !scale.current;

  return (
    <>
      <Head>
        <title>Plans &amp; billing — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp .em-upgrade-cta:hover {
          background: #364fc7 !important;
        }
        @media (max-width: 980px) {
          #emapp .em-tier-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #emapp .em-delta-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 560px) {
          #emapp .em-tier-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        id="emapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <EmployerSidebar active="settings" />

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
              href={appRoute('Employer Settings.dc.html')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}
            >
              ← Back to settings
            </Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#9A9286' }}>Plan &amp; billing</span>
          </header>

          <div style={{ padding: '32px 32px 64px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
            {/* HERO */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 40, lineHeight: 1.02, margin: '0 0 10px' }}>Scale your hiring.</h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: '0 auto 20px', maxWidth: 480 }}>
                {currentName ? (
                  <>You&rsquo;re on <b style={{ color: '#1B1A16' }}>{currentName}</b>. Here&rsquo;s what each plan unlocks.</>
                ) : (
                  <>Here&rsquo;s what each plan unlocks.</>
                )}
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#F1ECE0',
                  border: '1px solid #E1D9C9',
                  borderRadius: 999,
                  padding: 5,
                }}
              >
                <button
                  onClick={() => setAnnual(false)}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: !annual ? '#1B1A16' : '#7A7367',
                    background: !annual ? '#FFFEFB' : 'transparent',
                    border: 'none',
                    borderRadius: 999,
                    padding: '8px 20px',
                    cursor: 'pointer',
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: annual ? '#1B1A16' : '#7A7367',
                    background: annual ? '#FFFEFB' : 'transparent',
                    border: 'none',
                    borderRadius: 999,
                    padding: '8px 20px',
                    cursor: 'pointer',
                  }}
                >
                  Annual{' '}
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, background: '#1FA463', color: '#0C2C1C', padding: '2px 7px', borderRadius: 999 }}>−25%</span>
                </button>
              </div>
            </div>

            <InlineError error={chooseError} />

            {loading ? (
              <LoadingState label="Loading plans…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* TIER CARDS */}
                <div className="em-tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'stretch' }}>
                  {tiers.map((t) => (
                    <div
                      key={t.key}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        background: t.cardBg,
                        border: `1.5px solid ${t.border}`,
                        boxShadow: t.ring,
                        borderRadius: 18,
                        padding: '24px 22px',
                      }}
                    >
                      {t.popular && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -11,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: '#fff',
                            background: '#4263EB',
                            padding: '4px 12px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          MOST POPULAR
                        </span>
                      )}
                      {t.current && (
                        <span
                          style={{
                            position: 'absolute',
                            top: -11,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: '#0C2C1C',
                            background: '#1FA463',
                            padding: '4px 12px',
                            borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          YOUR PLAN
                        </span>
                      )}

                      <div style={{ fontSize: 18, fontWeight: 700, color: t.nameColor, marginBottom: 4 }}>{t.name}</div>
                      <div style={{ fontSize: 12.5, color: t.taglineColor, marginBottom: 16, minHeight: 34 }}>{t.tagline}</div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 18 }}>
                        {t.hasPrice && (
                          <>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 30, fontWeight: 600, color: t.nameColor }}>{t.price}</span>
                            <span style={{ fontSize: 12.5, color: t.taglineColor }}>{t.per}</span>
                          </>
                        )}
                        {t.noPrice && <span style={{ fontFamily: 'var(--jb-font-display)', fontSize: 26, color: t.nameColor }}>Custom</span>}
                      </div>

                      {t.isCurrent ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 7,
                            background: '#F2ECE0',
                            color: '#8A8378',
                            fontSize: 14,
                            fontWeight: 600,
                            padding: 12,
                            borderRadius: 999,
                            marginBottom: 20,
                          }}
                        >
                          Current plan
                        </div>
                      ) : (
                        <button
                          onClick={() => choosePlan(t.key)}
                          disabled={choosing === t.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 7,
                            width: '100%',
                            background: t.ctaBg,
                            color: t.ctaColor,
                            border: 'none',
                            fontFamily: 'inherit',
                            fontSize: 14,
                            fontWeight: 700,
                            padding: 12,
                            borderRadius: 999,
                            cursor: choosing === t.key ? 'not-allowed' : 'pointer',
                            opacity: choosing === t.key ? 0.7 : 1,
                            marginBottom: 20,
                          }}
                        >
                          {choosing === t.key ? 'Switching…' : t.cta}
                        </button>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                        {t.levers.map((l) => (
                          <div key={l.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                            <span style={{ color: t.leverLabelColor }}>{l.label}</span>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontWeight: 600, color: l.valColor, textAlign: 'right' }}>{l.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* SCALE UPSELL — built from the real Scale plan levers */}
                {showScaleUpsell && (
                  <div style={{ marginTop: 22, background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 18, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#364FC7' }}>
                        Upgrade to {scale.name} — what you&rsquo;ll unlock
                      </span>
                    </div>
                    <div className="em-delta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 13 }}>
                      {(scale.levers || []).map((l) => (
                        <div key={l[0]} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              flexShrink: 0,
                              borderRadius: '50%',
                              background: '#4263EB',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                            }}
                          >
                            ↑
                          </span>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1F2D6B' }}>{l[0]}</div>
                            <div style={{ fontSize: 12.5, color: '#3F4A7A' }}>{l[1]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => choosePlan('scale')}
                      disabled={choosing === 'scale'}
                      className="em-upgrade-cta"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: '#4263EB',
                        color: '#fff',
                        border: 'none',
                        fontFamily: 'inherit',
                        fontSize: 14.5,
                        fontWeight: 700,
                        padding: '13px 24px',
                        borderRadius: 999,
                        cursor: choosing === 'scale' ? 'not-allowed' : 'pointer',
                        opacity: choosing === 'scale' ? 0.7 : 1,
                        marginTop: 18,
                      }}
                    >
                      {choosing === 'scale' ? 'Switching…' : `Upgrade to ${scale.name} →`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
