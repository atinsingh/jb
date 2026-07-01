'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const FAQ_DATA = [
  {
    q: 'What counts as an auto-apply credit?',
    a: 'One credit = one application submitted on your behalf to a verified company career page. Matching, resume building, and tracking never use credits.',
  },
  {
    q: 'Can I switch plans or cancel anytime?',
    a: 'Yes. Upgrade, downgrade, or cancel from your dashboard at any time. Changes take effect at the next billing cycle and unused annual time is prorated.',
  },
  {
    q: 'Is there a student or new-grad discount?',
    a: 'We offer 50% off Pro for verified students and recent grads in their first year out of school. Reach out from your school email to claim it.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'If Jobocate is not a fit within your first 14 days on a paid plan, contact us for a full refund — no questions asked.',
  },
  {
    q: 'How does Enterprise pricing work?',
    a: 'Enterprise is priced per seat with volume tiers, and includes SSO, admin controls, and a dedicated success manager. Talk to sales for a quote tailored to your team size.',
  },
];

const RAW_MATRIX = [
  { group: 'Job search' },
  { label: 'Smart job matching', free: '✓', pro: 'Unlimited', premium: 'Unlimited' },
  { label: 'Verified-page targeting', free: '✓', pro: '✓', premium: '✓' },
  { label: 'Saved searches & alerts', free: '3', pro: 'Unlimited', premium: 'Unlimited' },
  { group: 'Applications' },
  { label: 'Auto-apply credits / mo', free: '10', pro: '150', premium: 'Unlimited' },
  { label: 'AI resume builder', free: '✓', pro: '✓', premium: '✓' },
  { label: 'AI cover letters', free: '—', pro: '✓', premium: '✓' },
  { label: 'Per-role personalization', free: '—', pro: '✓', premium: 'Advanced' },
  { group: 'Prep & insight' },
  { label: 'Interview prep', free: '—', pro: 'Basic', premium: 'Full + feedback' },
  { label: 'Salary & offer insights', free: '—', pro: '—', premium: '✓' },
  { label: 'Support', free: 'Community', pro: 'Priority email', premium: '1:1 onboarding' },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [open, setOpen] = useState(0);

  const proPrice = annual ? '$19' : '$29';
  const premPrice = annual ? '$39' : '$59';

  const baseTiers = [
    {
      name: 'Free',
      tagline: 'Everything to start your search the smart way.',
      price: '$0',
      per: '/mo',
      billNote: 'free forever',
      cta: 'Start free',
      includesLabel: 'Includes',
      features: ['AI resume builder', 'Smart job matching', '10 auto-apply credits / mo', 'Application tracker', 'Community support'],
      popular: false,
    },
    {
      name: 'Pro',
      tagline: 'Put the busywork on autopilot.',
      price: proPrice,
      per: '/mo',
      billNote: annual ? 'billed annually · save 33%' : '',
      cta: 'Start Pro trial',
      includesLabel: 'Everything in Free, plus',
      features: ['Unlimited job matching', '150 auto-apply credits / mo', 'AI cover letters', 'Per-role personalization', 'Interview prep (basic)', 'Priority email support'],
      popular: true,
    },
    {
      name: 'Premium',
      tagline: 'Maximum volume, maximum signal.',
      price: premPrice,
      per: '/mo',
      billNote: annual ? 'billed annually · save 33%' : '',
      cta: 'Start Premium trial',
      includesLabel: 'Everything in Pro, plus',
      features: ['Unlimited auto-apply', 'Advanced personalization', 'Full AI interview prep', 'Salary & offer insights', 'Priority application routing', '1:1 onboarding'],
      popular: false,
    },
  ];

  const tiers = baseTiers.map((t) =>
    t.popular
      ? {
          ...t,
          cardBg: '#15140F',
          fg: '#FBF8F1',
          muted: '#9A9286',
          featColor: '#E4DDCE',
          border: '2px solid #1FA463',
          shadow: '0 30px 60px -30px rgba(27,26,22,0.45)',
          badgeShow: 'inline-block',
          check: '#5BD08C',
          ctaBg: '#1FA463',
          ctaColor: '#0C2C1C',
          ctaBorder: 'none',
          billNoteColor: t.billNote ? '#5BD08C' : '#9A9286',
        }
      : {
          ...t,
          cardBg: '#FBF8F1',
          fg: '#1B1A16',
          muted: '#8A8378',
          featColor: '#3B362F',
          border: '1px solid #E1D9C9',
          shadow: 'none',
          badgeShow: 'none',
          check: '#1FA463',
          ctaBg: 'transparent',
          ctaColor: '#1B1A16',
          ctaBorder: '1px solid #1B1A16',
          billNoteColor: t.billNote ? '#157A49' : '#8A8378',
        }
  );

  const matrix = RAW_MATRIX.map((m) =>
    m.group
      ? { isGroup: true, group: m.group }
      : { isGroup: false, label: m.label, free: m.free, pro: m.pro, premium: m.premium }
  );

  const monthlyBg = !annual ? '#FBF8F1' : 'transparent';
  const monthlyColor = !annual ? '#1B1A16' : '#7A7367';
  const annualBg = annual ? '#FBF8F1' : 'transparent';
  const annualColor = annual ? '#1B1A16' : '#7A7367';

  return (
    <>
      <Head>
        <title>Pricing — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbpricing * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jbpricing ::selection {
          background: #1fa463;
          color: #f7f3ea;
        }
      `}</style>

      <div
        id="jbpricing"
        style={{
          background: '#F7F3EA',
          color: '#1B1A16',
          fontFamily: "'Hanken Grotesk',sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
          <SiteNav />
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 32px 36px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#1FA463',
              marginBottom: 18,
            }}
          >
            — Pricing
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 64, lineHeight: 1.02, margin: '0 0 18px' }}>
            One interview pays for a{' '}
            <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)' }}>year.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: '#4B463E', maxWidth: 520, margin: '0 auto 30px' }}>
            Start free, upgrade when you&apos;re ready to put the whole search on autopilot. No credit card to begin.
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
                background: monthlyBg,
                color: monthlyColor,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                padding: '9px 20px',
                borderRadius: 999,
                transition: 'all 0.2s',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                background: annualBg,
                color: annualColor,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                padding: '9px 20px',
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
              }}
            >
              Annual{' '}
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10,
                  background: '#1FA463',
                  color: '#0C2C1C',
                  padding: '2px 7px',
                  borderRadius: 999,
                }}
              >
                -33%
              </span>
            </button>
          </div>
        </section>

        {/* TIERS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'start' }}>
            {tiers.map((t) => (
              <div
                key={t.name}
                style={{
                  background: t.cardBg,
                  border: t.border,
                  borderRadius: 20,
                  padding: '32px 28px',
                  position: 'relative',
                  boxShadow: t.shadow,
                }}
              >
                <div
                  style={{
                    display: t.badgeShow,
                    position: 'absolute',
                    top: -12,
                    left: 28,
                    background: '#1FA463',
                    color: '#0C2C1C',
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    padding: '5px 12px',
                    borderRadius: 999,
                  }}
                >
                  MOST POPULAR
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: t.fg, marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 13.5, color: t.muted, marginBottom: 22, minHeight: 38 }}>{t.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 54, lineHeight: 1, color: t.fg }}>{t.price}</span>
                  <span style={{ fontSize: 14, color: t.muted }}>{t.per}</span>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11.5,
                    color: t.billNoteColor,
                    minHeight: 18,
                    marginBottom: 24,
                  }}
                >
                  {t.billNote}
                </div>
                <Link
                  href={appRoute('App Login.dc.html')}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    background: t.ctaBg,
                    color: t.ctaColor,
                    border: t.ctaBorder,
                    fontSize: 15,
                    fontWeight: 600,
                    padding: 13,
                    borderRadius: 999,
                    textDecoration: 'none',
                    marginBottom: 26,
                  }}
                >
                  {t.cta}
                </Link>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: t.muted,
                    marginBottom: 14,
                  }}
                >
                  {t.includesLabel}
                </div>
                {t.features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
                    <span style={{ color: t.check, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 14, lineHeight: 1.4, color: t.featColor }}>{f}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ENTERPRISE BAND */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 32px 70px' }}>
          <div
            style={{
              background: '#15140F',
              borderRadius: 20,
              padding: '40px 44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 32,
              flexWrap: 'wrap',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 90% 50%, rgba(31,164,99,0.28), transparent 55%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', maxWidth: 560 }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#5BD08C',
                  marginBottom: 12,
                }}
              >
                — Enterprise & outplacement
              </div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.08, color: '#FBF8F1', margin: '0 0 10px' }}>
                Helping a whole team land on their feet
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: '#B8B1A4', margin: 0 }}>
                SSO, seat management, dedicated success manager, and bulk outplacement for workforce transitions. Custom pricing per seat.
              </p>
            </div>
            <Link
              href={appRoute('Enterprise.dc.html')}
              style={{
                position: 'relative',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
                background: '#1FA463',
                color: '#0C2C1C',
                fontSize: 16,
                fontWeight: 700,
                padding: '15px 28px',
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              Talk to sales <span style={{ fontSize: 18 }}>→</span>
            </Link>
          </div>
        </section>

        {/* COMPARISON MATRIX */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 32px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#1FA463',
                marginBottom: 14,
              }}
            >
              — Compare plans
            </div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 44, lineHeight: 1.05, margin: 0 }}>
              Everything, side by side
            </h2>
          </div>
          <div style={{ border: '1px solid #E1D9C9', borderRadius: 16, overflow: 'hidden', background: '#FBF8F1' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr 1fr 1fr',
                background: '#F1ECE0',
                borderBottom: '1px solid #E1D9C9',
                position: 'sticky',
                top: 72,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  padding: '16px 22px',
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#9A9286',
                }}
              >
                Feature
              </div>
              <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: 14, borderLeft: '1px solid #E1D9C9' }}>Free</div>
              <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: 14, color: '#157A49', borderLeft: '1px solid #E1D9C9', background: '#EAF6EE' }}>
                Pro
              </div>
              <div style={{ padding: '16px 18px', fontWeight: 700, fontSize: 14, borderLeft: '1px solid #E1D9C9' }}>Premium</div>
            </div>
            {matrix.map((m, i) =>
              m.isGroup ? (
                <div
                  key={`g-${i}`}
                  style={{
                    padding: '14px 22px',
                    background: '#F4EFE4',
                    borderBottom: '1px solid #E1D9C9',
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#7A7367',
                  }}
                >
                  {m.group}
                </div>
              ) : (
                <div
                  key={`r-${i}`}
                  style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', borderBottom: '1px solid #EEE7D9' }}
                >
                  <div style={{ padding: '15px 22px', fontSize: 14, fontWeight: 500 }}>{m.label}</div>
                  <div style={{ padding: '15px 18px', fontSize: 13.5, color: '#7A7367', borderLeft: '1px solid #EEE7D9' }}>{m.free}</div>
                  <div
                    style={{
                      padding: '15px 18px',
                      fontSize: 13.5,
                      color: '#1B1A16',
                      fontWeight: 600,
                      borderLeft: '1px solid #EEE7D9',
                      background: '#F4FAF6',
                    }}
                  >
                    {m.pro}
                  </div>
                  <div style={{ padding: '15px 18px', fontSize: 13.5, color: '#1B1A16', borderLeft: '1px solid #EEE7D9' }}>{m.premium}</div>
                </div>
              )
            )}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 32px 90px' }}>
          <div style={{ textAlign: 'center', marginBottom: 46 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#1FA463',
                marginBottom: 14,
              }}
            >
              — Billing FAQ
            </div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 44, lineHeight: 1.05, margin: 0 }}>Good to know</h2>
          </div>
          <div style={{ borderTop: '1px solid #E1D9C9' }}>
            {FAQ_DATA.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} style={{ borderBottom: '1px solid #E1D9C9' }}>
                  <button
                    onClick={() => setOpen((s) => (s === i ? -1 : i))}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: '22px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 20,
                      fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 600, color: '#1B1A16' }}>{item.q}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, color: '#1FA463', flexShrink: 0, lineHeight: 1 }}>
                      {isOpen ? '–' : '+'}
                    </span>
                  </button>
                  <div style={{ overflow: 'hidden', maxHeight: isOpen ? '220px' : '0px', transition: 'max-height 0.3s ease' }}>
                    <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: 0, padding: '0 4px 24px', maxWidth: 660 }}>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
