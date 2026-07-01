'use client';

import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Pick the interview',
    body: 'Choose the role and round — behavioral, technical, or system design — and we tailor the questions.',
  },
  {
    num: '02',
    title: 'Answer out loud',
    body: 'Type or speak your answers in a realistic back-and-forth that adapts to what you say.',
  },
  {
    num: '03',
    title: 'Get scored feedback',
    body: 'Specific notes on structure, clarity, and impact — plus the one thing to fix before the real thing.',
  },
];

const CAPABILITIES = [
  {
    num: '01',
    title: 'Company-tuned questions',
    body: "Drawn from the real role and the company's known interview style — not generic prompts.",
  },
  {
    num: '02',
    title: 'Structured scoring',
    body: "Rated on structure, evidence, and impact, so you know exactly where you're losing points.",
  },
  {
    num: '03',
    title: 'Progress tracking',
    body: 'Watch your scores climb across sessions and see which question types still need reps.',
  },
];

const STATS = [
  { value: '3', label: 'Round types covered' },
  { value: '2×', label: 'Higher offer rate after prep' },
  { value: '24/7', label: 'Practice on your schedule' },
];

export default function InterviewPrep() {
  return (
    <>
      <Head>
        <title>Interview Prep — Jobocate</title>
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
        #jbip ::selection {
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
        @media (max-width: 880px) {
          #jbip .ip-hero-grid,
          #jbip .ip-stat-grid,
          #jbip .ip-cards-grid {
            grid-template-columns: 1fr !important;
          }
          #jbip .ip-hero-title {
            font-size: 54px !important;
          }
        }
      `}</style>

      <div
        id="jbip"
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

        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11.5,
              letterSpacing: '0.08em',
              color: '#9A9286',
            }}
          >
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: '#9A9286', textDecoration: 'none' }}>
              HOME
            </Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: '#157A49' }}>INTERVIEW PREP</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div
            className="ip-hero-grid"
            style={{ display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 56, alignItems: 'center' }}
          >
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
                  Product — Interview Prep
                </span>
              </div>
              <h1
                className="ip-hero-title"
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 74,
                  lineHeight: 0.98,
                  letterSpacing: '-0.01em',
                  margin: '0 0 22px',
                }}
              >
                Walk in
                <br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>
                  already ready.
                </span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: '#4B463E', maxWidth: 470, margin: '0 0 32px' }}>
                Practice realistic mock interviews tailored to the exact role and company — and get instant, specific
                feedback on what to tighten before it counts.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link
                  href={appRoute('App Mock Interview.dc.html')}
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
                  Start a mock <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <Link
                  href={appRoute('App Interview.dc.html')}
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
                  See sample feedback
                </Link>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>
                ● Tuned to <b style={{ color: '#157A49' }}>behavioral, technical &amp; system-design</b> rounds
              </div>
            </div>

            {/* MOCK INTERVIEW CHAT */}
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    paddingBottom: 14,
                    borderBottom: '1px solid #EEE7D9',
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: '#1B1A16',
                      color: '#5BD08C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    AI
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Mock interview · PM at Stripe</div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10,
                      color: '#1FA463',
                    }}
                  >
                    ● behavioral
                  </span>
                </div>
                <div style={{ background: '#F4EFE4', borderRadius: 11, padding: '11px 13px', marginBottom: 9 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#3B362F' }}>
                    Tell me about a time you shipped something with incomplete data.
                  </div>
                </div>
                <div
                  style={{
                    background: '#1B1A16',
                    color: '#E4DDCE',
                    borderRadius: 11,
                    padding: '11px 13px',
                    marginBottom: 9,
                    marginLeft: 28,
                  }}
                >
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    At Linear we launched the roadmap beta to 5% of users before...
                  </div>
                </div>
                <div
                  style={{
                    background: '#EAF6EE',
                    border: '1px solid #BFE3CC',
                    borderRadius: 11,
                    padding: '11px 13px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      color: '#157A49',
                      marginBottom: 5,
                    }}
                  >
                    FEEDBACK · 8.5/10
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: '#2C4A3A' }}>
                    Strong STAR structure. Add the measurable outcome — what % adoption did the beta hit?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STAT BAND */}
        <section style={{ background: '#F1ECE0', borderTop: '1px solid #E7E0D2', borderBottom: '1px solid #E7E0D2' }}>
          <div
            className="ip-stat-grid"
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '46px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 24,
            }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ width: 32, height: 3, background: '#1FA463', margin: '12px 0 10px' }} />
                <div style={{ fontSize: 14, color: '#5A544A' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 54 }}>
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
              — How it works
            </div>
            <h2
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: 48,
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              Reps that actually move the needle
            </h2>
          </div>
          <div className="ip-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 36 }}>
            {HOW_IT_WORKS.map((c) => (
              <div key={c.num} style={{ borderTop: '2px solid #1B1A16', paddingTop: 22 }}>
                <div
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontSize: 60,
                    lineHeight: 1,
                    color: '#1FA463',
                    marginBottom: 14,
                  }}
                >
                  {c.num}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{c.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITY CARDS */}
        <section style={{ background: '#1B1A16', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
            <div style={{ maxWidth: 620, marginBottom: 46 }}>
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
                — What&apos;s inside
              </div>
              <h2
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 48,
                  lineHeight: 1.05,
                  margin: 0,
                  color: '#FBF8F1',
                }}
              >
                Coaching that&apos;s actually specific
              </h2>
            </div>
            <div className="ip-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {CAPABILITIES.map((c) => (
                <div
                  key={c.num}
                  style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 28 }}
                >
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 13,
                      color: '#5BD08C',
                      marginBottom: 18,
                    }}
                  >
                    {c.num}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FBF8F1', margin: '0 0 10px' }}>{c.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: '#B8B1A4', margin: 0 }}>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '88px 32px', textAlign: 'center' }}>
          <div style={{ color: '#1FA463', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>★★★★★</div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, lineHeight: 1.25, margin: '0 0 28px' }}>
            &quot;The feedback caught that I was burying my impact. I fixed it, and walked into the final round genuinely
            calm.&quot;
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: '#C9622E',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              MJ
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Marcus Johnson</div>
              <div style={{ fontSize: 13.5, color: '#7A7367' }}>Product Manager at Stripe</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: '#15140F',
              borderRadius: 24,
              padding: '78px 40px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 130%, rgba(31,164,99,0.42), transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative' }}>
              <h2
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 58,
                  lineHeight: 1.02,
                  color: '#FBF8F1',
                  margin: '0 auto 16px',
                  maxWidth: 640,
                }}
              >
                Practice until you can&apos;t get it wrong
              </h2>
              <p style={{ fontSize: 18, color: '#B8B1A4', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>
                Run your first mock interview free and see your score in minutes.
              </p>
              <Link
                href={appRoute('App Mock Interview.dc.html')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#1FA463',
                  color: '#0C2C1C',
                  fontSize: 17,
                  fontWeight: 700,
                  padding: '17px 32px',
                  borderRadius: 999,
                  textDecoration: 'none',
                }}
              >
                Start a mock <span style={{ fontSize: 19 }}>→</span>
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
