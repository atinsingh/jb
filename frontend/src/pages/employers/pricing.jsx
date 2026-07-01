'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const TIER_DATA = [
  {
    key: 'starter', name: 'Starter', tagline: 'For your first few hires.', m: 99, a: 79, popular: false,
    features: ['1 active job slot', '2 team seats', '100 AI actions / mo', '25 sourcing credits', 'Calendar integration', 'Email support'],
  },
  {
    key: 'growth', name: 'Growth', tagline: 'Hiring steadily across a few teams.', m: 299, a: 239, popular: false,
    features: ['5 active job slots', '8 team seats', '500 AI actions / mo', '150 sourcing credits', '+ Slack integration', 'Priority email support'],
  },
  {
    key: 'scale', name: 'Scale', tagline: 'High-volume hiring with full automation.', m: 699, a: 549, popular: true,
    features: ['20 active job slots', '25 team seats', '2,500 AI actions / mo', '750 sourcing credits', '+ Greenhouse, Lever, SSO', 'Dedicated CSM'],
  },
  {
    key: 'enterprise', name: 'Enterprise', tagline: 'Custom scale, security and controls.', custom: true, popular: false,
    features: ['Unlimited slots & seats', 'Custom AI actions', 'Any ATS + API', 'SAML SSO / SCIM', '24/7 support + SLA', 'Security review & DPA'],
  },
];

const MATRIX_COLS = [
  { label: 'Starter', color: '#1B1A16' },
  { label: 'Growth', color: '#1B1A16' },
  { label: 'Scale', color: '#4263EB' },
  { label: 'Enterprise', color: '#1B1A16' },
];

const MATRIX_RAW = [
  { label: 'Active job slots', vals: ['1', '5', '20', '∞'] },
  { label: 'Team seats', vals: ['2', '8', '25', '∞'] },
  { label: 'AI actions / mo', vals: ['100', '500', '2,500', 'Custom'] },
  { label: 'Sourcing credits', vals: ['25', '150', '750', 'Custom'] },
  { label: 'Autopilot & Copilot', vals: ['✓', '✓', '✓', '✓'] },
  { label: 'ATS integrations', vals: ['—', '—', '✓', '✓'] },
  { label: 'SSO / SAML', vals: ['—', '—', '✓', '✓'] },
  { label: 'Dedicated CSM', vals: ['—', '—', '✓', '✓'] },
];

const ROI = [
  { label: 'Screening hours saved / mo', value: '92 hrs', color: '#FBF8F1' },
  { label: 'Loaded recruiter cost', value: '−$13,800', color: '#FBF8F1' },
  { label: 'Scale plan', value: '+$549', color: '#9A9286' },
];

const FAQ_RAW = [
  { q: 'What counts as an “AI action”?', a: 'Any automated step — screening an applicant, drafting outreach, generating a scorecard, or scheduling an interview. Most teams use well under their monthly allowance.' },
  { q: 'Can I post a job for free?', a: 'Yes. Starter lets you post your first role and run basic matching at no cost. You only pay when you need more slots, seats or automation.' },
  { q: 'How do job slots work?', a: 'A slot is one active, published requisition. Closing or pausing a req frees its slot — and keeps all its candidate data.' },
  { q: 'Do you integrate with our ATS?', a: 'Scale and Enterprise sync two-way with Greenhouse, Lever, Workday and Ashby. Field mapping and sync frequency are configurable.' },
  { q: 'Is candidate data handled compliantly?', a: 'Yes — EEO reporting, GDPR/CCPA data-request tooling and configurable retention windows are built in. Enterprise adds a DPA and security review.' },
];

const signUpHref = appRoute('App Sign Up.dc.html');
const demoHref = appRoute('Book Demo.dc.html');

function mkCells(vals) {
  return vals.map((v) => ({
    value: v,
    weight: v === '✓' ? 700 : 600,
    color: v === '—' ? '#C9BFAC' : v === '✓' ? '#1FA463' : '#1B1A16',
  }));
}

const MATRIX = MATRIX_RAW.map((r, i, arr) => ({
  label: r.label,
  cells: mkCells(r.vals),
  divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
}));

export default function EmployerPricing() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  const tiers = TIER_DATA.map((t) => {
    const dark = t.key === 'scale';
    const price = t.custom ? null : annual ? t.a : t.m;
    return {
      key: t.key,
      name: t.name,
      tagline: t.tagline,
      cardBg: dark ? '#15140F' : '#FFFEFB',
      border: t.popular ? '2px solid #4263EB' : '1px solid #E6DECF',
      shadow: t.popular ? '0 30px 60px -34px rgba(66,99,235,0.5)' : 'none',
      badgeShow: t.popular ? 'block' : 'none',
      fg: dark ? '#FBF8F1' : '#1B1A16',
      muted: dark ? '#9A9286' : '#8A8378',
      hasPrice: !t.custom,
      noPrice: !!t.custom,
      price: t.custom ? '' : '$' + price,
      per: '/mo',
      billNote: t.custom ? 'tailored to your org' : annual ? 'billed annually' : 'billed monthly',
      billNoteColor: dark ? '#5BD08C' : '#157A49',
      cta: t.custom ? 'Talk to sales' : 'Start free',
      ctaHref: t.custom ? demoHref : signUpHref,
      ctaBg: dark ? '#4263EB' : t.popular ? '#4263EB' : '#1B1A16',
      ctaColor: '#fff',
      ctaBorder: 'none',
      includesLabel: t.key === 'starter' ? 'Includes' : 'Everything before, plus',
      check: dark ? '#5BD08C' : '#1FA463',
      featColor: dark ? '#D7D2C6' : '#3A352C',
      features: t.features,
    };
  });

  const monthlyBg = !annual ? '#FFFEFB' : 'transparent';
  const monthlyColor = !annual ? '#1B1A16' : '#7A7367';
  const annualBg = annual ? '#FFFEFB' : 'transparent';
  const annualColor = annual ? '#1B1A16' : '#7A7367';

  return (
    <>
      <Head>
        <title>Employer Pricing — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: #4263eb;
          color: #fff;
        }
      `}</style>

      <div
        id="emkt"
        style={{
          background: '#F7F3EA',
          color: '#1B1A16',
          fontFamily: "'Hanken Grotesk', sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 32px 32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #C7D2FB', background: '#EDF0FE', borderRadius: 999, padding: '6px 13px', marginBottom: 18 }}>
            <span style={{ color: '#1FA463' }}>✦</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#364FC7' }}>For employers · pricing</span>
          </div>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 62, lineHeight: 1.02, margin: '0 0 18px' }}>
            One AI recruiter. <span style={{ background: 'linear-gradient(transparent 56%, rgba(66,99,235,0.28) 56%)' }}>A fraction of the cost.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: '#4B463E', maxWidth: 540, margin: '0 auto 30px' }}>
            Every plan includes job slots, team seats and AI actions. Post your first role free — upgrade when you’re hiring at volume.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F1ECE0', border: '1px solid #E1D9C9', borderRadius: 999, padding: 5 }}>
            <button onClick={() => setAnnual(false)} style={{ background: monthlyBg, color: monthlyColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 20px', borderRadius: 999, transition: 'all 0.2s' }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{ background: annualBg, color: annualColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 20px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
              Annual <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, background: '#1FA463', color: '#0C2C1C', padding: '2px 7px', borderRadius: 999 }}>−25%</span>
            </button>
          </div>
        </section>

        {/* TIERS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, alignItems: 'stretch' }}>
            {tiers.map((t) => (
              <div key={t.key} style={{ display: 'flex', flexDirection: 'column', background: t.cardBg, border: t.border, borderRadius: 20, padding: '28px 24px', position: 'relative', boxShadow: t.shadow }}>
                <div style={{ display: t.badgeShow, position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#4263EB', color: '#fff', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', padding: '5px 12px', borderRadius: 999 }}>MOST POPULAR</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: t.fg, marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: t.muted, marginBottom: 20, minHeight: 50 }}>{t.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  {t.hasPrice && (
                    <>
                      <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 46, lineHeight: 1, color: t.fg }}>{t.price}</span>
                      <span style={{ fontSize: 13, color: t.muted }}>{t.per}</span>
                    </>
                  )}
                  {t.noPrice && (
                    <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 34, lineHeight: 1.2, color: t.fg }}>Custom</span>
                  )}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: t.billNoteColor, minHeight: 18, marginBottom: 22 }}>{t.billNote}</div>
                <Link href={t.ctaHref} style={{ display: 'block', textAlign: 'center', background: t.ctaBg, color: t.ctaColor, border: t.ctaBorder, fontSize: 14.5, fontWeight: 600, padding: 12, borderRadius: 999, textDecoration: 'none', marginBottom: 24 }}>{t.cta}</Link>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted, marginBottom: 13 }}>{t.includesLabel}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {t.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <span style={{ color: t.check, fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, lineHeight: 1.4, color: t.featColor }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON MATRIX */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.06, textAlign: 'center', margin: '0 0 28px' }}>Compare every plan</h2>
          <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 10, padding: '16px 22px', background: '#FBF9F4', borderBottom: '1px solid #F2ECE0' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286' }}>Feature</span>
              {MATRIX_COLS.map((c) => (
                <span key={c.label} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: c.color }}>{c.label}</span>
              ))}
            </div>
            {MATRIX.map((row) => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 10, alignItems: 'center', padding: '13px 22px', borderBottom: `1px solid ${row.divider}` }}>
                <span style={{ fontSize: 13.5, color: '#3A352C' }}>{row.label}</span>
                {row.cells.map((cell, ci) => (
                  <span key={ci} style={{ textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: cell.weight, color: cell.color }}>{cell.value}</span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ROI CALCULATOR TEASER */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 32px 40px' }}>
          <div style={{ background: '#15140F', borderRadius: 24, padding: 44, display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 12 }}>ROI calculator</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.08, color: '#FBF8F1', margin: '0 0 12px' }}>See what you’d save.</h2>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: '#B8B1A4', margin: '0 0 22px' }}>Most teams spend 23 hours screening per hire. At Stripe’s rate, Autopilot pays for Scale in the first month.</p>
              <Link href={demoHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4263EB', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 22px', borderRadius: 999, textDecoration: 'none' }}>Get your custom ROI →</Link>
            </div>
            <div style={{ background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ROI.map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13.5, color: '#9A9286' }}>{r.label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 600, color: r.color }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: '#2C2A22' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>Net monthly saving</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: '#5BD08C' }}>$14,200</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 64px' }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.06, textAlign: 'center', margin: '0 0 28px' }}>Questions, answered</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQ_RAW.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <button
                  key={f.q}
                  onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
                  style={{ textAlign: 'left', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 15.5, fontWeight: 600, color: '#1B1A16' }}>{f.q}</span>
                    <span style={{ color: '#4263EB', fontSize: 18, transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>+</span>
                  </div>
                  {isOpen && (
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: '#5A544A', margin: '12px 0 0' }}>{f.a}</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 28, padding: '64px 48px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 44, lineHeight: 1.04, margin: '0 0 14px' }}>Start hiring free today.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: '#3F4A7A', margin: '0 auto 28px', maxWidth: 460 }}>Post your first role at no cost. Upgrade only when you’re ready to scale.</p>
            <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={signUpHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#4263EB', color: '#fff', fontSize: 16, fontWeight: 700, padding: '15px 28px', borderRadius: 999, textDecoration: 'none' }}>Start hiring free <span>→</span></Link>
              <Link href={demoHref} style={{ display: 'inline-flex', alignItems: 'center', background: '#FFFEFB', color: '#1B1A16', fontSize: 16, fontWeight: 600, padding: '15px 28px', borderRadius: 999, textDecoration: 'none', border: '1px solid #C7D2FB' }}>Talk to sales</Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
