'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const HOW = [
  { n: '01', title: 'Paste the role', body: 'Drop in any job description. We read the responsibilities, the mission, and the tone the team writes in.' },
  { n: '02', title: 'Match your experience', body: 'Your accomplishments are lined up against what the role asks for — each claim tied to a real bullet on your resume.' },
  { n: '03', title: 'Edit and send', body: "Adjust the tone, cut a line, approve it. The letter attaches automatically when you auto-apply." },
];

const CARDS = [
  { n: '01', title: 'Tone control', body: 'Warm, formal, or direct — set the voice to match the company and the role before you send.' },
  { n: '02', title: 'Evidence-linked', body: 'Every paragraph points back to a real line on your resume, so nothing is invented.' },
  { n: '03', title: 'Auto-attached', body: 'When Auto-Apply submits within your limits, the matching letter goes with it — no copy-paste.' },
];

const STATS = [
  { value: '1', label: 'Click from job post to first draft' },
  { value: '100%', label: 'Drawn from your real experience' },
  { value: '0', label: 'Generic "Dear Sir or Madam" openers' },
];

export default function CoverLettersPage() {
  return (
    <>
      <Head>
        <title>AI Cover Letters — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbcover * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jbcover ::selection {
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

      <div id="jbcover" style={{ background: 'transparent', color: 'var(--jb-d-ink)', fontFamily: 'var(--jb-font-sans)', WebkitFontSmoothing: 'antialiased' }}>
        <PublicLayout>

        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.08em', color: 'var(--jb-d-ink-55)' }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: 'var(--jb-d-ink-55)', textDecoration: 'none' }}>HOME</Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: 'var(--jb-d-accent)' }}>COVER LETTERS</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid var(--jb-d-line-btn)', borderRadius: 999, padding: '7px 14px', marginBottom: 24 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--jb-d-accent)' }} />
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--jb-d-ink-70)' }}>Product — AI Cover Letters</span>
              </div>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(34px, 7vw, 74px)', lineHeight: 0.98, letterSpacing: '-0.01em', margin: '0 0 22px' }}>
                Cover letters in<br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>your voice.</span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', maxWidth: 470, margin: '0 0 32px' }}>
                Paste a job description and get a tailored cover letter that ties your real experience to what the team is hiring for. You approve every line before it goes anywhere.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link href={appRoute('App Login.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--jb-d-footer)', color: '#F7F3EA', fontSize: 16, fontWeight: 600, padding: '15px 26px', borderRadius: 999, textDecoration: 'none' }}>Write one free <span style={{ fontSize: 18 }}>→</span></Link>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--jb-d-ink)', fontSize: 16, fontWeight: 600, padding: '15px 22px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D2C9B7' }}>See an example</a>
              </div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: 'var(--jb-d-ink-65)' }}>● Built from your resume — you <b style={{ color: 'var(--jb-d-accent)' }}>approve every line</b></div>
            </div>

            {/* COVER LETTER MOCK */}
            <div style={{ animation: 'riseIn 0.9s ease both', position: 'relative' }}>
              <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 16, boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)', padding: '34px 36px' }}>
                <div style={{ fontSize: 12.5, color: 'var(--jb-d-ink-65)', marginBottom: 18 }}>Dear Hiring Team at Meridian,</div>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--jb-d-ink-85)', margin: '0 0 12px' }}>When I read that you&apos;re rebuilding the payments dashboard, I thought of the <span style={{ background: 'rgba(31,164,99,0.18)', padding: '0 3px' }}>latency work I led at Cobalt Labs</span> — cutting load times 40% for a similar surface.</p>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--jb-d-ink-85)', margin: '0 0 12px' }}>Your focus on <span style={{ background: 'rgba(31,164,99,0.18)', padding: '0 3px' }}>developer-first design</span> is exactly the problem I want to keep solving, and I&apos;d bring five years of...</p>
                <div style={{ height: 9, background: 'var(--jb-d-glass)', borderRadius: 4, marginBottom: 7, width: '96%' }} />
                <div style={{ height: 9, background: 'var(--jb-d-glass)', borderRadius: 4, width: '62%' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -16, left: -12, background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, padding: '9px 13px', borderRadius: 11, boxShadow: '0 14px 28px -10px rgba(31,164,99,0.6)' }}>✓ Tailored to this role</div>
            </div>
          </div>
        </section>

        {/* STAT BAND */}
        <section style={{ background: 'var(--jb-d-glass)', borderTop: '1px solid var(--jb-d-line-card)', borderBottom: '1px solid var(--jb-d-line-card)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '46px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 24 }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 600, lineHeight: 1 }}>{s.value}</div>
                <div style={{ width: 32, height: 3, background: 'var(--jb-d-accent)', margin: '12px 0 10px' }} />
                <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 54 }}>
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— How it works</div>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>Specific beats generic, every time</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 36 }}>
            {HOW.map((h) => (
              <div key={h.n} style={{ borderTop: '2px solid var(--jb-d-footer)', paddingTop: 22 }}>
                <div style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(28px, 6vw, 60px)', lineHeight: 1, color: 'var(--jb-d-accent)', marginBottom: 14 }}>{h.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{h.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITY CARDS */}
        <section style={{ background: 'var(--jb-d-footer)', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
            <div style={{ maxWidth: 620, marginBottom: 46 }}>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— The details</div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0, color: '#FBF8F1' }}>Sounds like you, not a robot</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 20 }}>
              {CARDS.map((c) => (
                <div key={c.n} style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 28 }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: 'var(--jb-d-accent)', marginBottom: 18 }}>{c.n}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FBF8F1', margin: '0 0 10px' }}>{c.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: 0 }}>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '88px 32px', textAlign: 'center' }}>
          <div style={{ color: 'var(--jb-d-accent)', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>IN PRACTICE</div>
          <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.25, margin: '0 0 28px' }}>&quot;A letter that names the team&apos;s actual work and ties it to yours — the opposite of a template with the company name swapped in.&quot;</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#3A6F4E', color: 'var(--jb-d-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>✓</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Written from your resume</div>
              <div style={{ fontSize: 13.5, color: 'var(--jb-d-ink-65)' }}>Every claim traceable to real work</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--jb-d-footer)', borderRadius: 24, padding: '78px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(31,164,99,0.42), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(27px, 5vw, 58px)', lineHeight: 1.02, color: '#FBF8F1', margin: '0 auto 16px', maxWidth: 640 }}>Never face a blank page again</h2>
              <p style={{ fontSize: 18, color: 'var(--jb-d-ink-65)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>Write your first tailored cover letter free. Edit it, approve it, and attach it when you apply.</p>
              <Link href={appRoute('App Login.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontSize: 17, fontWeight: 700, padding: '17px 32px', borderRadius: 999, textDecoration: 'none' }}>Write one free <span style={{ fontSize: 19 }}>→</span></Link>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
