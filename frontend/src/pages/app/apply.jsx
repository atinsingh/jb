'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';

const STEP_TITLES = ['Resume', 'Cover letter', 'Review'];

const COVER_LETTER = `Dear Stripe Design team,

I've spent the last seven years shaping 0→1 fintech and B2B SaaS products, most recently leading the onboarding redesign at Plaid that lifted activation 31% across 2M users. Stripe's focus on craft and measurable impact is exactly where I do my best work.

I'd bring deep design-systems experience — I built the system adopted by 40+ engineers at Plaid — and a bias for shipping tested, data-backed work. I'd love to help raise the bar on Checkout.

Best,
Sarah Chen`;

const RESUMES = [
  { name: 'Sarah Chen — Product Design (tailored)', meta: 'ATS 92 · tuned for Stripe', recommended: true },
  { name: 'Sarah Chen — General', meta: 'ATS 88 · base version', recommended: false },
];

export default function AppApply() {
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState(0);
  const [coverLetter, setCoverLetter] = useState(COVER_LETTER);

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const isResume = step === 0;
  const isCover = step === 1;
  const isReview = step === 2;
  const isDone = step === 3;
  const showNav = step < 3;
  const canBack = step > 0;
  const stepLabel = step < 3 ? `Step ${step + 1} of 3` : 'Submitted';
  const nextLabel = step === 2 ? 'Submit application' : 'Continue';

  const summary = [
    { label: 'Role', value: 'Senior Product Designer · Stripe', status: 'verified' },
    { label: 'Resume', value: resume === 0 ? 'Product Design (tailored)' : 'General', status: 'attached' },
    { label: 'Cover letter', value: 'Personalized draft', status: 'ready' },
    { label: 'Profile & links', value: 'sarah.chen@gmail.com · portfolio', status: 'complete' },
  ];

  const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 26 };

  return (
    <>
      <Head>
        <title>Apply · Senior Product Designer at Stripe — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp textarea:focus,
        #jbapp input:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes pop {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="matches" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('App Matches.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to matches</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>{stepLabel}</span>
          </header>

          <div style={{ padding: '30px 32px 56px', maxWidth: 760, width: '100%', margin: '0 auto' }}>
            {/* ROLE HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Link href={appRoute('App Company.dc.html')} style={{ width: 54, height: 54, flexShrink: 0, borderRadius: 13, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, textDecoration: 'none' }}>St</Link>
              <div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 32, lineHeight: 1.05, margin: '0 0 4px' }}>Senior Product Designer</h1>
                <div style={{ fontSize: 14, color: '#5A544A' }}>
                  <Link href={appRoute('App Company.dc.html')} style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}>Stripe</Link> · Remote (US) · $170–210k · <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>96% match</span>
                </div>
              </div>
            </div>

            {/* STEPPER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
              {STEP_TITLES.map((t, i) => {
                const done = i < step;
                const cur = i === step;
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 12,
                        fontWeight: 600,
                        color: cur ? '#0C2C1C' : done ? '#fff' : '#9A9286',
                        background: cur || done ? '#1FA463' : '#FFFEFB',
                        border: `1.5px solid ${cur || done ? '#1FA463' : '#D2C9B7'}`,
                      }}
                    >
                      {done ? '✓' : String(i + 1)}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: cur || done ? '#1B1A16' : '#9A9286' }}>{t}</span>
                    {i < STEP_TITLES.length - 1 && <span style={{ width: 34, height: 1.5, background: '#D2C9B7', margin: '0 12px' }} />}
                  </div>
                );
              })}
            </div>

            {/* STEP 1: RESUME */}
            {isResume && (
              <div style={card}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Choose a resume</h2>
                <p style={{ fontSize: 13.5, color: '#8A8378', margin: '0 0 20px' }}>We recommend the version tailored to this role.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {RESUMES.map((r, i) => {
                    const on = resume === i;
                    return (
                      <button
                        key={r.name}
                        onClick={() => setResume(i)}
                        style={{
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          background: on ? '#EAF6EE' : '#FBF8F1',
                          border: `1.5px solid ${on ? '#1FA463' : '#E6DECF'}`,
                          borderRadius: 13,
                          padding: '16px 18px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: `1.5px solid ${on ? '#1FA463' : '#C9BFAC'}`, background: on ? '#1FA463' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>{on ? '✓' : ''}</span>
                        <span style={{ flex: 1 }}>
                          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#1B1A16' }}>{r.name}</span>
                          <span style={{ display: 'block', fontSize: 12.5, color: '#8A8378' }}>{r.meta}</span>
                        </span>
                        {r.recommended && (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, color: '#157A49', background: '#EAF6EE', padding: '4px 9px', borderRadius: 999 }}>RECOMMENDED</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Link href={appRoute('App Resume.dc.html')} style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none', marginTop: 16 }}>Edit resume in builder →</Link>
              </div>
            )}

            {/* STEP 2: COVER LETTER */}
            {isCover && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cover letter</h2>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}>✦ Regenerate with AI</button>
                </div>
                <p style={{ fontSize: 13.5, color: '#8A8378', margin: '0 0 18px' }}>Drafted from your resume and Stripe&apos;s role description. Edit freely.</p>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  style={{ width: '100%', minHeight: 260, fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, color: '#2A2820', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 13, padding: 18, resize: 'vertical' }}
                />
              </div>
            )}

            {/* STEP 3: REVIEW */}
            {isReview && (
              <div style={card}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Review &amp; submit</h2>
                {summary.map((s) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #F2ECE0' }}>
                    <div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1B1A16' }}>{s.value}</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#157A49' }}>✓ {s.status}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginTop: 18, padding: '14px 16px', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 12 }}>
                  <span style={{ color: '#157A49', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: '#157A49' }}>This application goes directly to Stripe&apos;s verified careers page — never a third-party board.</span>
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {isDone && (
              <div style={{ ...card, padding: '48px 30px', textAlign: 'center', animation: 'pop 0.4s ease' }}>
                <div style={{ width: 64, height: 64, margin: '0 auto 22px', borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>✓</div>
                <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.05, margin: '0 0 10px' }}>Application sent.</h2>
                <p style={{ fontSize: 15.5, color: '#5A544A', margin: '0 auto 28px', maxWidth: 420 }}>
                  Your application to <b>Stripe</b> is in. We&apos;ll track its status and notify you the moment they respond.
                </p>
                <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href={appRoute('App Tracker.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1B1A16', color: '#F7F3EA', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 999, textDecoration: 'none' }}>View in tracker →</Link>
                  <Link href={appRoute('App Matches.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', background: '#FFFEFB', color: '#1B1A16', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D9D0BE' }}>Back to matches</Link>
                </div>
              </div>
            )}

            {/* NAV BUTTONS */}
            {showNav && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
                {canBack && (
                  <button onClick={back} style={{ fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '13px 22px', cursor: 'pointer' }}>← Back</button>
                )}
                <div style={{ flex: 1 }} />
                <button onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '14px 26px', cursor: 'pointer' }}>
                  {nextLabel} <span>→</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
