'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getSubscription, submitCancellation, acceptRetentionOffer } from '@/services/cancelApi';

// ---- Design sample data (faithful fallback when unauthenticated / offline) ----
const SAMPLE_RENEWAL = 'Jul 28, 2026';

const REASON_DEFS = [
  { key: 'expensive', label: 'It’s too expensive' },
  { key: 'found_job', label: 'I found a job 🎉' },
  { key: 'not_using', label: 'I’m not using it enough' },
  { key: 'missing', label: 'It’s missing features I need' },
  { key: 'other', label: 'Something else' },
];

const OFFERS = {
  expensive: {
    badge: '50% OFF · 3 MONTHS',
    headline: 'Stay for half the price.',
    body: 'Keep every Premium feature at $19.50/mo for your next three billing cycles. No strings — it reverts to your normal rate after.',
    accept: 'Apply discount & stay',
    successNote: 'Your 50% discount is applied for the next three months. Nothing else changes.',
  },
  found_job: {
    badge: 'PAUSE INSTEAD',
    headline: 'Congrats on the new role! 🎉',
    body: 'Before you go — pause instead of cancelling. We’ll hold your profile, matches and history so it’s all here if you’re ever back on the market.',
    accept: 'Pause for free instead',
    successNote: 'Your membership is paused. Resume anytime from Settings — your data stays exactly as it is.',
  },
  not_using: {
    badge: 'DOWNGRADE TO PRO',
    headline: 'Pay less for what you use.',
    body: 'Not touching everything? Drop to Pro at $19/mo — keep matching, auto-apply credits and AI cover letters without the Premium extras.',
    accept: 'Switch to Pro',
    successNote: 'You’re now on Pro at $19/mo. You keep matching, auto-apply and cover letters.',
  },
  missing: {
    badge: '1 MONTH FREE',
    headline: 'Let’s make it work.',
    body: 'Tell us what’s missing and get a month of Premium on us while we look into it. Marcus will follow up with you personally.',
    accept: 'Get a free month',
    successNote: 'Your next month is on us. Marcus will reach out about what you need.',
  },
  other: {
    badge: 'PAUSE INSTEAD',
    headline: 'Take a break — keep your data.',
    body: 'Pause your membership instead of cancelling. We’ll hold your profile and history, and you can pick up right where you left off.',
    accept: 'Pause instead',
    successNote: 'Your membership is paused. Resume anytime — everything is saved.',
  },
};

// Maps an accepted offer to its retention outcome token for the backend.
const OFFER_OUTCOME = {
  expensive: 'discounted',
  found_job: 'paused',
  not_using: 'downgraded',
  missing: 'free_month',
  other: 'paused',
};

const LOSING = [
  'Concierge career coach — Marcus Bell',
  'Unlimited auto-apply',
  'Live Interview copilot',
  'Advanced per-company personalization',
  'Salary & offer insights',
];

const offerFor = (reason) => OFFERS[reason] || OFFERS.other;

export default function AppCancel() {
  const [step, setStep] = useState(0); // 0 reason · 1 offer · 2 confirm
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(null); // null | 'stay' | 'kept' | 'cancelled'
  const [renewal, setRenewal] = useState(SAMPLE_RENEWAL);

  // Fetch real subscription/renewal info; gracefully fall back to sample data.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getSubscription();
        if (!alive || !data) return;
        const raw =
          data.renewalDate || data.renewsAt || data.currentPeriodEnd || data.expiresAt;
        if (raw) {
          const d = new Date(raw);
          if (!Number.isNaN(d.getTime())) {
            setRenewal(
              d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            );
          }
        }
      } catch {
        // Unauthenticated or backend offline — keep sample renewal date.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const offer = offerFor(reason);
  const canCont = !!reason;
  const sType = success;
  const inFlow = !sType;
  const stepLabel = `Step ${step + 1} of 3`;

  const isReason = !sType && step === 0;
  const isOffer = !sType && step === 1;
  const isConfirm = !sType && step === 2;
  const isSuccess = !!sType;

  // ---- actions (fire-and-forget backend, never block the faithful UI) ----
  const next = () => {
    if (canCont) setStep(1);
  };
  const acceptOffer = () => {
    acceptRetentionOffer({ reason, offer: OFFER_OUTCOME[reason] || 'paused' }).catch(() => {});
    setSuccess('stay');
  };
  const continueCancel = () => setStep(2);
  const confirmCancel = () => {
    submitCancellation({ reason, note, outcome: 'cancelled' }).catch(() => {});
    setSuccess('cancelled');
  };
  const keep = () => {
    submitCancellation({ reason, note, outcome: 'kept' }).catch(() => {});
    setSuccess('kept');
  };

  // ---- success content ----
  let sc;
  if (sType === 'stay') {
    sc = {
      icon: '✓',
      iconBg: '#1FA463',
      iconColor: '#0C2C1C',
      title: 'You’re staying on Premium.',
      body: offer.successNote,
      cta: 'Back to settings',
      href: appRoute('App Settings.dc.html'),
      secondary: false,
    };
  } else if (sType === 'kept') {
    sc = {
      icon: '✓',
      iconBg: '#1FA463',
      iconColor: '#0C2C1C',
      title: 'Glad you’re staying.',
      body: 'Your Premium membership is unchanged — we’ll keep working your search in the background.',
      cta: 'Back to dashboard',
      href: appRoute('App Dashboard.dc.html'),
      secondary: false,
    };
  } else {
    sc = {
      icon: '◷',
      iconBg: '#F2ECE0',
      iconColor: '#8A8378',
      title: 'Membership cancelled.',
      body: `Your Premium access stays active until ${renewal}, then you’ll move to the Free plan. Your data is never deleted.`,
      cta: 'Back to settings',
      href: appRoute('App Settings.dc.html'),
      secondary: true,
    };
  }

  const contColor = canCont ? '#0C2C1C' : '#8FB7A1';
  const contBg = canCont ? '#1FA463' : '#CFE6D8';
  const contCursor = canCont ? 'pointer' : 'default';

  return (
    <>
      <Head>
        <title>Cancel membership — Jobocate</title>
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
        #jbapp textarea:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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
            {inFlow && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11.5,
                  color: '#9A9286',
                }}
              >
                {stepLabel}
              </span>
            )}
          </header>

          <div style={{ padding: '40px 32px 64px', maxWidth: 560, width: '100%', margin: '0 auto' }}>
            {/* STEP 1: REASON */}
            {isReason && (
              <div style={{ animation: 'rbpop 0.25s ease' }}>
                <h1
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 34,
                    lineHeight: 1.06,
                    margin: '0 0 6px',
                  }}
                >
                  Before you go…
                </h1>
                <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 24px' }}>
                  What’s prompting the cancellation? This helps us improve — and might surface a
                  better option.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {REASON_DEFS.map((r) => {
                    const on = reason === r.key;
                    return (
                      <button
                        key={r.key}
                        onClick={() => setReason(r.key)}
                        style={{
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 13,
                          background: on ? '#EAF6EE' : '#FFFEFB',
                          border: `1.5px solid ${on ? '#1FA463' : '#E6DECF'}`,
                          borderRadius: 13,
                          padding: '15px 17px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            borderRadius: '50%',
                            border: `1.5px solid ${on ? '#1FA463' : '#C9BFAC'}`,
                            background: on ? '#1FA463' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: on ? '#FFFFFF' : 'transparent',
                            }}
                          />
                        </span>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#1B1A16' }}>
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything else you’d like us to know? (optional)"
                  style={{
                    width: '100%',
                    minHeight: 90,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #E1D9C9',
                    borderRadius: 13,
                    padding: 14,
                    resize: 'vertical',
                    marginBottom: 22,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link
                    href={appRoute('App Settings.dc.html')}
                    style={{
                      fontSize: 14.5,
                      fontWeight: 600,
                      color: '#5A544A',
                      textDecoration: 'none',
                    }}
                  >
                    Never mind
                  </Link>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={next}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 9,
                      fontFamily: 'inherit',
                      fontSize: 15,
                      fontWeight: 700,
                      color: contColor,
                      background: contBg,
                      border: 'none',
                      borderRadius: 999,
                      padding: '14px 26px',
                      cursor: contCursor,
                    }}
                  >
                    Continue <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: RETENTION OFFER */}
            {isOffer && (
              <div style={{ animation: 'rbpop 0.25s ease' }}>
                <div
                  style={{
                    background: '#15140F',
                    border: '1px solid #2C2A22',
                    borderRadius: 20,
                    padding: 32,
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(circle at 88% 10%, rgba(31,164,99,0.3), transparent 55%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        color: '#0C2C1C',
                        background: '#5BD08C',
                        padding: '4px 11px',
                        borderRadius: 999,
                        marginBottom: 16,
                      }}
                    >
                      {offer.badge}
                    </span>
                    <h1
                      style={{
                        fontFamily: "'Instrument Serif',serif",
                        fontWeight: 400,
                        fontSize: 32,
                        lineHeight: 1.08,
                        color: '#FBF8F1',
                        margin: '0 0 12px',
                      }}
                    >
                      {offer.headline}
                    </h1>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: '#B8B1A4', margin: 0 }}>
                      {offer.body}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={continueCancel}
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#A79E8F',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: '8px 4px',
                    }}
                  >
                    No thanks, continue cancelling
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={acceptOffer}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0C2C1C',
                      background: '#1FA463',
                      border: 'none',
                      borderRadius: 999,
                      padding: '14px 26px',
                      cursor: 'pointer',
                    }}
                  >
                    {offer.accept}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CONFIRM */}
            {isConfirm && (
              <div style={{ animation: 'rbpop 0.25s ease' }}>
                <h1
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 34,
                    lineHeight: 1.06,
                    margin: '0 0 6px',
                  }}
                >
                  You’ll lose access to…
                </h1>
                <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 22px' }}>
                  Cancelling drops you to the Free plan. Here’s what goes away when your access ends.
                </p>
                <div
                  style={{
                    background: '#FFFEFB',
                    border: '1px solid #EAD0C4',
                    borderRadius: 16,
                    padding: 22,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                    {LOSING.map((l) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                        <span
                          style={{
                            color: '#C9622E',
                            fontSize: 14,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          ✕
                        </span>
                        <span
                          style={{
                            fontSize: 14.5,
                            lineHeight: 1.45,
                            color: '#7A4326',
                            textDecoration: 'line-through',
                            textDecorationColor: '#E0B7A4',
                          }}
                        >
                          {l}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    background: '#FBF9F2',
                    border: '1px solid #E6DECF',
                    borderRadius: 13,
                    marginBottom: 24,
                  }}
                >
                  <span style={{ color: '#9A9286', flexShrink: 0 }}>◷</span>
                  <span style={{ fontSize: 13.5, color: '#5A544A' }}>
                    Your Premium access stays active until{' '}
                    <b style={{ color: '#1B1A16' }}>{renewal}</b>. Your data is never deleted.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    onClick={confirmCancel}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#C9622E',
                      background: '#FFFEFB',
                      border: '1px solid #EAD0C4',
                      borderRadius: 999,
                      padding: '13px 20px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel membership
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={keep}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#0C2C1C',
                      background: '#1FA463',
                      border: 'none',
                      borderRadius: 999,
                      padding: '14px 24px',
                      cursor: 'pointer',
                    }}
                  >
                    Never mind, keep Premium
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {isSuccess && (
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 20,
                  padding: '48px 36px',
                  textAlign: 'center',
                  animation: 'rbpop 0.35s ease',
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    margin: '0 auto 22px',
                    borderRadius: '50%',
                    background: sc.iconBg,
                    color: sc.iconColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                  }}
                >
                  {sc.icon}
                </div>
                <h1
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 34,
                    lineHeight: 1.06,
                    margin: '0 0 10px',
                  }}
                >
                  {sc.title}
                </h1>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#5A544A',
                    margin: '0 auto 28px',
                    maxWidth: 400,
                  }}
                >
                  {sc.body}
                </p>
                <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={sc.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#1B1A16',
                      color: '#F7F3EA',
                      fontSize: 15,
                      fontWeight: 600,
                      padding: '14px 24px',
                      borderRadius: 999,
                      textDecoration: 'none',
                    }}
                  >
                    {sc.cta} →
                  </Link>
                  {sc.secondary && (
                    <Link
                      href={appRoute('App Upgrade.dc.html')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        background: '#FFFEFB',
                        color: '#1B1A16',
                        fontSize: 15,
                        fontWeight: 600,
                        padding: '14px 24px',
                        borderRadius: 999,
                        textDecoration: 'none',
                        border: '1px solid #D9D0BE',
                      }}
                    >
                      Resubscribe
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
