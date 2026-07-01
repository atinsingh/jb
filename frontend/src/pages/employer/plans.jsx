'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* -------------------------------------------------------------- tier data --- */
// Mirrors the dc Component.tierData() sample.
const TIER_DATA = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For your first few hires.',
    m: 99,
    a: 79,
    current: false,
    popular: false,
    levers: [
      ['Active job slots', '1'],
      ['Team seats', '2'],
      ['AI actions / mo', '100'],
      ['Sourcing credits', '25'],
      ['Integrations', 'Calendar'],
      ['SSO', '—'],
      ['Support', 'Email'],
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'Hiring steadily across a few teams.',
    m: 299,
    a: 239,
    current: true,
    popular: false,
    levers: [
      ['Active job slots', '5'],
      ['Team seats', '8'],
      ['AI actions / mo', '500'],
      ['Sourcing credits', '150'],
      ['Integrations', '+ Slack'],
      ['SSO', '—'],
      ['Support', 'Priority email'],
    ],
  },
  {
    key: 'scale',
    name: 'Scale',
    tagline: 'High-volume hiring with full automation.',
    m: 699,
    a: 549,
    current: false,
    popular: true,
    levers: [
      ['Active job slots', '20'],
      ['Team seats', '25'],
      ['AI actions / mo', '2,500'],
      ['Sourcing credits', '750'],
      ['Integrations', '+ Greenhouse, Lever'],
      ['SSO', '✓'],
      ['Support', 'Dedicated CSM'],
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom scale, security & controls.',
    custom: true,
    current: false,
    popular: false,
    levers: [
      ['Active job slots', 'Unlimited'],
      ['Team seats', 'Unlimited'],
      ['AI actions / mo', 'Custom'],
      ['Sourcing credits', 'Custom'],
      ['Integrations', 'Any ATS + API'],
      ['SSO', '✓ SAML/SCIM'],
      ['Support', '24/7 + SLA'],
    ],
  },
];

const DELTA = [
  { title: '4× the job slots', desc: 'From 5 to 20 active reqs at once.' },
  { title: '5× AI actions', desc: '2,500/mo — fuel Autopilot at full volume.' },
  { title: 'ATS integrations', desc: 'Sync with Greenhouse and Lever.' },
  { title: 'SSO + dedicated CSM', desc: 'Enterprise security and a named contact.' },
];

/* -------------------------------------------------------------- transform --- */
// Mirrors the dc Component.renderVals() tier mapping.
function computeTiers(annual) {
  return TIER_DATA.map((t) => {
    const dark = t.key === 'scale';
    const price = t.custom ? null : annual ? t.a : t.m;
    return {
      key: t.key,
      name: t.name,
      tagline: t.tagline,
      popular: t.popular,
      current: t.current,
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
      hasPrice: !t.custom,
      noPrice: !!t.custom,
      price: t.custom ? '' : '$' + price,
      per: '/mo',
      isCta: !t.current,
      isCurrent: t.current,
      cta: t.custom ? 'Talk to sales' : t.key === 'starter' ? 'Downgrade' : 'Choose ' + t.name,
      // dc design targets "Employer Checkout.dc.html" (unmapped in appRoutes →
      // falls back to /app); route paid CTAs to the mapped Employer Billing
      // screen so checkout stays within the employer surface.
      href: t.custom ? 'Employer Settings.dc.html' : 'Employer Billing.dc.html',
      ctaBg: dark ? '#4263EB' : t.custom ? '#FFFEFB' : '#1B1A16',
      ctaColor: dark ? '#fff' : t.custom ? '#1B1A16' : '#F7F3EA',
      ctaBorder: t.custom ? '1px solid #D9D0BE' : 'none',
      levers: t.levers.map((l) => ({
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
  const tiers = computeTiers(annual);

  return (
    <>
      <Head>
        <title>Plans &amp; billing — Jobocate for Employers</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
          fontFamily: "'Hanken Grotesk',sans-serif",
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
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>Plan &amp; billing</span>
          </header>

          <div style={{ padding: '32px 32px 64px', maxWidth: 1180, width: '100%', margin: '0 auto' }}>
            {/* HERO */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1.02, margin: '0 0 10px' }}>Scale your hiring.</h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: '0 auto 20px', maxWidth: 480 }}>
                You&rsquo;re on <b style={{ color: '#1B1A16' }}>Growth</b> — using 3 of 5 job slots. Here&rsquo;s what each plan unlocks.
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
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, background: '#1FA463', color: '#0C2C1C', padding: '2px 7px', borderRadius: 999 }}>−25%</span>
                </button>
              </div>
            </div>

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
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 9.5,
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
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 9.5,
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
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 600, color: t.nameColor }}>{t.price}</span>
                        <span style={{ fontSize: 12.5, color: t.taglineColor }}>{t.per}</span>
                      </>
                    )}
                    {t.noPrice && <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, color: t.nameColor }}>Custom</span>}
                  </div>

                  {t.isCta && (
                    <Link
                      href={appRoute(t.href)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        background: t.ctaBg,
                        color: t.ctaColor,
                        border: t.ctaBorder,
                        fontSize: 14,
                        fontWeight: 700,
                        padding: 12,
                        borderRadius: 999,
                        textDecoration: 'none',
                        marginBottom: 20,
                      }}
                    >
                      {t.cta}
                    </Link>
                  )}
                  {t.isCurrent && (
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
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {t.levers.map((l) => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                        <span style={{ color: t.leverLabelColor }}>{l.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: l.valColor, textAlign: 'right' }}>{l.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* DELTA */}
            <div style={{ marginTop: 22, background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 18, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#364FC7' }}>
                  Upgrade to Scale — what you&rsquo;ll unlock
                </span>
              </div>
              <div className="em-delta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 13 }}>
                {DELTA.map((d) => (
                  <div key={d.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
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
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1F2D6B' }}>{d.title}</div>
                      <div style={{ fontSize: 12.5, color: '#3F4A7A' }}>{d.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href={appRoute('Employer Billing.dc.html')}
                className="em-upgrade-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#4263EB',
                  color: '#fff',
                  fontSize: 14.5,
                  fontWeight: 700,
                  padding: '13px 24px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  marginTop: 18,
                }}
              >
                Upgrade to Scale →
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
