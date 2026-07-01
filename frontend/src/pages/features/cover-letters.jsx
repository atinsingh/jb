'use client';

import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const HOW = [
  { n: '01', title: 'Paste the role', body: 'Drop in any job description. We read the responsibilities, mission, and tone the team uses.' },
  { n: '02', title: 'We connect the dots', body: 'Your real wins are matched to what they need — every claim backed by something you actually did.' },
  { n: '03', title: 'Edit & send', body: "Tweak the tone, trim a line, and it's ready — attached automatically when you auto-apply." },
];

const CARDS = [
  { n: '01', title: 'Tone control', body: 'Warm, formal, or punchy — dial the voice to the company and the role in one tap.' },
  { n: '02', title: 'Evidence-linked', body: 'Each paragraph points back to a real bullet on your resume, so nothing is invented.' },
  { n: '03', title: 'Auto-attached', body: 'When Auto-Apply submits, the matching letter goes with it — no copy-paste shuffle.' },
];

const STATS = [
  { value: '8s', label: 'To a tailored first draft' },
  { value: '100%', label: 'Grounded in your real history' },
  { value: '0', label: 'Generic "Dear Sir or Madam"' },
];

export default function CoverLettersPage() {
  return (
    <>
      <Head>
        <title>Cover Letters — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbcover * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jbcover ::selection {
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

      <div id="jbcover" style={{ background: '#F7F3EA', color: '#1B1A16', fontFamily: "'Hanken Grotesk',sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        <SiteNav />

        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.08em', color: '#9A9286' }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: '#9A9286', textDecoration: 'none' }}>HOME</Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: '#157A49' }}>COVER LETTERS</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid #D9D0BE', borderRadius: 999, padding: '7px 14px', marginBottom: 24 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463' }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5A544A' }}>Product — AI Cover Letters</span>
              </div>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 74, lineHeight: 0.98, letterSpacing: '-0.01em', margin: '0 0 22px' }}>
                Cover letters in<br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>your voice.</span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: '#4B463E', maxWidth: 470, margin: '0 0 32px' }}>
                One click turns any job description into a specific, sincere cover letter — grounded in your real experience and the team&apos;s actual mission. No more blank-page dread.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link href={appRoute('App Login.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#1B1A16', color: '#F7F3EA', fontSize: 16, fontWeight: 600, padding: '15px 26px', borderRadius: 999, textDecoration: 'none' }}>Write one free <span style={{ fontSize: 18 }}>→</span></Link>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: '#1B1A16', fontSize: 16, fontWeight: 600, padding: '15px 22px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D2C9B7' }}>See an example</a>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>● Avg. draft ready in <b style={{ color: '#157A49' }}>8 seconds</b></div>
            </div>

            {/* COVER LETTER MOCK */}
            <div style={{ animation: 'riseIn 0.9s ease both', position: 'relative' }}>
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)', padding: '34px 36px' }}>
                <div style={{ fontSize: 12.5, color: '#8A8378', marginBottom: 18 }}>Dear Hiring Team at Stripe,</div>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#3B362F', margin: '0 0 12px' }}>When I read that you&apos;re rebuilding the payments dashboard, I thought of the <span style={{ background: 'rgba(31,164,99,0.18)', padding: '0 3px' }}>latency work I led at Linear</span> — cutting load times 40% for a similar surface.</p>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#3B362F', margin: '0 0 12px' }}>Your focus on <span style={{ background: 'rgba(31,164,99,0.18)', padding: '0 3px' }}>developer-first design</span> is exactly the problem I want to keep solving, and I&apos;d bring five years of...</p>
                <div style={{ height: 9, background: '#F1ECE0', borderRadius: 4, marginBottom: 7, width: '96%' }} />
                <div style={{ height: 9, background: '#F1ECE0', borderRadius: 4, width: '62%' }} />
              </div>
              <div style={{ position: 'absolute', bottom: -16, left: -12, background: '#1FA463', color: '#0C2C1C', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, padding: '9px 13px', borderRadius: 11, boxShadow: '0 14px 28px -10px rgba(31,164,99,0.6)' }}>✓ Tailored to this role</div>
            </div>
          </div>
        </section>

        {/* STAT BAND */}
        <section style={{ background: '#F1ECE0', borderTop: '1px solid #E7E0D2', borderBottom: '1px solid #E7E0D2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '46px 32px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{s.value}</div>
                <div style={{ width: 32, height: 3, background: '#1FA463', margin: '12px 0 10px' }} />
                <div style={{ fontSize: 14, color: '#5A544A' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 54 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 16 }}>— How it works</div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0 }}>Specific beats generic, every time</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 36 }}>
            {HOW.map((h) => (
              <div key={h.n} style={{ borderTop: '2px solid #1B1A16', paddingTop: 22 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 60, lineHeight: 1, color: '#1FA463', marginBottom: 14 }}>{h.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{h.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: 0 }}>{h.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITY CARDS */}
        <section style={{ background: '#1B1A16', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
            <div style={{ maxWidth: 620, marginBottom: 46 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 16 }}>— The details</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0, color: '#FBF8F1' }}>Sounds like you, not a robot</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {CARDS.map((c) => (
                <div key={c.n} style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 28 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#5BD08C', marginBottom: 18 }}>{c.n}</div>
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
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, lineHeight: 1.25, margin: '0 0 28px' }}>&quot;It wrote a letter so specific to the team that the recruiter quoted a line back to me in the interview.&quot;</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#3A6F4E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>ER</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Emily Rodriguez</div>
              <div style={{ fontSize: 13.5, color: '#7A7367' }}>Data Scientist at Meta</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', borderRadius: 24, padding: '78px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(31,164,99,0.42), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 58, lineHeight: 1.02, color: '#FBF8F1', margin: '0 auto 16px', maxWidth: 640 }}>Never face a blank page again</h2>
              <p style={{ fontSize: 18, color: '#B8B1A4', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>Write your first tailored cover letter free — in about eight seconds.</p>
              <Link href={appRoute('App Login.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1FA463', color: '#0C2C1C', fontSize: 17, fontWeight: 700, padding: '17px 32px', borderRadius: 999, textDecoration: 'none' }}>Write one free <span style={{ fontSize: 19 }}>→</span></Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
