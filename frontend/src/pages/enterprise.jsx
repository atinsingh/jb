'use client';

import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
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
        <title>Enterprise & Outplacement — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jb-enterprise * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jb-enterprise ::selection {
          background: #1fa463;
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
          color: #9a9286;
        }
      `}</style>

      <div
        id="jb-enterprise"
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
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  border: '1px solid #D9D0BE',
                  borderRadius: 999,
                  padding: '7px 14px',
                  marginBottom: 24,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463' }} />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11.5,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#5A544A',
                  }}
                >
                  Enterprise &amp; Outplacement
                </span>
              </div>
              <h1
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 68,
                  lineHeight: 1.0,
                  letterSpacing: '-0.01em',
                  margin: '0 0 22px',
                }}
              >
                Land your whole team
                <br />
                on their{' '}
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>
                  feet.
                </span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: '#4B463E', maxWidth: 480, margin: '0 0 32px' }}>
                Give departing employees a genuinely effective landing — and your people team the controls, security, and
                reporting to run it at scale. Compassionate outplacement, powered by the same AI that gets individuals hired
                faster.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <a
                  href="#contact"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    background: '#1B1A16',
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
                    color: '#1B1A16',
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
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 16,
                  boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)',
                  padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Outplacement · Q2 cohort</div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#157A49' }}>
                    ● 142 seats active
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                  <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8A8378', textTransform: 'uppercase' }}>
                      Placed
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: '#157A49' }}>
                      68%
                    </div>
                  </div>
                  <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8A8378', textTransform: 'uppercase' }}>
                      Avg. days
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600 }}>39</div>
                  </div>
                  <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8A8378', textTransform: 'uppercase' }}>
                      CSAT
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600 }}>4.8</div>
                  </div>
                </div>
                <div style={{ border: '1px solid #EEE7D9', borderRadius: 11, padding: 12 }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10,
                      color: '#9A9286',
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
              borderTop: '1px solid #E7E0D2',
              borderBottom: '1px solid #E7E0D2',
              padding: '22px 0',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              Trusted by people teams at
            </span>
            {LOGOS.map((l) => (
              <span key={l} style={{ fontSize: 18, fontWeight: 700, color: '#A79E8F' }}>
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
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#1FA463',
                marginBottom: 16,
              }}
            >
              — Why teams choose Jobocate
            </div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0 }}>
              Outplacement people actually use
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 1,
              background: '#E1D9C9',
              border: '1px solid #E1D9C9',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {VALUE_PROPS.map((v) => (
              <div key={v.n} style={{ background: '#FBF8F1', padding: '30px 26px' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#1FA463', fontWeight: 600, marginBottom: 18 }}>
                  {v.n}
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 10px' }}>{v.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#5A544A', margin: 0 }}>{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITIES GRID */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '50px 32px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {CAPABILITIES.map((c) => (
              <div key={c.title} style={{ border: '1px solid #E1D9C9', borderRadius: 14, padding: 24, background: '#FBF8F1' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 7px' }}>{c.title}</h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#7A7367', margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECURITY BAND */}
        <section style={{ background: '#1B1A16', color: '#F2EDE2' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '72px 32px',
              display: 'grid',
              gridTemplateColumns: '0.9fr 1.1fr',
              gap: 48,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#5BD08C',
                  marginBottom: 16,
                }}
              >
                — Security &amp; compliance
              </div>
              <h2
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 42,
                  lineHeight: 1.05,
                  margin: '0 0 14px',
                  color: '#FBF8F1',
                }}
              >
                Enterprise-grade by default
              </h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: '#B8B1A4', margin: 0 }}>
                Your data and your people&apos;s data are protected to the standards your security team expects — with a DPA,
                SSO, and full audit logging out of the box.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {COMPLIANCE.map((c) => (
                <div key={c.tag} style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#5BD08C', fontWeight: 600, marginBottom: 8 }}>
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
          <div style={{ color: '#1FA463', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>★★★★★</div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, lineHeight: 1.25, margin: '0 0 28px' }}>
            &quot;We replaced a legacy outplacement vendor with Jobocate and our placement rate jumped 22 points. People
            actually thanked us.&quot;
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
              DP
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Dana Park</div>
              <div style={{ fontSize: 13.5, color: '#7A7367' }}>VP People at Shopify</div>
            </div>
          </div>
        </section>

        {/* CONTACT CTA */}
        <section id="contact" style={{ maxWidth: 1200, margin: '0 auto 80px', padding: '0 32px' }}>
          <div
            style={{
              background: '#F1ECE0',
              border: '1px solid #E1D9C9',
              borderRadius: 24,
              padding: '56px 48px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 48,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#1FA463',
                  marginBottom: 16,
                }}
              >
                — Let&apos;s talk
              </div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 44, lineHeight: 1.04, margin: '0 0 14px' }}>
                See it on your numbers
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: '#4B463E', margin: 0 }}>
                Tell us about your team and we&apos;ll put together a tailored program and quote — usually within a day.
              </p>
            </div>
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 28 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  placeholder="Full name"
                  style={{
                    background: '#F7F3EA',
                    border: '1px solid #E1D9C9',
                    borderRadius: 10,
                    padding: '13px 14px',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    color: '#1B1A16',
                  }}
                />
                <input
                  placeholder="Work email"
                  style={{
                    background: '#F7F3EA',
                    border: '1px solid #E1D9C9',
                    borderRadius: 10,
                    padding: '13px 14px',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    color: '#1B1A16',
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    placeholder="Company"
                    style={{
                      background: '#F7F3EA',
                      border: '1px solid #E1D9C9',
                      borderRadius: 10,
                      padding: '13px 14px',
                      fontFamily: 'inherit',
                      fontSize: 14,
                      color: '#1B1A16',
                    }}
                  />
                  <select
                    style={{
                      background: '#F7F3EA',
                      border: '1px solid #E1D9C9',
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
                    background: '#1B1A16',
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

        <SiteFooter />
      </div>
    </>
  );
}
