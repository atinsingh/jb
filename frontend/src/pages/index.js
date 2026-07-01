'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const STAT_DEFS = [
  { target: 500, suffix: 'K+', label: 'Applications sent' },
  { target: 85, suffix: '%', label: 'Interview rate' },
  { target: 100, suffix: 'K+', label: 'People hired' },
  { target: 10, suffix: '×', label: 'Faster job search' },
];

const JOBS = [
  { logo: 'St', company: 'Stripe', role: 'Senior Product Designer', match: '96%', bg: '#EAF6EE', fg: '#157A49' },
  { logo: 'Fi', company: 'Figma', role: 'Product Manager, Growth', match: '93%', bg: '#F4EFE4', fg: '#1B1A16' },
  { logo: 'Li', company: 'Linear', role: 'Frontend Engineer', match: '91%', bg: '#F4EFE4', fg: '#1B1A16' },
];

const LOGOS = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix'];

const FEATURES = [
  { n: '01', title: 'AI Resume Builder', desc: 'ATS-optimized resumes that clear automated screening, tailored to each application in seconds.', dot: '#1FA463', dc: 'Resume Builder.dc.html' },
  { n: '02', title: 'Smart Job Matching', desc: 'We scan thousands of fresh roles daily and surface the ones that fit your skills and goals.', dot: '#1B1A16', dc: 'Job Matching.dc.html' },
  { n: '03', title: 'Auto-Apply', desc: 'Apply to verified roles on company career pages automatically — we handle the busywork.', dot: '#1FA463', dc: 'Auto-Apply.dc.html' },
  { n: '04', title: 'Cover Letters', desc: 'Personalized, compelling cover letters generated for any role with a single click.', dot: '#1B1A16', dc: 'Cover Letters.dc.html' },
  { n: '05', title: 'Application Tracker', desc: 'Every application, status, and interview in one clean view — never lose track again.', dot: '#1FA463', dc: 'App Tracker.dc.html' },
  { n: '06', title: 'Interview Prep', desc: 'Practice with AI-powered mock interviews and get instant, specific feedback to improve.', dot: '#1B1A16', dc: 'Interview Prep.dc.html' },
];

const STEPS = [
  { n: '01', title: 'Upload your resume', desc: 'Our AI reads your experience, skills, and career goals to build a rich professional profile.' },
  { n: '02', title: 'Get matched & apply', desc: 'We surface the roles worth your time and auto-apply to verified openings on your behalf.' },
  { n: '03', title: 'Land the interview', desc: 'Track every response, prep with AI mock interviews, and walk in ready to win the offer.' },
];

const TESTIMONIALS = [
  { quote: 'I went from 3 hours a day applying to 15 minutes. I landed 3× more interviews in a month.', name: 'Sarah Chen', role: 'Software Engineer at Google', initials: 'SC', bg: '#1FA463', fg: '#0C2C1C' },
  { quote: 'The resume optimization got me past ATS filters that had been silently blocking me for months.', name: 'Marcus Johnson', role: 'Product Manager at Stripe', initials: 'MJ', bg: '#C9622E', fg: '#fff' },
  { quote: 'Auto-apply to real, verified pages was the game changer. No sketchy boards — only opportunities.', name: 'Emily Rodriguez', role: 'Data Scientist at Meta', initials: 'ER', bg: '#3A6F4E', fg: '#fff' },
];

const FAQ_DATA = [
  { q: 'How does auto-apply actually work?', a: 'You set your preferences once. Our AI applies directly to verified company career pages on your behalf — never scam listings or sketchy third-party aggregators. You can review and approve each application before it goes out.' },
  { q: 'Is my data secure?', a: 'Absolutely. We are GDPR compliant and never sell or share your data with third parties. You stay in full control and can export or delete your account and data at any time.' },
  { q: 'Will my applications still feel personal?', a: 'Yes. Every resume and cover letter is tailored to the specific role using your real experience — not generic templates. Recruiters see a focused, relevant application, not a mass blast.' },
  { q: 'Can I use Jobocate for free?', a: 'Yes. The free tier includes resume building, job matching, and a monthly batch of auto-apply credits. Premium plans unlock unlimited applications, advanced matching, and interview prep.' },
  { q: 'How fast will I see results?', a: 'Most members get their profile matched within minutes and see their first auto-applications go out the same day. Interview requests typically start arriving within the first two weeks.' },
];

export default function JobocateHome() {
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [live, setLive] = useState({ sent: 0, int: 0, match: 0, saved: 0 });
  const [open, setOpen] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const dur = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const p = 1 - Math.pow(1 - t, 3);
      setCounts(STAT_DEFS.map((s) => Math.round(s.target * p)));
      setLive({
        sent: Math.round(247 * p),
        int: Math.round(18 * p),
        match: Math.round(94 * p),
        saved: Math.round(52 * p),
      });
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const login = appRoute('App Login.dc.html');

  return (
    <>
      <Head>
        <title>Jobocate — Your AI job-search copilot</title>
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
        #jbhome * {
          box-sizing: border-box;
        }
        #jbhome ::selection {
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
        @keyframes floaty {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-7px);
          }
        }
      `}</style>

      <div
        id="jbhome"
        style={{
          background: '#F7F3EA',
          color: '#1B1A16',
          fontFamily: "'Hanken Grotesk', sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* HERO */}
        <section id="top" style={{ maxWidth: 1200, margin: '0 auto', padding: '74px 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid #D9D0BE', borderRadius: 999, padding: '7px 14px', marginBottom: 26 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463', boxShadow: '0 0 0 4px rgba(31,164,99,0.18)' }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5A544A' }}>Your AI job-search copilot</span>
              </div>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 78, lineHeight: 0.98, letterSpacing: '-0.01em', margin: '0 0 22px' }}>
                Land the <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>interview.</span>
                <br />
                Skip the <span style={{ fontStyle: 'italic', position: 'relative' }}>grind.</span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: '#4B463E', maxWidth: 480, margin: '0 0 32px' }}>
                Jobocate matches you to the right roles, tailors every application, and applies on your behalf — so your time goes to interviewing, not endless searching.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 34 }}>
                <Link href={login} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#1B1A16', color: '#F7F3EA', fontSize: 16, fontWeight: 600, padding: '15px 26px', borderRadius: 999, textDecoration: 'none' }}>
                  Start free <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: '#1B1A16', fontSize: 16, fontWeight: 600, padding: '15px 22px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D2C9B7' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1B1A16', color: '#F7F3EA', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>▶</span>
                  Watch demo
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex' }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', border: '2px solid #F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginRight: -10 }}>SC</span>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#1B1A16', color: '#F7F3EA', border: '2px solid #F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginRight: -10 }}>MJ</span>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#C9622E', color: '#fff', border: '2px solid #F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginRight: -10 }}>ER</span>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#3A6F4E', color: '#fff', border: '2px solid #F7F3EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginRight: -10 }}>+K</span>
                </div>
                <div>
                  <div style={{ color: '#1FA463', fontSize: 14, letterSpacing: '0.1em' }}>★★★★★</div>
                  <div style={{ fontSize: 13.5, color: '#5A544A' }}>Loved by <b style={{ color: '#1B1A16' }}>100,000+</b> job seekers</div>
                </div>
              </div>
            </div>

            {/* PRODUCT MOCKUP */}
            <div style={{ animation: 'riseIn 0.9s ease both' }}>
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '13px 16px', borderBottom: '1px solid #EEE7D9' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E1786A' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E8C15B' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#7BC08C' }} />
                  <span style={{ marginLeft: 12, flex: 1, background: '#F4EFE4', borderRadius: 6, padding: '5px 12px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>app.jobocate.com/dashboard</span>
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Today&apos;s matches</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#1FA463' }}>● 12 new</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
                    <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8A8378', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Applied</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 600 }}>{live.sent}</div>
                    </div>
                    <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8A8378', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interviews</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 600 }}>{live.int}</div>
                    </div>
                    <div style={{ background: '#EAF6EE', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#1FA463', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Match</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 600, color: '#157A49' }}>{live.match}%</div>
                    </div>
                    <div style={{ background: '#F6F1E6', borderRadius: 10, padding: 10 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#8A8378', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Saved</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 600 }}>{live.saved}</div>
                    </div>
                  </div>
                  {JOBS.map((job) => (
                    <div key={job.company} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid #EEE7D9', borderRadius: 12, marginBottom: 8 }}>
                      <span style={{ width: 38, height: 38, borderRadius: 9, background: job.bg, color: job.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{job.logo}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.role}</div>
                        <div style={{ fontSize: 12, color: '#8A8378' }}>{job.company}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: '#157A49' }}>{job.match}</div>
                        <div style={{ fontSize: 10, color: '#8A8378' }}>match</div>
                      </div>
                      <span style={{ flexShrink: 0, background: '#1B1A16', color: '#F7F3EA', fontSize: 11, fontWeight: 600, padding: '7px 12px', borderRadius: 999 }}>Apply</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', right: -6, top: -46, background: '#1FA463', color: '#0C2C1C', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, padding: '8px 12px', borderRadius: 10, boxShadow: '0 12px 24px -10px rgba(31,164,99,0.6)', animation: 'floaty 4s ease-in-out infinite' }}>
                  ✓ Auto-applied to 6 roles
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 34, flexWrap: 'wrap', justifyContent: 'center', borderTop: '1px solid #E7E0D2', borderBottom: '1px solid #E7E0D2', padding: '22px 0' }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Our members get hired at</span>
            {LOGOS.map((logo) => (
              <span key={logo} style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: '#A79E8F' }}>{logo}</span>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 72px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {STAT_DEFS.map((s, i) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, color: '#1B1A16' }}>{counts[i]}{s.suffix}</div>
                <div style={{ width: 36, height: 3, background: '#1FA463', margin: '14px 0 12px' }} />
                <div style={{ fontSize: 14.5, color: '#5A544A' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ background: '#F1ECE0', borderTop: '1px solid #E7E0D2', borderBottom: '1px solid #E7E0D2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 32px' }}>
            <div style={{ maxWidth: 620, marginBottom: 52 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 16 }}>— Everything you need</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 50, lineHeight: 1.04, letterSpacing: '-0.01em', margin: '0 0 14px' }}>A complete toolkit for the whole job hunt</h2>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: '#4B463E', margin: 0 }}>From a sharper resume to applications that send themselves — every tool you need to go from searching to signing.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: '#E1D9C9', border: '1px solid #E1D9C9', borderRadius: 16, overflow: 'hidden' }}>
              {FEATURES.map((f) => (
                <Link key={f.n} href={appRoute(f.dc)} style={{ background: '#FBF8F1', padding: '30px 26px', minHeight: 210, textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#1FA463', fontWeight: 600 }}>{f.n}</span>
                    <span style={{ width: 9, height: 9, background: f.dot }} />
                  </div>
                  <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 10px' }}>{f.title}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#5A544A', margin: 0 }}>{f.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto 60px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 16 }}>— Simple process</div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 50, lineHeight: 1.04, margin: 0 }}>Three steps to your next role</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ borderTop: '2px solid #1B1A16', paddingTop: 22 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 64, lineHeight: 1, color: '#1FA463', marginBottom: 16 }}>{s.n}</div>
                <h3 style={{ fontSize: 21, fontWeight: 700, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="stories" style={{ background: '#1B1A16', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '90px 32px' }}>
            <div style={{ maxWidth: 600, marginBottom: 54 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 16 }}>— Success stories</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 50, lineHeight: 1.04, margin: 0, color: '#FBF8F1' }}>Real people, real offers</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
              {TESTIMONIALS.map((t) => (
                <div key={t.name} style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 30 }}>
                  <div style={{ color: '#5BD08C', fontSize: 15, letterSpacing: '0.12em', marginBottom: 18 }}>★★★★★</div>
                  <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 23, lineHeight: 1.32, color: '#F2EDE2', margin: '0 0 26px' }}>&quot;{t.quote}&quot;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #34322A', paddingTop: 20 }}>
                    <span style={{ width: 42, height: 42, borderRadius: '50%', background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{t.initials}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: '#FBF8F1' }}>{t.name}</div>
                      <div style={{ fontSize: 13, color: '#9A9286' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ maxWidth: 860, margin: '0 auto', padding: '90px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 16 }}>— FAQ</div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 50, lineHeight: 1.04, margin: 0 }}>Questions, answered</h2>
          </div>
          <div style={{ borderTop: '1px solid #E1D9C9' }}>
            {FAQ_DATA.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} style={{ borderBottom: '1px solid #E1D9C9' }}>
                  <button
                    onClick={() => setOpen((cur) => (cur === i ? -1 : i))}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '24px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, fontFamily: 'inherit' }}
                  >
                    <span style={{ fontSize: 18.5, fontWeight: 600, color: '#1B1A16' }}>{item.q}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, color: '#1FA463', flexShrink: 0, lineHeight: 1 }}>{isOpen ? '–' : '+'}</span>
                  </button>
                  <div style={{ overflow: 'hidden', maxHeight: isOpen ? '240px' : '0px', transition: 'max-height 0.32s ease' }}>
                    <p style={{ fontSize: 15.5, lineHeight: 1.6, color: '#5A544A', margin: 0, padding: '0 4px 26px', maxWidth: 680 }}>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FINAL CTA */}
        <section id="cta" style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', borderRadius: 24, padding: '84px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(31,164,99,0.42), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 20 }}>— No credit card required</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 62, lineHeight: 1.02, color: '#FBF8F1', margin: '0 auto 18px', maxWidth: 680 }}>Your next role is one click away</h2>
              <p style={{ fontSize: 18, color: '#B8B1A4', maxWidth: 480, margin: '0 auto 34px', lineHeight: 1.55 }}>Join 100,000+ professionals who turned the job hunt into a head start. Start free today.</p>
              <Link href={login} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1FA463', color: '#0C2C1C', fontSize: 17, fontWeight: 700, padding: '17px 32px', borderRadius: 999, textDecoration: 'none' }}>
                Get started free <span style={{ fontSize: 19 }}>→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <SiteFooter />
      </div>
    </>
  );
}
