'use client';

import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
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
        <title>Resume Builder — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbresume * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jbresume ::selection {
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
      `}</style>

      <div
        id="jbresume"
        style={{
          background: '#F7F3EA',
          color: '#1B1A16',
          fontFamily: "'Hanken Grotesk',sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.08em', color: '#9A9286' }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: '#9A9286', textDecoration: 'none' }}>
              HOME
            </Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: '#157A49' }}>RESUME BUILDER</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 56, alignItems: 'center' }}>
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
                  Product — AI Resume Builder
                </span>
              </div>
              <h1
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 74,
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
              <p style={{ fontSize: 19, lineHeight: 1.55, color: '#4B463E', maxWidth: 470, margin: '0 0 32px' }}>
                Jobocate rewrites and formats your resume to clear ATS filters and land on a human&apos;s desk — tailored to every role in seconds, not hours.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link
                  href={appRoute('App Resume.dc.html')}
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
                  Build my resume <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <Link
                  href={appRoute('App Resume.dc.html')}
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
                  See a sample
                </Link>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>
                ● Built on <b style={{ color: '#157A49' }}>2M+</b> successful resumes
              </div>
            </div>

            {/* RESUME MOCK */}
            <div style={{ animation: 'riseIn 0.9s ease both', position: 'relative' }}>
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 16,
                  boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)',
                  padding: '30px 32px',
                }}
              >
                <div style={{ borderBottom: '1px solid #EEE7D9', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, lineHeight: 1 }}>Sarah Chen</div>
                  <div style={{ fontSize: 12.5, color: '#8A8378', marginTop: 4 }}>Senior Software Engineer · San Francisco</div>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9A9286',
                    marginBottom: 9,
                  }}
                >
                  Experience
                </div>
                <div style={{ background: '#EAF6EE', borderRadius: 7, padding: '9px 11px', marginBottom: 7 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Led migration to microservices, cutting latency 40%</div>
                  <div style={{ fontSize: 11, color: '#157A49', marginTop: 2 }}>✓ quantified · ✓ action verb · ✓ keyword: microservices</div>
                </div>
                <div style={{ height: 8, background: '#F1ECE0', borderRadius: 4, marginBottom: 6, width: '92%' }} />
                <div style={{ height: 8, background: '#F1ECE0', borderRadius: 4, marginBottom: 16, width: '78%' }} />
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9A9286',
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
                        background: '#F4EFE4',
                        border: '1px solid #E6DECF',
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
                  background: '#1B1A16',
                  color: '#FBF8F1',
                  borderRadius: 14,
                  padding: '12px 16px',
                  boxShadow: '0 16px 30px -12px rgba(27,26,22,0.5)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', color: '#5BD08C' }}>
                  ATS SCORE
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>
                  98<span style={{ fontSize: 13, color: '#9A9286' }}>/100</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STAT BAND */}
        <section style={{ background: '#F1ECE0', borderTop: '1px solid #E7E0D2', borderBottom: '1px solid #E7E0D2' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '46px 32px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 24,
            }}
          >
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>
                98<span style={{ fontSize: 22, color: '#8A8378' }}>/100</span>
              </div>
              <div style={{ width: 32, height: 3, background: '#1FA463', margin: '12px 0 10px' }} />
              <div style={{ fontSize: 14, color: '#5A544A' }}>Average ATS score</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>3×</div>
              <div style={{ width: 32, height: 3, background: '#1FA463', margin: '12px 0 10px' }} />
              <div style={{ fontSize: 14, color: '#5A544A' }}>More recruiter callbacks</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>60s</div>
              <div style={{ width: 32, height: 3, background: '#1FA463', margin: '12px 0 10px' }} />
              <div style={{ fontSize: 14, color: '#5A544A' }}>To tailor for a new role</div>
            </div>
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
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0 }}>
              From rough draft to recruiter-ready
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 36 }}>
            {HOW_STEPS.map((step) => (
              <div key={step.num} style={{ borderTop: '2px solid #1B1A16', paddingTop: 22 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 60, lineHeight: 1, color: '#1FA463', marginBottom: 14 }}>
                  {step.num}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: 0 }}>{step.body}</p>
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
                — What you get
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
                More than a template
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {CAPABILITIES.map((cap) => (
                <div
                  key={cap.num}
                  style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 28 }}
                >
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#5BD08C', marginBottom: 18 }}>
                    {cap.num}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FBF8F1', margin: '0 0 10px' }}>{cap.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: '#B8B1A4', margin: 0 }}>{cap.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '88px 32px', textAlign: 'center' }}>
          <div style={{ color: '#1FA463', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>★★★★★</div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, lineHeight: 1.25, margin: '0 0 28px' }}>
            &quot;The resume optimization got me past ATS filters that had been silently blocking me for months.&quot;
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
                Get a resume that gets read
              </h2>
              <p style={{ fontSize: 18, color: '#B8B1A4', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>
                Import yours and see your ATS score in under a minute — free.
              </p>
              <Link
                href={appRoute('App Resume.dc.html')}
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
                Build my resume <span style={{ fontSize: 19 }}>→</span>
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
