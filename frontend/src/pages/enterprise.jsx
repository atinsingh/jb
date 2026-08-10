'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const VALUE_PROPS = [
  {
    n: '01',
    title: 'A landing, not a login',
    body: "Departing staff get the full product — matching, auto-apply, prep — not a stale course they'll never open.",
  },
  {
    n: '02',
    title: 'Built for admins',
    body: 'SSO, SCIM seat provisioning, role-based access, and custom branding — set up in an afternoon.',
  },
  {
    n: '03',
    title: 'Outcomes you can report',
    body: 'Placement rate, time-to-offer, and satisfaction — board-ready dashboards, exportable any time.',
  },
];

const CAPABILITIES = [
  { title: 'SSO & SAML', body: 'Okta, Azure AD, Google — one-click sign-in for your whole org.' },
  { title: 'SCIM seat management', body: 'Provision and reclaim seats automatically as cohorts change.' },
  { title: 'Dedicated success manager', body: 'A named partner to launch, train, and optimize your program.' },
  { title: 'Custom branding', body: 'Your logo and colors across the experience departing staff see.' },
  { title: 'Usage & outcome analytics', body: 'Real-time dashboards with CSV and API export for your systems.' },
  { title: 'Bulk onboarding', body: 'Invite hundreds at once with a CSV or HRIS integration.' },
];

const COMPLIANCE = [
  { tag: 'SOC 2', label: 'Type II certified' },
  { tag: 'GDPR', label: 'EU & UK compliant' },
  { tag: 'AES-256', label: 'Encrypted at rest' },
  { tag: 'DPA', label: 'Signed on request' },
];

const LOGOS = ['Atlassian', 'Shopify', 'Twilio', 'Dropbox', 'Zendesk'];

const BARS = [
  { c: '#DDEFE3', h: '30%' },
  { c: '#CDEAD7', h: '48%' },
  { c: '#A9DCBA', h: '62%' },
  { c: '#7FCB99', h: '78%' },
  { c: '#4FB97A', h: '88%' },
  { c: '#1FA463', h: '100%' },
];

export default function Enterprise() {
  return (
    <>
      <Head>
        <title>Outplacement software for people teams — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jb-enterprise * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jb-enterprise ::selection {
          background: var(--jb-d-accent);
          color: #f7f3ea;
        }
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        #jb-enterprise input::placeholder,
        #jb-enterprise select {
          color: var(--jb-d-ink-55);
        }
      `}</style>

      <div
        id="jb-enterprise"
        style={{
          background: 'transparent',
          color: 'var(--jb-d-ink)',
          fontFamily: 'var(--jb-font-sans)',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <PublicLayout>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  border: '1px solid var(--jb-d-line-btn)',
                  borderRadius: 999,
                  padding: '7px 14px',
                  marginBottom: 24,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--jb-d-accent)' }} />
                <span
                  style={{
                    fontFamily: 'var(--jb-font-mono)',
                    fontSize: 11.5,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--jb-d-ink-70)',
                  }}
                >
                  Enterprise &amp; Outplacement
                </span>
              </div>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(31px, 6vw, 68px)',
                  lineHeight: 1.0,
                  letterSpacing: '-0.01em',
                  margin: '0 0 22px',
                }}
              >
                Outplacement that lands
                <br />
                your people on their{' '}
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>
                  feet.
                </span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', maxWidth: 480, margin: '0 0 32px' }}>
                Give departing employees a real landing — matches to roles they&apos;re eligible for, applications tailored
                from their experience, nothing sent without their say-so. Your people team gets the controls, security, and
                reporting to run it at scale.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <a
                  href="#contact"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    background: 'var(--jb-d-footer)',
                    color: '#F7F3EA',
                    fontSize: 16,
                    fontWeight: 600,
                    padding: '15px 26px',
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  Talk to sales <span style={{ fontSize: 18 }}>→</span>
                </a>
                <a
                  href="#contact"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    color: 'var(--jb-d-ink)',
                    fontSize: 16,
                    fontWeight: 600,
                    padding: '15px 22px',
                    borderRadius: 999,
                    textDecoration: 'none',
                    border: '1px solid #D2C9B7',
                  }}
                >
                  Download overview
                </a>
              </div>
            </div>

            {/* ADMIN DASHBOARD MOCK */}
            <div style={{ animation: 'riseIn 0.9s ease both' }}>
              <div
                style={{
                  background: 'var(--jb-d-panel)',
                  border: '1px solid var(--jb-d-line-card)',
                  borderRadius: 16,
                  boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)',
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Outplacement · Q2 cohort</div>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-accent)' }}>
                    ● 142 seats active
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 8, marginBottom: 14 }}>
                  <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-ink-65)', textTransform: 'uppercase' }}>
                      Placed
                    </div>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--jb-d-accent)' }}>
                      68%
                    </div>
                  </div>
                  <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-ink-65)', textTransform: 'uppercase' }}>
                      Avg. days
                    </div>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600 }}>39</div>
                  </div>
                  <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-ink-65)', textTransform: 'uppercase' }}>
                      CSAT
                    </div>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 22, fontWeight: 600 }}>4.8</div>
                  </div>
                </div>
                <div style={{ border: '1px solid var(--jb-d-line-card)', borderRadius: 11, padding: 12 }}>
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      color: 'var(--jb-d-ink-55)',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    Placement velocity
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 54 }}>
                    {BARS.map((b, i) => (
                      <div key={i} style={{ flex: 1, background: b.c, borderRadius: 3, height: b.h }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGOS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 34,
              flexWrap: 'wrap',
              justifyContent: 'center',
              borderTop: '1px solid var(--jb-d-line-card)',
              borderBottom: '1px solid var(--jb-d-line-card)',
              padding: '22px 0',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--jb-d-ink-55)',
              }}
            >
              Where your people could land next
            </span>
            {LOGOS.map((l) => (
              <span key={l} style={{ fontSize: 18, fontWeight: 700, color: 'var(--jb-d-ink-55)' }}>
                {l}
              </span>
            ))}
          </div>
        </section>

        {/* VALUE PROPS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px 30px' }}>
          <div style={{ maxWidth: 620, marginBottom: 48 }}>
            <div
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--jb-d-accent)',
                marginBottom: 16,
              }}
            >
              — Why teams choose Jobocate
            </div>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>
              Outplacement people actually use
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: 1,
              background: 'var(--jb-d-line-card)',
              border: '1px solid var(--jb-d-line-card)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {VALUE_PROPS.map((v) => (
              <div key={v.n} style={{ background: 'var(--jb-d-glass)', padding: '30px 26px' }}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: 'var(--jb-d-accent)', fontWeight: 600, marginBottom: 18 }}>
                  {v.n}
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 10px' }}>{v.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--jb-d-ink-70)', margin: 0 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITIES GRID */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '50px 32px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 20 }}>
            {CAPABILITIES.map((c) => (
              <div key={c.title} style={{ border: '1px solid var(--jb-d-line-card)', borderRadius: 14, padding: 24, background: 'var(--jb-d-glass)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 7px' }}>{c.title}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--jb-d-ink-65)', margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECURITY BAND */}
        <section style={{ background: 'var(--jb-d-footer)', color: '#F2EDE2' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '72px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
              gap: 48,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--jb-d-accent)',
                  marginBottom: 16,
                }}
              >
                — Security &amp; compliance
              </div>
              <h2
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(26px, 5vw, 42px)',
                  lineHeight: 1.05,
                  margin: '0 0 14px',
                  color: '#FBF8F1',
                }}
              >
                Security your team can sign off on
              </h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--jb-d-ink-65)', margin: 0 }}>
                Your data and your people&apos;s data are protected to the standards your security team expects — with a DPA,
                SSO, and full audit logging out of the box.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12 }}>
              {COMPLIANCE.map((c) => (
                <div key={c.tag} style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: 'var(--jb-d-accent)', fontWeight: 600, marginBottom: 8 }}>
                    {c.tag}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '88px 32px', textAlign: 'center' }}>
          <div style={{ color: 'var(--jb-d-accent)', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>— WHY WE BUILT THIS</div>
          <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.25, margin: '0 0 28px' }}>
            &quot;Outplacement should feel like a genuine head start, not a box to tick. Real matches, applications people are
            proud to send, and progress the team can actually see.&quot;
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: '#3A6F4E',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              JB
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>The Jobocate team</div>
              <div style={{ fontSize: 13.5, color: 'var(--jb-d-ink-65)' }}>On how we approach outplacement</div>
            </div>
          </div>
        </section>

        {/* CONTACT CTA */}
        <section id="contact" style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 32px' }}>
          <div
            style={{
              background: 'var(--jb-d-glass)',
              border: '1px solid var(--jb-d-line-card)',
              borderRadius: 24,
              padding: '56px 48px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
              gap: 48,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--jb-d-accent)',
                  marginBottom: 16,
                }}
              >
                — Let&apos;s talk
              </div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 44px)', lineHeight: 1.04, margin: '0 0 14px' }}>
                See it on your numbers
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--jb-d-ink-85)', margin: 0 }}>
                Tell us about your team and we&apos;ll put together a tailored program and quote — usually within a day.
              </p>
            </div>
            <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 18, padding: 28 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  placeholder="Full name"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--jb-d-line-card)',
                    borderRadius: 10,
                    padding: '13px 14px',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    color: 'var(--jb-d-ink)',
                  }}
                />
                <input
                  placeholder="Work email"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--jb-d-line-card)',
                    borderRadius: 10,
                    padding: '13px 14px',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    color: 'var(--jb-d-ink)',
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12 }}>
                  <input
                    placeholder="Company"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--jb-d-line-card)',
                      borderRadius: 10,
                      padding: '13px 14px',
                      fontFamily: 'inherit',
                      fontSize: 14,
                      color: 'var(--jb-d-ink)',
                    }}
                  />
                  <select
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--jb-d-line-card)',
                      borderRadius: 10,
                      padding: '13px 14px',
                      fontFamily: 'inherit',
                      fontSize: 14,
                    }}
                  >
                    <option>Team size</option>
                    <option>1–50</option>
                    <option>51–500</option>
                    <option>500–5,000</option>
                    <option>5,000+</option>
                  </select>
                </div>
                <button
                  style={{
                    background: 'var(--jb-d-footer)',
                    color: '#F7F3EA',
                    border: 'none',
                    borderRadius: 999,
                    padding: 14,
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  Book a demo →
                </button>
              </div>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
