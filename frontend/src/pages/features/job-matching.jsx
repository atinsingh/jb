'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const STATS = [
  { value: 'Daily', label: 'Fresh roles scanned across verified employers' },
  { value: '100%', label: 'Of matches show the reasoning behind them' },
  { value: '0', label: 'Applications sent without your approval' },
];

const STEPS = [
  { n: '01', title: 'Build your profile', desc: "Skills, seniority, comp, location, and the things you'd never compromise on — captured once." },
  { n: '02', title: 'We scan verified employers', desc: 'Fresh postings from verified employers, indexed and scored against your profile every day.' },
  { n: '03', title: 'You get a shortlist', desc: 'Only strong fits, each with the reasoning shown — so you spend time on roles worth it.' },
];

const CAPABILITIES = [
  { n: '01', title: 'The reasoning shown', desc: 'Every match spells out why it fits — skills, comp, location, seniority — never a black box.' },
  { n: '02', title: 'Dealbreaker filters', desc: "Set hard limits on location, salary, and seniority — we won't surface roles you'd reject." },
  { n: '03', title: 'Daily shortlist', desc: 'A short list of new fits each morning — review in a couple of minutes, apply on your terms.' },
];

export default function JobMatching() {
  return (
    <>
      <Head>
        <title>Job Matching That Shows Its Reasoning — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbmatch * {
          box-sizing: border-box;
        }
        #jbmatch ::selection {
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

      <div id="jbmatch" style={{ background: 'transparent', color: 'var(--jb-d-ink)', fontFamily: 'var(--jb-font-sans)' }}>
        <PublicLayout>

        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.08em', color: 'var(--jb-d-ink-55)' }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: 'var(--jb-d-ink-55)', textDecoration: 'none' }}>HOME</Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: 'var(--jb-d-accent)' }}>JOB MATCHING</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid var(--jb-d-line-btn)', borderRadius: 999, padding: '7px 14px', marginBottom: 24 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--jb-d-accent)' }} />
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--jb-d-ink-70)' }}>Product — Job Matching</span>
              </div>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(34px, 7vw, 74px)', lineHeight: 0.98, letterSpacing: '-0.01em', margin: '0 0 22px' }}>
                Job matches that<br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>show why.</span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', maxWidth: 470, margin: '0 0 32px' }}>
                Jobocate scans fresh openings from verified employers and surfaces only the roles you're eligible for — each with the reasoning shown, so you decide where to apply.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link href={appRoute('App Matches.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--jb-d-footer)', color: '#F7F3EA', fontSize: 16, fontWeight: 600, padding: '15px 26px', borderRadius: 999, textDecoration: 'none' }}>
                  See my matches <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--jb-d-ink)', fontSize: 16, fontWeight: 600, padding: '15px 22px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D2C9B7' }}>How matching works</a>
              </div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: 'var(--jb-d-ink-65)' }}>● New roles indexed from <b style={{ color: 'var(--jb-d-accent)' }}>verified employers</b> every day</div>
            </div>

            {/* MATCH FEED MOCK */}
            <div style={{ animation: 'riseIn 0.9s ease both' }}>
              <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 16, boxShadow: '0 30px 60px -28px rgba(27,26,22,0.28)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Your matches today</div>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-accent)' }}>● refreshed 2m ago</div>
                </div>
                <div style={{ border: '1px solid var(--jb-d-line-card)', borderRadius: 12, padding: 14, marginBottom: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 9 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--jb-d-accent-tint)', color: 'var(--jb-d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>St</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>Senior Product Designer</div>
                      <div style={{ fontSize: 12, color: 'var(--jb-d-ink-65)' }}>Meridian · Remote (US)</div>
                    </div>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--jb-d-accent)' }}>96%</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: 'var(--jb-d-accent-tint)', color: 'var(--jb-d-accent)', borderRadius: 999, padding: '3px 9px' }}>✓ design systems</span>
                    <span style={{ fontSize: 11, background: 'var(--jb-d-accent-tint)', color: 'var(--jb-d-accent)', borderRadius: 999, padding: '3px 9px' }}>✓ fintech</span>
                    <span style={{ fontSize: 11, background: 'var(--jb-d-accent-tint)', color: 'var(--jb-d-accent)', borderRadius: 999, padding: '3px 9px' }}>✓ salary fit</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid var(--jb-d-line-card)', borderRadius: 12, padding: '12px 14px', marginBottom: 9 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>Fi</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Product Manager, Growth</div>
                    <div style={{ fontSize: 12, color: 'var(--jb-d-ink-65)' }}>Juniper · Hybrid SF</div>
                  </div>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--jb-d-accent)' }}>93%</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid var(--jb-d-line-card)', borderRadius: 12, padding: '12px 14px' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 9, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>Li</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Staff Frontend Engineer</div>
                    <div style={{ fontSize: 12, color: 'var(--jb-d-ink-65)' }}>Cobalt Labs · Remote</div>
                  </div>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 15, fontWeight: 600, color: 'var(--jb-d-accent)' }}>91%</div>
                </div>
              </div>
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
        <section id="how" style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 54 }}>
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— How it works</div>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>Matching built on your real profile</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 36 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ borderTop: '2px solid var(--jb-d-footer)', paddingTop: 22 }}>
                <div style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(28px, 6vw, 60px)', lineHeight: 1, color: 'var(--jb-d-accent)', marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITY CARDS */}
        <section style={{ background: 'var(--jb-d-footer)', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
            <div style={{ maxWidth: 620, marginBottom: 46 }}>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— Why it&apos;s different</div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0, color: '#FBF8F1' }}>A shortlist, not a firehose</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 20 }}>
              {CAPABILITIES.map((c) => (
                <div key={c.n} style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 16, padding: 28 }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: 'var(--jb-d-accent)', marginBottom: 18 }}>{c.n}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FBF8F1', margin: '0 0 10px' }}>{c.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: 0 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '88px 32px', textAlign: 'center' }}>
          <div style={{ color: 'var(--jb-d-accent)', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>— The promise</div>
          <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.25, margin: '0 0 28px' }}>No more scrolling every board. Each morning, a short list of roles you're eligible for — and you choose which ones are worth applying to.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>JB</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>How Jobocate is built to work</div>
              <div style={{ fontSize: 13.5, color: 'var(--jb-d-ink-65)' }}>Matched to eligibility, applied on your terms</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--jb-d-footer)', borderRadius: 24, padding: '78px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(31,164,99,0.42), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(27px, 5vw, 58px)', lineHeight: 1.02, color: '#FBF8F1', margin: '0 auto 16px', maxWidth: 640 }}>See your matches today</h2>
              <p style={{ fontSize: 18, color: 'var(--jb-d-ink-65)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>Build your profile and get your first shortlist free — each match with the reasoning shown.</p>
              <Link href={appRoute('App Matches.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontSize: 17, fontWeight: 700, padding: '17px 32px', borderRadius: 999, textDecoration: 'none' }}>
                See my matches <span style={{ fontSize: 19 }}>→</span>
              </Link>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
