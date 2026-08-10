'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
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
  { value: '3', label: 'Round types you can practice' },
  { value: 'STAR', label: 'Answers scored for structure, evidence & impact' },
  { value: '24/7', label: 'Practice on your own schedule' },
];

export default function InterviewPrep() {
  return (
    <>
      <Head>
        <title>Interview Prep — Jobocate</title>
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #jbip ::selection {
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
          background: 'transparent',
          color: 'var(--jb-d-ink)',
          fontFamily: 'var(--jb-font-sans)',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <PublicLayout>

        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div
            style={{
              fontFamily: 'var(--jb-font-mono)',
              fontSize: 11.5,
              letterSpacing: '0.08em',
              color: 'var(--jb-d-ink-55)',
            }}
          >
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: 'var(--jb-d-ink-55)', textDecoration: 'none' }}>
              HOME
            </Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: 'var(--jb-d-accent)' }}>INTERVIEW PREP</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div
            className="ip-hero-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 56, alignItems: 'center' }}
          >
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
                  Product — Interview Prep
                </span>
              </div>
              <h1
                className="ip-hero-title"
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(34px, 7vw, 74px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.01em',
                  margin: '0 0 22px',
                }}
              >
                Walk into every
                <br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>
                  interview ready.
                </span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', maxWidth: 470, margin: '0 0 32px' }}>
                Run mock interviews tailored to the exact role and company, then get specific feedback on what to
                tighten — behavioral, technical, and system-design rounds.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link
                  href={appRoute('App Mock Interview.dc.html')}
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
                  Start a mock <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <Link
                  href={appRoute('App Interview.dc.html')}
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
                  See sample feedback
                </Link>
              </div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: 'var(--jb-d-ink-65)' }}>
                ● Tuned to <b style={{ color: 'var(--jb-d-accent)' }}>behavioral, technical &amp; system-design</b> rounds
              </div>
            </div>

            {/* MOCK INTERVIEW CHAT */}
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--jb-d-line-card)',
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--jb-d-footer)',
                      color: 'var(--jb-d-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    AI
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Mock interview · PM at Meridian</div>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      color: 'var(--jb-d-accent)',
                    }}
                  >
                    ● behavioral
                  </span>
                </div>
                <div style={{ background: 'transparent', borderRadius: 11, padding: '11px 13px', marginBottom: 9 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--jb-d-ink-85)' }}>
                    Tell me about a time you shipped something with incomplete data.
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--jb-d-footer)',
                    color: 'var(--jb-d-ink-85)',
                    borderRadius: 11,
                    padding: '11px 13px',
                    marginBottom: 9,
                    marginLeft: 28,
                  }}
                >
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    At Cobalt Labs we launched the roadmap beta to 5% of users before...
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--jb-d-accent-tint)',
                    border: '1px solid #BFE3CC',
                    borderRadius: 11,
                    padding: '11px 13px',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      color: 'var(--jb-d-accent)',
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
        <section style={{ background: 'var(--jb-d-glass)', borderTop: '1px solid var(--jb-d-line-card)', borderBottom: '1px solid var(--jb-d-line-card)' }}>
          <div
            className="ip-stat-grid"
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '46px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: 24,
            }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 600, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ width: 32, height: 3, background: 'var(--jb-d-accent)', margin: '12px 0 10px' }} />
                <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 54 }}>
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
              — How it works
            </div>
            <h2
              style={{
                fontFamily: 'var(--jb-font-display)',
                fontWeight: 400,
                fontSize: 'clamp(26px, 5vw, 48px)',
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              Practice that mirrors the real round
            </h2>
          </div>
          <div className="ip-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 36 }}>
            {HOW_IT_WORKS.map((c) => (
              <div key={c.num} style={{ borderTop: '2px solid var(--jb-d-footer)', paddingTop: 22 }}>
                <div
                  style={{
                    fontFamily: 'var(--jb-font-display)',
                    fontSize: 'clamp(28px, 6vw, 60px)',
                    lineHeight: 1,
                    color: 'var(--jb-d-accent)',
                    marginBottom: 14,
                  }}
                >
                  {c.num}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{c.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITY CARDS */}
        <section style={{ background: 'var(--jb-d-footer)', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
            <div style={{ maxWidth: 620, marginBottom: 46 }}>
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
                — What&apos;s inside
              </div>
              <h2
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(26px, 5vw, 48px)',
                  lineHeight: 1.05,
                  margin: 0,
                  color: '#FBF8F1',
                }}
              >
                Feedback specific enough to act on
              </h2>
            </div>
            <div className="ip-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 20 }}>
              {CAPABILITIES.map((c) => (
                <div
                  key={c.num}
                  style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 28 }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 13,
                      color: 'var(--jb-d-accent)',
                      marginBottom: 18,
                    }}
                  >
                    {c.num}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FBF8F1', margin: '0 0 10px' }}>{c.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: 0 }}>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '88px 32px', textAlign: 'center' }}>
          <div style={{ color: 'var(--jb-d-accent)', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>SAMPLE FEEDBACK</div>
          <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.25, margin: '0 0 28px' }}>
            &quot;You buried your strongest result three sentences in. Lead with it, name the metric, and the answer
            lands.&quot;
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
              AI
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Feedback on your answer</div>
              <div style={{ fontSize: 13.5, color: 'var(--jb-d-ink-65)' }}>PM mock · behavioral round</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--jb-d-footer)',
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
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(27px, 5vw, 58px)',
                  lineHeight: 1.02,
                  color: '#FBF8F1',
                  margin: '0 auto 16px',
                  maxWidth: 640,
                }}
              >
                Walk into the interview prepared
              </h2>
              <p style={{ fontSize: 18, color: 'var(--jb-d-ink-65)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>
                Run your first mock interview free and see your score in minutes.
              </p>
              <Link
                href={appRoute('App Mock Interview.dc.html')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--jb-d-accent)',
                  color: 'var(--jb-d-bg)',
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

        </PublicLayout>
      </div>
    </>
  );
}
