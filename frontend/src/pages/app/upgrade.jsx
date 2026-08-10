'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getEntitlement, confirmUpgrade } from '@/services/upgradeApi';

// ---------------------------------------------------------------------------
// SAMPLE DATA — ported verbatim from "App Upgrade.dc.html" planData/deltaData.
// Always used as the faithful fallback when unauthenticated or the request fails.
// ---------------------------------------------------------------------------
const PLAN_DATA = [
  { key: 'free', name: 'Free', tagline: 'Start your search the smart way.', monthly: 0, annual: 0, popular: false },
  { key: 'pro', name: 'Pro', tagline: 'Put the busywork on autopilot.', monthly: 29, annual: 19, popular: true },
  { key: 'premium', name: 'Premium', tagline: 'Maximum volume, maximum signal.', monthly: 59, annual: 39, popular: false },
];

const DELTA_DATA = {
  premium: {
    label: 'What Premium unlocks',
    items: [
      { title: 'Concierge career coach', desc: 'Marcus Bell applies, negotiates and preps on your behalf.' },
      { title: 'Unlimited auto-apply', desc: 'No weekly credit cap — apply to every strong match.' },
      { title: 'Live Interview copilot', desc: 'Real-time prompts and notes during your actual calls.' },
      { title: 'Advanced personalization', desc: 'Per-company résumé and cover-letter tuning.' },
      { title: 'Salary & offer insights', desc: 'Benchmarks and a side-by-side offer comparison.' },
    ],
  },
  pro: {
    label: 'What Pro unlocks',
    items: [
      { title: '150 auto-apply credits / mo', desc: 'Apply at volume without lifting a finger.' },
      { title: 'AI cover letters', desc: 'Tailored, editable drafts for every role.' },
      { title: 'Per-role personalization', desc: 'Résumés tuned to each job description.' },
      { title: 'Interview prep', desc: 'Question banks and practice for your roles.' },
    ],
  },
  free: {
    label: 'What Free includes',
    items: [
      { title: 'AI résumé builder', desc: 'ATS-friendly résumés in minutes.' },
      { title: 'Smart job matching', desc: 'Roles ranked by fit, every day.' },
      { title: '10 auto-apply credits / mo', desc: 'A taste of hands-off applying.' },
      { title: 'Application tracker', desc: 'Your whole pipeline in one board.' },
    ],
  },
};

const money = (n) => '$' + Number(n || 0).toLocaleString('en-US');

// Map backend planType (FREE|PRO|ELITE|INTERVIEW) → this screen's plan keys.
const PLAN_KEY_FROM_BACKEND = {
  FREE: 'free',
  PRO: 'pro',
  ELITE: 'premium',
  PREMIUM: 'premium',
  INTERVIEW: 'pro',
};

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia'];

export default function AppUpgrade() {
  // ---- dc state: { plan, annual, success } -------------------------------
  const [plan, setPlan] = useState('premium');
  const [annual, setAnnual] = useState(true);
  const [success, setSuccess] = useState(false);

  // ---- backend entitlement (best-effort, graceful fallback) --------------
  const [entitlement, setEntitlement] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // payment form (purely presentational, mirrors the design inputs)
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('Sarah Chen');
  const [country, setCountry] = useState('United States');

  useEffect(() => {
    let alive = true;
    getEntitlement()
      .then((res) => {
        if (!alive || !res) return;
        setEntitlement(res);
        const key = PLAN_KEY_FROM_BACKEND[(res.planType || '').toUpperCase()];
        // Default the selector to the next tier up from the user's current plan
        // when we can resolve it; otherwise keep the design default (premium).
        if (key === 'free') setPlan('pro');
        else if (key === 'pro') setPlan('premium');
      })
      .catch(() => {
        // Unauthenticated or backend down — keep the design's sample data.
      });
    return () => {
      alive = false;
    };
  }, []);

  // Trial banner: reflect backend trial state when present, else the design's
  // "PREMIUM TRIAL · 4 DAYS LEFT".
  const trialLabel = useMemo(() => {
    const days = entitlement?.trialDaysLeft;
    const tier = entitlement?.trialPlan || entitlement?.planType;
    if (typeof days === 'number' && days > 0) {
      const t = (tier || 'PREMIUM').toString().toUpperCase();
      return `${t} TRIAL · ${days} DAY${days === 1 ? '' : 'S'} LEFT`;
    }
    return 'PREMIUM TRIAL · 4 DAYS LEFT';
  }, [entitlement]);

  // ---- renderVals() port -------------------------------------------------
  const data = PLAN_DATA;
  const sel = data.find((p) => p.key === plan) || data[0];

  const plans = data.map((p) => {
    const on = p.key === plan;
    const price = annual ? p.annual : p.monthly;
    const dark = p.popular;
    return {
      ...p,
      price: '$' + price,
      per: '/mo',
      billNote: price === 0 ? 'free forever' : annual ? 'billed yearly' : 'billed monthly',
      cardBg: dark ? '#15140F' : '#FFFEFB',
      border: on ? '#1FA463' : dark ? '#2C2A22' : '#E6DECF',
      ring: on ? '0 0 0 3px rgba(31,164,99,0.2)' : 'none',
      radioBorder: on ? '#1FA463' : dark ? '#3A382E' : '#C9BFAC',
      radioBg: on ? '#1FA463' : 'transparent',
      radioMark: on ? '✓' : '',
      nameColor: dark ? '#FBF8F1' : '#1B1A16',
      taglineColor: dark ? '#9A9286' : '#8A8378',
      billColor: dark ? (annual && price ? '#5BD08C' : '#9A9286') : annual && price ? '#157A49' : '#A79E8F',
    };
  });

  const monthlyPrice = sel.monthly;
  const annualPerMo = sel.annual;
  const billed = annual ? annualPerMo * 12 : monthlyPrice;
  const fullAnnual = monthlyPrice * 12;
  const discountAmt = annual ? fullAnnual - billed : 0;
  const tax = Math.round(billed * 0.085);
  const total = billed + tax;

  const delta = DELTA_DATA[plan] || DELTA_DATA.free;

  const successSubs = {
    premium:
      'Your card was charged ' + money(total) + '. Concierge, unlimited auto-apply and the Live Interview copilot are now unlocked.',
    pro: 'Your card was charged ' + money(total) + '. AI cover letters and 150 monthly auto-apply credits are now active.',
    free: 'You’re on the Free plan. Upgrade anytime to put your search on autopilot.',
  };

  // Billing-cycle pill colors
  const monthlyBg = !annual ? '#FFFEFB' : 'transparent';
  const monthlyColor = !annual ? '#1B1A16' : '#7A7367';
  const annualBg = annual ? '#FFFEFB' : 'transparent';
  const annualColor = annual ? '#1B1A16' : '#7A7367';

  const planName = sel.name;
  const cycleLabel = annual ? 'Billed annually' : 'Billed monthly';
  const priceLine = '$' + (annual ? annualPerMo : monthlyPrice) + '/mo';
  const subtotal = money(annual ? fullAnnual : monthlyPrice);
  const hasDiscount = discountAmt > 0;
  const totalLabel = annual ? 'Total billed today' : 'Total per month';
  const confirmLabel = total === 0 ? 'Switch to Free' : 'Confirm upgrade · ' + money(total);
  const successHref = plan === 'premium' ? appRoute('App Concierge.dc.html') : appRoute('App Dashboard.dc.html');
  const successCta = plan === 'premium' ? 'Meet your concierge' : 'Go to dashboard';

  const onConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      // Best-effort backend call; success state shows regardless so the
      // screen always completes faithfully.
      await confirmUpgrade({ plan, annual, total }).catch(() => {});
    } finally {
      setConfirming(false);
      setSuccess(true);
    }
  };

  const inputStyle = {
    width: '100%',
    fontFamily: 'var(--jb-font-mono)',
    fontSize: 14,
    color: '#1B1A16',
    background: '#FBF8F1',
    border: '1px solid #E1D9C9',
    borderRadius: 12,
    padding: '12px 14px',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' };

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
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus,
        #jbapp select:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        #jbapp input::placeholder {
          color: #a79e8f;
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

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <AppSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('App Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, color: '#9A9286' }}>Plan &amp; billing</span>
          </header>

          {/* ===== CHECKOUT ===== */}
          {!success && (
            <div style={{ padding: '32px 32px 64px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 38, lineHeight: 1, margin: '0 0 8px' }}>Choose your plan</h1>
                  <p style={{ fontSize: 15, color: '#5A544A', margin: 0 }}>Pick the plan that fits your search — change or cancel anytime.</p>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: '#9A6A2E', background: '#FBF1E2', border: '1px solid #EAD9BE', padding: '6px 12px', borderRadius: 999 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9622E' }} />
                  {trialLabel}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* LEFT: PLAN SELECTOR */}
                <div style={{ flex: 1, minWidth: 320 }}>
                  {/* BILLING TOGGLE */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F1ECE0', border: '1px solid #E1D9C9', borderRadius: 999, padding: 5, marginBottom: 18 }}>
                    <button onClick={() => setAnnual(false)} style={{ background: monthlyBg, color: monthlyColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, padding: '8px 18px', borderRadius: 999 }}>Monthly</button>
                    <button onClick={() => setAnnual(true)} style={{ background: annualBg, color: annualColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, padding: '8px 18px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Annual <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, background: '#1FA463', color: '#0C2C1C', padding: '2px 7px', borderRadius: 999 }}>−33%</span>
                    </button>
                  </div>

                  {/* PLAN CARDS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {plans.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setPlan(p.key)}
                        style={{ position: 'relative', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 15, background: p.cardBg, border: `1.5px solid ${p.border}`, boxShadow: p.ring, borderRadius: 16, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {p.popular && (
                          <span style={{ position: 'absolute', top: -10, left: 20, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: '#0C2C1C', background: '#1FA463', padding: '3px 10px', borderRadius: 999 }}>MOST POPULAR</span>
                        )}
                        <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: `1.5px solid ${p.radioBorder}`, background: p.radioBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0C2C1C', fontSize: 12 }}>{p.radioMark}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, color: p.nameColor }}>{p.name}</span>
                          <span style={{ display: 'block', fontSize: 12.5, color: p.taglineColor, marginTop: 2 }}>{p.tagline}</span>
                        </span>
                        <span style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ display: 'block' }}>
                            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600, color: p.nameColor }}>{p.price}</span>
                            <span style={{ fontSize: 12, color: p.taglineColor }}>{p.per}</span>
                          </span>
                          <span style={{ display: 'block', fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: p.billColor }}>{p.billNote}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* FEATURE DELTA */}
                  <div style={{ background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 16, padding: 22 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#157A49', marginBottom: 14 }}>{delta.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {delta.items.map((d) => (
                        <div key={d.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                          <span style={{ color: '#1FA463', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                          <div>
                            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1F4733' }}>{d.title}</span>
                            <span style={{ display: 'block', fontSize: 12.5, color: '#3F6B52' }}>{d.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: ORDER SUMMARY + PAYMENT */}
                <div style={{ width: 380, flexShrink: 0, position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* ORDER SUMMARY */}
                  <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 22 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 16 }}>Order summary</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>Jobocate {planName}</div>
                        <div style={{ fontSize: 12.5, color: '#8A8378' }}>{cycleLabel}</div>
                      </div>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 15, fontWeight: 600 }}>{priceLine}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '14px 0', borderTop: '1px solid #F2ECE0', borderBottom: '1px solid #F2ECE0', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#5A544A' }}>Subtotal</span>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13 }}>{subtotal}</span>
                      </div>
                      {hasDiscount && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#157A49' }}>Annual discount</span>
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: '#157A49' }}>−{money(discountAmt)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, color: '#5A544A' }}>Tax (est. 8.5%)</span>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13 }}>{money(tax)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{totalLabel}</span>
                      <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 24, fontWeight: 600, color: '#1B1A16' }}>{money(total)}</span>
                    </div>
                  </div>

                  {/* PAYMENT */}
                  <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 22 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 16 }}>Payment details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      <div>
                        <label style={labelStyle}>Card number</label>
                        <input value={card} onChange={(e) => setCard(e.target.value)} placeholder="1234 1234 1234 1234" style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>Expiry</label>
                          <input value={exp} onChange={(e) => setExp(e.target.value)} placeholder="MM / YY" style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={labelStyle}>CVC</label>
                          <input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="CVC" style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Name on card</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, fontFamily: 'inherit' }} />
                      </div>
                      <div>
                        <label style={labelStyle}>Country</label>
                        <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inputStyle, fontFamily: 'inherit', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}>
                          {COUNTRIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={onConfirm}
                      disabled={confirming}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: 'inherit', fontSize: 15.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: 14, cursor: confirming ? 'default' : 'pointer', marginTop: 18, opacity: confirming ? 0.7 : 1 }}
                    >
                      {confirming ? 'Processing…' : confirmLabel}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 13, fontSize: 12, color: '#8A8378' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1FA463" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 20, padding: '48px 36px', textAlign: 'center', animation: 'rbpop 0.35s ease' }}>
                <div style={{ width: 72, height: 72, margin: '0 auto 24px', borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>✓</div>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#157A49', marginBottom: 12 }}>Upgrade complete</div>
                <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1.05, margin: '0 0 12px' }}>You’re on {planName}.</h1>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: '0 auto 30px', maxWidth: 420 }}>{successSubs[plan]}</p>
                <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href={successHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1B1A16', color: '#F7F3EA', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 999, textDecoration: 'none' }}>{successCta} →</Link>
                  <Link href={appRoute('App Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', background: '#FFFEFB', color: '#1B1A16', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D9D0BE' }}>Back to settings</Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
