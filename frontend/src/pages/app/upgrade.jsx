'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { getEntitlement } from '@/services/upgradeApi';
import { createCheckout, getPlans } from '@/services/billingApi';

// ---------------------------------------------------------------------------
// Safe two-tier fallback while the live catalogue is loading.
// ---------------------------------------------------------------------------
const PLAN_DATA = [
  { key: 'free', name: 'Free', tagline: 'Essential search tools with a $0.50 monthly AI allowance.', monthly: 0, annual: 0, popular: false },
  { key: 'paid', name: 'Paid', tagline: 'More capacity with a $4 monthly AI allowance.', monthly: 10, annual: 100, popular: true },
];

const DELTA_DATA = {
  paid: {
    label: 'What Paid unlocks',
    items: [
      { title: '$4 AI allowance / mo', desc: 'Measured model spend shared across candidate AI services.' },
      { title: 'AI cover letters', desc: 'Tailored, editable drafts for every role.' },
      { title: 'Per-role personalization', desc: 'Résumés tuned to each job description.' },
      { title: 'Monthly renewal', desc: 'The AI allowance renews monthly on either billing cycle.' },
    ],
  },
  free: {
    label: 'What Free includes',
    items: [
      { title: 'AI résumé builder', desc: 'ATS-friendly résumés in minutes.' },
      { title: 'Smart job matching', desc: 'Roles ranked by fit, every day.' },
      { title: '$0.50 AI allowance / mo', desc: 'Measured model spend renews every month.' },
      { title: 'Application tracker', desc: 'Your whole pipeline in one board.' },
    ],
  },
};

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US');

// Map the active backend plan types to this screen's labels.
const PLAN_KEY_FROM_BACKEND = {
  FREE: 'free',
  PRO: 'paid',
};

export default function AppUpgrade() {
  // ---- dc state: { plan, annual, success } -------------------------------
  const [plan, setPlan] = useState('paid');
  const [annual, setAnnual] = useState(true);
  const [success, setSuccess] = useState(false);
  const [catalog, setCatalog] = useState(PLAN_DATA);
  const [checkoutError, setCheckoutError] = useState('');

  // ---- backend entitlement (best-effort, graceful fallback) --------------
  const [entitlement, setEntitlement] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let alive = true;
    getEntitlement()
      .then((res) => {
        if (!alive || !res) return;
        setEntitlement(res);
        const key = PLAN_KEY_FROM_BACKEND[(res.planType || '').toUpperCase()];
        // Free users land on Paid; Paid users see their current plan.
        if (key === 'free' || key === 'paid') setPlan('paid');
      })
      .catch(() => {
        // Unauthenticated or backend down — keep the design's sample data.
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getPlans()
      .then((res) => {
        if (!alive || !Array.isArray(res?.plans)) return;
        const live = res.plans.map((item) => ({
          id: item._id,
          key: item.type === 'FREE' ? 'free' : 'paid',
          name: item.name,
          tagline: item.description,
          monthly: item.priceMonthly,
          annual: item.priceYearly,
          popular: item.type === 'PRO',
        }));
        if (live.length) setCatalog(live);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Reflect a real trial when present; otherwise explain the AI renewal cadence.
  const trialLabel = useMemo(() => {
    const days = entitlement?.trialDaysLeft;
    const tier = entitlement?.trialPlan || entitlement?.planType;
    if (typeof days === 'number' && days > 0) {
      const t = (tier || 'PAID').toString().toUpperCase();
      return `${t} TRIAL · ${days} DAY${days === 1 ? '' : 'S'} LEFT`;
    }
    return 'AI ALLOWANCE · RENEWS MONTHLY';
  }, [entitlement]);

  // ---- renderVals() port -------------------------------------------------
  const data = catalog;
  const sel = data.find((p) => p.key === plan) || data[0];

  const plans = data.map((p) => {
    const on = p.key === plan;
    const price = annual ? Number((p.annual / 12).toFixed(2)) : p.monthly;
    const dark = p.popular;
    return {
      ...p,
      price: '$' + price,
      per: '/mo',
      billNote: price === 0 ? 'free forever' : annual ? 'billed yearly' : 'billed monthly',
      cardBg: dark ? 'var(--jb-v3-invert)' : 'var(--jb-v3-panel)',
      border: on ? 'var(--jb-v3-accent)' : dark ? 'var(--jb-v3-fg)' : 'var(--jb-v3-line)',
      ring: on ? '0 0 0 3px color-mix(in srgb, var(--jb-v3-accent) 20%, transparent)' : 'none',
      radioBorder: on ? 'var(--jb-v3-accent)' : dark ? 'var(--jb-v3-line-2)' : 'var(--jb-v3-line-2)',
      radioBg: on ? 'var(--jb-v3-accent)' : 'transparent',
      radioMark: on ? '✓' : '',
      nameColor: dark ? 'var(--jb-v3-panel)' : 'var(--jb-v3-fg)',
      taglineColor: dark ? 'var(--jb-v3-fg-3)' : 'var(--jb-v3-fg-3)',
      billColor: dark ? (annual && price ? 'var(--jb-v3-ok)' : 'var(--jb-v3-fg-3)') : annual && price ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-3)',
    };
  });

  const monthlyPrice = sel.monthly;
  const annualPerMo = Number((sel.annual / 12).toFixed(2));
  const billed = annual ? sel.annual : monthlyPrice;
  const fullAnnual = monthlyPrice * 12;
  const discountAmt = annual ? fullAnnual - billed : 0;
  const total = billed;

  const delta = DELTA_DATA[plan] || DELTA_DATA.free;

  const successSubs = {
    paid: 'Your Paid plan is active. The $4 AI allowance renews monthly.',
    free: 'You’re on the Free plan. Upgrade anytime to put your search on autopilot.',
  };

  // Billing-cycle pill colors
  const monthlyBg = !annual ? 'var(--jb-v3-panel)' : 'transparent';
  const monthlyColor = !annual ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)';
  const annualBg = annual ? 'var(--jb-v3-panel)' : 'transparent';
  const annualColor = annual ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)';

  const planName = sel.name;
  const cycleLabel = annual ? 'Billed annually' : 'Billed monthly';
  const priceLine = money(annual ? annualPerMo : monthlyPrice) + '/mo';
  const subtotal = money(annual ? fullAnnual : monthlyPrice);
  const hasDiscount = discountAmt > 0;
  const totalLabel = annual ? 'Total billed today' : 'Total per month';
  const confirmLabel = total === 0 ? 'Switch to Free' : 'Confirm upgrade · ' + money(total);
  const successHref = appRoute('App Dashboard.dc.html');
  const successCta = 'Go to dashboard';

  const onConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    setCheckoutError('');
    try {
      if (sel.key === 'free') {
        window.location.assign('/app/cancel');
        return;
      }
      if (!sel.id) throw new Error('Paid plan is not available yet. Please refresh and try again.');
      const checkout = await createCheckout(sel.id, annual ? 'yearly' : 'monthly');
      if (!checkout?.url) throw new Error('Stripe checkout did not return a URL.');
      window.location.assign(checkout.url);
    } catch (error) {
      setCheckoutError(error?.message || 'Unable to start checkout. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <Head>
        <title>Upgrade · Plan &amp; billing — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp input:focus,
        #jbapp select:focus {
          outline: none;
          border-color: var(--jb-v3-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--jb-v3-accent) 15%, transparent);
        }
        #jbapp input::placeholder {
          color: var(--jb-v3-fg-3);
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', fontFamily: 'var(--jb-v3-font-display)', color: 'var(--jb-v3-fg)' }}>
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'relative',   display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--jb-v3-line)' }}>
            <Link href={appRoute('App Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg-2)', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-fg-3)' }}>Plan &amp; billing</span>
          </header>

          {/* ===== CHECKOUT ===== */}
          {!success && (
            <div style={{ padding: '32px 32px 64px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 38, lineHeight: 1, margin: '0 0 8px' }}>Choose your plan</h1>
                  <p style={{ fontSize: 15, color: 'var(--jb-v3-fg-2)', margin: 0 }}>Pick the plan that fits your search — change or cancel anytime.</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--jb-v3-warn)', background: 'var(--jb-v3-warn-soft)', border: '1px solid var(--jb-v3-warn-line)', padding: '6px 12px', borderRadius: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--jb-v3-danger)' }} />
                  {trialLabel}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* LEFT: PLAN SELECTOR */}
                <div style={{ flex: 1, minWidth: 320 }}>
                  {/* BILLING TOGGLE */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--jb-v3-line)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 5, marginBottom: 18 }}>
                    <button onClick={() => setAnnual(false)} style={{ background: monthlyBg, color: monthlyColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, padding: '8px 18px', borderRadius: 2 }}>Monthly</button>
                    <button onClick={() => setAnnual(true)} style={{ background: annualBg, color: annualColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, padding: '8px 18px', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Annual <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, background: 'var(--jb-v3-accent)', color: 'var(--jb-v3-accent-ink)', padding: '2px 7px', borderRadius: 2 }}>save $20</span>
                    </button>
                  </div>

                  {/* PLAN CARDS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {plans.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setPlan(p.key)}
                        style={{ position: 'relative', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 15, background: p.cardBg, border: `1.5px solid ${p.border}`, boxShadow: p.ring, borderRadius: 2, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {p.popular && (
                          <span style={{ position: 'absolute', top: -10, left: 20, fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', padding: '3px 10px', borderRadius: 2 }}>MOST POPULAR</span>
                        )}
                        <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: `1.5px solid ${p.radioBorder}`, background: p.radioBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--jb-v3-accent-ink)', fontSize: 12 }}>{p.radioMark}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: p.nameColor }}>{p.name}</span>
                          <span style={{ display: 'block', fontSize: 12.5, color: p.taglineColor, marginTop: 2 }}>{p.tagline}</span>
                        </span>
                        <span style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ display: 'block' }}>
                            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 22, fontWeight: 600, color: p.nameColor }}>{p.price}</span>
                            <span style={{ fontSize: 12, color: p.taglineColor }}>{p.per}</span>
                          </span>
                          <span style={{ display: 'block', fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: p.billColor }}>{p.billNote}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* FEATURE DELTA */}
                  <div style={{ background: 'var(--jb-v3-accent-soft)', border: '1px solid var(--jb-v3-accent-line)', borderRadius: 2, padding: 22 }}>
                    <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-v3-accent)', marginBottom: 14 }}>{delta.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {delta.items.map((d) => (
                        <div key={d.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                          <span style={{ color: 'var(--jb-v3-accent)', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <div>
                            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--jb-v3-ok)' }}>{d.title}</span>
                            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--jb-v3-fg-2)' }}>{d.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: ORDER SUMMARY + PAYMENT */}
                <div style={{ width: 380, flexShrink: 0, position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* ORDER SUMMARY */}
                  <div style={{ background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 22 }}>
                    <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', marginBottom: 16 }}>Order summary</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>Jobocate {planName}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)' }}>{cycleLabel}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 15, fontWeight: 600 }}>{priceLine}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '14px 0', borderTop: '1px solid var(--jb-v3-control)', borderBottom: '1px solid var(--jb-v3-control)', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)' }}>Subtotal</span>
                        <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 13 }}>{subtotal}</span>
                      </div>
                      {hasDiscount && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: 'var(--jb-v3-accent)' }}>Annual discount</span>
                          <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 13, color: 'var(--jb-v3-accent)' }}>−{money(discountAmt)}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>Taxes, if applicable, are calculated by Stripe.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{totalLabel}</span>
                      <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 24, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{money(total)}</span>
                    </div>
                  </div>

                  {/* PAYMENT */}
                  <div style={{ background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 22 }}>
                    <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', marginBottom: 16 }}>Secure checkout</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--jb-v3-fg-2)' }}>
                        Continue to Stripe to enter payment details. Jobocate never stores your card number.
                      </p>
                    </div>

                    <button
                      onClick={onConfirm}
                      disabled={confirming}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', border: 'none', borderRadius: 2, padding: 14, cursor: confirming ? 'default' : 'pointer', marginTop: 18, opacity: confirming ? 0.7 : 1 }}
                    >
                      {confirming ? 'Processing…' : confirmLabel}
                    </button>
                    {checkoutError && (
                      <p role="alert" style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--jb-v3-danger)' }}>{checkoutError}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 13, fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--jb-v3-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" />
                      </svg>
                      Secure payment · cancel anytime
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== SUCCESS ===== */}
          {success && (
            <div style={{ padding: '48px 32px 64px', maxWidth: 600, width: '100%', margin: '0 auto' }}>
              <div style={{ background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: '48px 36px', textAlign: 'center', animation: 'rbpop 0.35s ease' }}>
                <div style={{ width: 72, height: 72, margin: '0 auto 24px', borderRadius: '50%', background: 'var(--jb-v3-accent)', color: 'var(--jb-v3-accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>✓</div>
                <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-v3-accent)', marginBottom: 12 }}>Upgrade complete</div>
                <h1 style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 36, lineHeight: 1.05, margin: '0 0 12px' }}>You’re on {planName}.</h1>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-v3-fg-2)', margin: '0 auto 30px', maxWidth: 420 }}>{successSubs[plan]}</p>
                <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href={successHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--jb-v3-fg)', color: 'var(--jb-v3-bg)', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 2, textDecoration: 'none' }}>{successCta} →</Link>
                  <Link href={appRoute('App Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--jb-v3-panel)', color: 'var(--jb-v3-fg)', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 2, textDecoration: 'none', border: '1px solid var(--jb-v3-line-2)' }}>Back to settings</Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
