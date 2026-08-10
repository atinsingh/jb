'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
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
  { label: 'Starter', color: 'var(--jb-d-ink)' },
  { label: 'Growth', color: 'var(--jb-d-ink)' },
  { label: 'Scale', color: '#7cc4ff' },
  { label: 'Enterprise', color: 'var(--jb-d-ink)' },
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
  { label: 'Scale plan', value: '+$549', color: 'var(--jb-d-ink-55)' },
];

const FAQ_RAW = [
  { q: 'What counts as an “AI action”?', a: 'Any automated step — screening an applicant, drafting outreach, generating a scorecard, or scheduling an interview. Most teams use well under their monthly allowance.' },
  { q: 'Can I post a job for free?', a: 'Yes. Starter lets you post your first role and run basic matching at no cost. You only pay when you need more slots, seats or automation.' },
  { q: 'How do job slots work?', a: 'A slot is one active, published requisition. Closing or pausing a req frees its slot — and keeps all its candidate data.' },
  { q: 'Do you integrate with our ATS?', a: 'Scale and Enterprise sync two-way with Greenhouse, Lever, Workday and Ashby. Field mapping and sync frequency are configurable.' },
  { q: 'Is candidate data handled compliantly?', a: 'Yes — EEO reporting, GDPR/CCPA data-request tooling and configurable retention windows are built in. Enterprise adds a DPA and security review.' },
];

const signUpHref = `${appRoute('App Sign Up.dc.html')}?as=employer`;
const demoHref = appRoute('Book Demo.dc.html');

function mkCells(vals) {
  return vals.map((v) => ({
    value: v,
    weight: v === '✓' ? 700 : 600,
    color: v === '—' ? '#C9BFAC' : v === '✓' ? 'var(--jb-d-accent)' : 'var(--jb-d-ink)',
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
      cardBg: dark ? 'var(--jb-d-footer)' : 'var(--jb-d-panel)',
      border: t.popular ? '2px solid #7cc4ff' : '1px solid var(--jb-d-line-card)',
      shadow: t.popular ? '0 30px 60px -34px rgba(66,99,235,0.5)' : 'none',
      badgeShow: t.popular ? 'block' : 'none',
      fg: dark ? '#FBF8F1' : 'var(--jb-d-ink)',
      muted: dark ? 'var(--jb-d-ink-55)' : 'var(--jb-d-ink-65)',
      hasPrice: !t.custom,
      noPrice: !!t.custom,
      price: t.custom ? '' : '$' + price,
      per: '/mo',
      billNote: t.custom ? 'tailored to your org' : annual ? 'billed annually' : 'billed monthly',
      billNoteColor: dark ? 'var(--jb-d-accent)' : 'var(--jb-d-accent)',
      cta: t.custom ? 'Talk to sales' : 'Start free',
      ctaHref: t.custom ? demoHref : signUpHref,
      ctaBg: dark ? '#7cc4ff' : t.popular ? '#7cc4ff' : 'var(--jb-d-footer)',
      ctaColor: '#fff',
      ctaBorder: 'none',
      includesLabel: t.key === 'starter' ? 'Includes' : 'Everything before, plus',
      check: dark ? 'var(--jb-d-accent)' : 'var(--jb-d-accent)',
      featColor: dark ? '#D7D2C6' : 'var(--jb-d-ink-85)',
      features: t.features,
    };
  });

  const monthlyBg= !annual ? 'var(--jb-d-panel)' : 'transparent';
  const monthlyColor= !annual ? 'var(--jb-d-ink)' : 'var(--jb-d-ink-65)';
  const annualBg= annual ? 'var(--jb-d-panel)' : 'transparent';
  const annualColor= annual ? 'var(--jb-d-ink)' : 'var(--jb-d-ink-65)';

  return (
    <>
      <Head>
        <title>Employer Pricing — Jobocate</title>
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: #7cc4ff;
          color: #fff;
        }
      `}</style>

      <div
        id="emkt"
        style={{
          background: 'transparent',
          color: 'var(--jb-d-ink)',
          fontFamily: 'var(--jb-font-sans)',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <PublicLayout variant="employer">

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 32px 32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(124,196,255,0.3)', background: 'rgba(124,196,255,0.12)', borderRadius: 999, padding: '6px 13px', marginBottom: 18 }}>
            <span style={{ color: 'var(--jb-d-accent)' }}>✦</span>
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7cc4ff' }}>For employers · pricing</span>
          </div>
          <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(29px, 6vw, 62px)', lineHeight: 1.02, margin: '0 0 18px' }}>
            One hiring platform. <span style={{ background: 'linear-gradient(transparent 56%, rgba(66,99,235,0.28) 56%)' }}>Priced by how you hire.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', maxWidth: 540, margin: '0 auto 30px' }}>
            Every plan includes job slots, team seats and AI actions. Post your first role free — upgrade only when you’re hiring at volume.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--jb-d-glass)', border: '1px solid var(--jb-d-line-card)', borderRadius: 999, padding: 5 }}>
            <button onClick={() => setAnnual(false)} style={{ background: monthlyBg, color: monthlyColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 20px', borderRadius: 999, transition: 'all 0.2s' }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{ background: annualBg, color: annualColor, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 20px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
              Annual <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', padding: '2px 7px', borderRadius: 999 }}>−25%</span>
            </button>
          </div>
        </section>

        {/* TIERS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 30px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 16, alignItems: 'stretch' }}>
            {tiers.map((t) => (
              <div key={t.key} style={{ display: 'flex', flexDirection: 'column', background: t.cardBg, border: t.border, borderRadius: 20, padding: '28px 24px', position: 'relative', boxShadow: t.shadow }}>
                <div style={{ display: t.badgeShow, position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#7cc4ff', color: 'var(--jb-d-panel)', fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', padding: '5px 12px', borderRadius: 999 }}>MOST POPULAR</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: t.fg, marginBottom: 6 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: t.muted, marginBottom: 20, minHeight: 50 }}>{t.tagline}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  {t.hasPrice && (
                    <>
                      <span style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 46px)', lineHeight: 1, color: t.fg }}>{t.price}</span>
                      <span style={{ fontSize: 13, color: t.muted }}>{t.per}</span>
                    </>
                  )}
                  {t.noPrice && (
                    <span style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 34px)', lineHeight: 1.2, color: t.fg }}>Custom</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: t.billNoteColor, minHeight: 18, marginBottom: 22 }}>{t.billNote}</div>
                <Link href={t.ctaHref} style={{ display: 'block', textAlign: 'center', background: t.ctaBg, color: t.ctaColor, border: t.ctaBorder, fontSize: 14.5, fontWeight: 600, padding: 12, borderRadius: 999, textDecoration: 'none', marginBottom: 24 }}>{t.cta}</Link>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.muted, marginBottom: 13 }}>{t.includesLabel}</div>
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
          <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 34px)', lineHeight: 1.06, textAlign: 'center', margin: '0 0 28px' }}>Compare every plan</h2>
          <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 10, padding: '16px 22px', background: 'var(--jb-d-glass)', borderBottom: '1px solid #F2ECE0' }}>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--jb-d-ink-55)' }}>Feature</span>
              {MATRIX_COLS.map((c) => (
                <span key={c.label} style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: c.color }}>{c.label}</span>
              ))}
            </div>
            {MATRIX.map((row) => (
              <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 10, alignItems: 'center', padding: '13px 22px', borderBottom: `1px solid ${row.divider}` }}>
                <span style={{ fontSize: 13.5, color: 'var(--jb-d-ink-85)' }}>{row.label}</span>
                {row.cells.map((cell, ci) => (
                  <span key={ci} style={{ textAlign: 'center', fontFamily: 'var(--jb-font-mono)', fontSize: 12.5, fontWeight: cell.weight, color: cell.color }}>{cell.value}</span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ROI CALCULATOR TEASER */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 32px 40px' }}>
          <div style={{ background: 'var(--jb-d-footer)', borderRadius: 24, padding: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 40, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 12 }}>ROI calculator</div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 34px)', lineHeight: 1.08, color: '#FBF8F1', margin: '0 0 12px' }}>See what you’d save.</h2>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: '0 0 22px' }}>Screening one hire runs about 23 hours. Hand that to Autopilot and Scale pays for itself in the first month.</p>
              <Link href={demoHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#7cc4ff', color: 'var(--jb-d-panel)', fontSize: 15, fontWeight: 700, padding: '13px 22px', borderRadius: 999, textDecoration: 'none' }}>Get your custom ROI →</Link>
            </div>
            <div style={{ background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {ROI.map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 13.5, color: 'var(--jb-d-ink-55)' }}>{r.label}</span>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 18, fontWeight: 600, color: r.color }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: '#2C2A22' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>Net monthly saving</span>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--jb-d-accent)' }}>$14,200</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ maxWidth: 760, margin: '0 auto', padding: '40px 32px 64px' }}>
          <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 34px)', lineHeight: 1.06, textAlign: 'center', margin: '0 0 28px' }}>Questions, answered</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQ_RAW.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <button
                  key={f.q}
                  onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
                  style={{ textAlign: 'left', background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 15.5, fontWeight: 600, color: 'var(--jb-d-ink)' }}>{f.q}</span>
                    <span style={{ color: '#7cc4ff', fontSize: 18, transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>+</span>
                  </div>
                  {isOpen && (
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: '12px 0 0' }}>{f.a}</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(124,196,255,0.12)', border: '1px solid rgba(124,196,255,0.3)', borderRadius: 28, padding: '64px 48px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 44px)', lineHeight: 1.04, margin: '0 0 14px' }}>Ranked candidates, reasoning shown.</h2>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: '#3F4A7A', margin: '0 auto 28px', maxWidth: 460 }}>Post your first role free. Upgrade only when you’re hiring at volume.</p>
            <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={signUpHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#7cc4ff', color: 'var(--jb-d-panel)', fontSize: 16, fontWeight: 700, padding: '15px 28px', borderRadius: 999, textDecoration: 'none' }}>Start hiring free <span>→</span></Link>
              <Link href={demoHref} style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--jb-d-panel)', color: 'var(--jb-d-ink)', fontSize: 16, fontWeight: 600, padding: '15px 28px', borderRadius: 999, textDecoration: 'none', border: '1px solid rgba(124,196,255,0.3)' }}>Talk to sales</Link>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
