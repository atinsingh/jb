'use client';

import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const HERO_STATS = [
  { value: '40%', label: 'faster time-to-hire', color: '#5BD08C' },
  { value: '6', label: 'designers hired in Q1', color: '#FBF8F1' },
  { value: '0', label: 'recruiters added', color: '#8DA2F5' },
];

const META = [
  { label: 'Company', value: 'Stripe' },
  { label: 'Industry', value: 'Financial infrastructure' },
  { label: 'Team', value: 'Design hiring' },
  { label: 'Plan', value: 'Scale' },
];

const BLOCKS = [
  { isH: true, color: '#C9622E', text: 'The challenge' },
  {
    isP: true,
    text: 'Stripe’s design org was growing fast, but the talent team was small. Every open req drew hundreds of applicants, and manual screening had become the bottleneck — strong candidates sat in the queue for days while recruiters triaged.',
  },
  {
    isQuote: true,
    text: '"We were drowning in applicants and still worried we were missing the best ones."',
    cite: 'Dana Whitfield · Senior Recruiter',
  },
  { isH: true, color: '#157A49', text: 'The solution' },
  {
    isP: true,
    text: 'They turned on Autopilot across five design reqs. It scored every applicant against each role’s rubric, advanced the strongest into screening overnight, and queued polite declines for the rest — all waiting for one-tap recruiter approval.',
  },
  {
    isP: true,
    text: 'The Sourcing Agent ran in parallel, surfacing passive candidates and drafting personalized outreach. By the time the team logged in each morning, a clean, ranked shortlist was ready.',
  },
  {
    isQuote: true,
    text: '"Autopilot does the screening we never had time for. We hired a full design team without adding a recruiter."',
    cite: 'Dana Whitfield · Senior Recruiter',
  },
  { isH: true, color: '#364FC7', text: 'The results' },
  {
    isP: true,
    text: 'In a single quarter, Stripe cut time-to-hire by 40% and filled six design roles — including a senior hire sourced entirely through the agent. The team’s hours shifted from filtering résumés to interviewing the people who mattered.',
  },
];

const RESULTS = [
  { value: '40%', label: 'faster time-to-hire', color: '#5BD08C' },
  { value: '6', label: 'roles filled in Q1', color: '#FBF8F1' },
  { value: '92%', label: 'of interviews from AI shortlist', color: '#8DA2F5' },
];

export default function CustomerStory() {
  return (
    <>
      <Head>
        <title>How Stripe hired a full design pod — Jobocate Customer Story</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: #4263eb;
          color: #f7f3ea;
        }
      `}</style>

      <div
        id="emkt"
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          color: '#1B1A16',
          background: '#F7F3EA',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* HERO */}
        <section style={{ position: 'relative', overflow: 'hidden', background: '#15140F' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 80% 10%, rgba(66,99,235,0.32), transparent 55%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '56px 32px 60px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#8DA2F5', marginBottom: 18 }}>
              <Link href={appRoute('Customer Stories.dc.html')} style={{ color: '#8DA2F5', textDecoration: 'none' }}>
                Customer stories
              </Link>{' '}
              / <span style={{ color: '#B8B1A4' }}>Stripe</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 22 }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  background: '#1E2436',
                  color: '#8DA2F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 17,
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                St
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: '#8DA2F5',
                  background: 'rgba(66,99,235,0.16)',
                  border: '1px solid rgba(66,99,235,0.32)',
                  padding: '4px 10px',
                  borderRadius: 999,
                }}
              >
                EMPLOYER STORY
              </span>
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: 46,
                lineHeight: 1.08,
                color: '#FBF8F1',
                margin: '0 0 18px',
                maxWidth: 680,
              }}
            >
              How Stripe’s talent team hired a full design pod — without adding a recruiter.
            </h1>
            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', marginTop: 30 }}>
              {HERO_STATS.map((h) => (
                <div key={h.label}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 38, fontWeight: 600, color: h.color, lineHeight: 1 }}>
                    {h.value}
                  </div>
                  <div style={{ fontSize: 13, color: '#9A9286', marginTop: 5 }}>{h.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* META BAR */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px 0' }}>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', paddingBottom: 24, borderBottom: '1px solid #E7E0D2' }}>
            {META.map((m) => (
              <div key={m.label}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 9.5,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#9A9286',
                    marginBottom: 4,
                  }}
                >
                  {m.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1B1A16' }}>{m.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* NARRATIVE */}
        <article style={{ maxWidth: 680, margin: '0 auto', padding: '36px 32px 0' }}>
          {BLOCKS.map((b, i) => {
            if (b.isH) {
              return (
                <h2
                  key={i}
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: 1.15,
                    margin: '34px 0 12px',
                    color: b.color,
                  }}
                >
                  {b.text}
                </h2>
              );
            }
            if (b.isP) {
              return (
                <p key={i} style={{ fontSize: 17, lineHeight: 1.7, color: '#2A2820', margin: '0 0 20px' }}>
                  {b.text}
                </p>
              );
            }
            if (b.isQuote) {
              return (
                <blockquote
                  key={i}
                  style={{
                    margin: '28px 0',
                    padding: '6px 0 6px 24px',
                    borderLeft: '3px solid #4263EB',
                    fontFamily: "'Instrument Serif',serif",
                    fontSize: 25,
                    lineHeight: 1.32,
                    color: '#1B1A16',
                  }}
                >
                  {b.text}
                  <span
                    style={{
                      display: 'block',
                      fontFamily: "'Hanken Grotesk',sans-serif",
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#8A8378',
                      marginTop: 12,
                    }}
                  >
                    {b.cite}
                  </span>
                </blockquote>
              );
            }
            return null;
          })}

          {/* RESULTS BAND */}
          <div style={{ background: '#15140F', borderRadius: 18, padding: 28, margin: '32px 0' }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#5BD08C',
                marginBottom: 18,
              }}
            >
              The results
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
              {RESULTS.map((r) => (
                <div key={r.label}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 600, color: r.color, lineHeight: 1 }}>
                    {r.value}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#B8B1A4', marginTop: 6 }}>{r.label}</div>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* CTA */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '24px 32px 72px' }}>
          <div style={{ background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 24, padding: 44, textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 32, lineHeight: 1.08, margin: '0 0 12px' }}>
              See what Jobocate could do for your team.
            </h2>
            <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
              <Link
                href={appRoute('Book Demo.dc.html')}
                style={{ background: '#4263EB', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 24px', borderRadius: 999, textDecoration: 'none' }}
              >
                Book a demo
              </Link>
              <Link
                href={appRoute('Customer Stories.dc.html')}
                style={{
                  background: '#FFFEFB',
                  color: '#1B1A16',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '14px 24px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  border: '1px solid #C7D2FB',
                }}
              >
                More stories
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
