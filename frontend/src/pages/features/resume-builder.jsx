'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const HOW_STEPS = [
  {
    num: '01',
    title: 'Import in any format',
    body: 'Drop in a PDF, paste your LinkedIn, or start fresh. We parse your history into clean, structured sections.',
  },
  {
    num: '02',
    title: 'Optimize for ATS',
    body: 'We rewrite bullets to be quantified and keyword-rich, then score the result against real screening systems.',
  },
  {
    num: '03',
    title: 'Tailor per role',
    body: 'Paste any job description and get a version tuned to it — emphasis, keywords, and ordering adjusted automatically.',
  },
];

const CAPABILITIES = [
  {
    num: '01',
    title: 'Live ATS score',
    body: 'Watch your score climb as you edit, with specific fixes for every point left on the table.',
  },
  {
    num: '02',
    title: 'Keyword matching',
    body: 'We compare your resume to the job description and surface the exact terms recruiters scan for.',
  },
  {
    num: '03',
    title: 'Recruiter-ready design',
    body: 'Clean, parsable layouts that look sharp to humans and never confuse a parser.',
  },
];

const SKILLS = ['Go', 'Kubernetes', 'Distributed systems', 'AWS'];

export default function ResumeBuilder() {
  return (
    <>
      <Head>
        <title>Resume Builder that clears ATS — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbresume * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jbresume ::selection {
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
      `}</style>

      <div
        id="jbresume"
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
          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.08em', color: 'var(--jb-d-ink-55)' }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: 'var(--jb-d-ink-55)', textDecoration: 'none' }}>
              HOME
            </Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: 'var(--jb-d-accent)' }}>RESUME BUILDER</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
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
                  Product — AI Resume Builder
                </span>
              </div>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 'clamp(34px, 7vw, 74px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.01em',
                  margin: '0 0 22px',
                }}
              >
                A resume that
                <br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>
                  beats the bots.
                </span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', maxWidth: 470, margin: '0 0 32px' }}>
                Jobocate rewrites and formats your resume to clear ATS filters and land on a human&apos;s desk — tailored to every role in seconds, not hours.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link
                  href={appRoute('App Resume.dc.html')}
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
                  Build my resume <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <Link
                  href={appRoute('App Resume.dc.html')}
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
                  See a sample
                </Link>
              </div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: 'var(--jb-d-ink-65)' }}>
                ● Scored against <b style={{ color: 'var(--jb-d-accent)' }}>real ATS</b> screening systems
              </div>
            </div>

            {/* RESUME MOCK */}
            <div style={{ animation: 'riseIn 0.9s ease both', position: 'relative' }}>
              <div
                style={{
                  background: 'var(--jb-d-panel)',
                  border: '1px solid var(--jb-d-line-card)',
                  borderRadius: 16,
                  boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)',
                  padding: '30px 32px',
                }}
              >
                <div style={{ borderBottom: '1px solid var(--jb-d-line-card)', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ fontFamily: 'var(--jb-font-display)', fontSize: 26, lineHeight: 1 }}>Sarah Chen</div>
                  <div style={{ fontSize: 12.5, color: 'var(--jb-d-ink-65)', marginTop: 4 }}>Senior Software Engineer · San Francisco</div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--jb-font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--jb-d-ink-55)',
                    marginBottom: 9,
                  }}
                >
                  Experience
                </div>
                <div style={{ background: 'var(--jb-d-accent-tint)', borderRadius: 7, padding: '9px 11px', marginBottom: 7 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Led migration to microservices, cutting latency 40%</div>
                  <div style={{ fontSize: 11, color: 'var(--jb-d-accent)', marginTop: 2 }}>✓ quantified · ✓ action verb · ✓ keyword: microservices</div>
                </div>
                <div style={{ height: 8, background: 'var(--jb-d-glass)', borderRadius: 4, marginBottom: 6, width: '92%' }} />
                <div style={{ height: 8, background: 'var(--jb-d-glass)', borderRadius: 4, marginBottom: 16, width: '78%' }} />
                <div
                  style={{
                    fontFamily: 'var(--jb-font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--jb-d-ink-55)',
                    marginBottom: 9,
                  }}
                >
                  Skills
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SKILLS.map((s) => (
                    <span
                      key={s}
                      style={{
                        fontSize: 11,
                        background: 'transparent',
                        border: '1px solid var(--jb-d-line-card)',
                        borderRadius: 999,
                        padding: '4px 10px',
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: -18,
                  right: -14,
                  background: 'var(--jb-d-footer)',
                  color: '#FBF8F1',
                  borderRadius: 14,
                  padding: '12px 16px',
                  boxShadow: '0 16px 30px -12px rgba(27,26,22,0.5)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--jb-d-accent)' }}>
                  ATS SCORE
                </div>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
                  98<span style={{ fontSize: 13, color: 'var(--jb-d-ink-55)' }}>/100</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STAT BAND */}
        <section style={{ background: 'var(--jb-d-glass)', borderTop: '1px solid var(--jb-d-line-card)', borderBottom: '1px solid var(--jb-d-line-card)' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '46px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
              gap: 24,
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 600, lineHeight: 1 }}>
                0<span style={{ fontSize: 22, color: 'var(--jb-d-ink-65)' }}>–100</span>
              </div>
              <div style={{ width: 32, height: 3, background: 'var(--jb-d-accent)', margin: '12px 0 10px' }} />
              <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)' }}>Live ATS score as you edit</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 600, lineHeight: 1 }}>3</div>
              <div style={{ width: 32, height: 3, background: 'var(--jb-d-accent)', margin: '12px 0 10px' }} />
              <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)' }}>Ways in — PDF, LinkedIn, or fresh</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 600, lineHeight: 1 }}>60s</div>
              <div style={{ width: 32, height: 3, background: 'var(--jb-d-accent)', margin: '12px 0 10px' }} />
              <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)' }}>To tailor a version for a role</div>
            </div>
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
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>
              From rough draft to recruiter-ready
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 36 }}>
            {HOW_STEPS.map((step) => (
              <div key={step.num} style={{ borderTop: '2px solid var(--jb-d-footer)', paddingTop: 22 }}>
                <div style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(28px, 6vw, 60px)', lineHeight: 1, color: 'var(--jb-d-accent)', marginBottom: 14 }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>{step.body}</p>
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
                — What you get
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
                More than a template
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 20 }}>
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.num}
                  style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 28 }}
                >
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: 'var(--jb-d-accent)', marginBottom: 18 }}>
                    {cap.num}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FBF8F1', margin: '0 0 10px' }}>{cap.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: 0 }}>{cap.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '88px 32px', textAlign: 'center' }}>
          <div style={{ color: 'var(--jb-d-accent)', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>A SAMPLE, OPTIMIZED</div>
          <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.25, margin: '0 0 28px' }}>
            &quot;Bullets rewritten and quantified, keywords matched to the role — this is the version that clears the filter and reaches a person.&quot;
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
              SC
            </span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Sarah Chen — sample profile</div>
              <div style={{ fontSize: 13.5, color: 'var(--jb-d-ink-65)' }}>Senior Software Engineer · San Francisco</div>
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
                Get a resume that gets read
              </h2>
              <p style={{ fontSize: 18, color: 'var(--jb-d-ink-65)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>
                Import yours and see your ATS score in under a minute — free.
              </p>
              <Link
                href={appRoute('App Resume.dc.html')}
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
                Build my resume <span style={{ fontSize: 19 }}>→</span>
              </Link>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
