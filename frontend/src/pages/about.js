'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const STATS = [
  { value: 'Eligible', label: 'Every match is checked against what the role actually requires' },
  { value: 'Tailored', label: 'Applications drafted from your real resume and experience' },
  { value: 'Your call', label: 'Nothing is submitted until you review and approve it' },
  { value: 'Verified', label: 'We only apply on real, employer-owned job pages' },
];

const VALUES = [
  {
    title: 'Candidate-first, always',
    body: "We work for the job seeker — never recruiters paying for placement. If it's not good for the candidate, we don't ship it.",
  },
  {
    title: 'Real roles, no spam',
    body: 'We only ever touch verified employer pages. No resale boards, no ghost jobs, no scams — ever.',
  },
  {
    title: 'Automation with a human in the loop',
    body: "AI does the busywork; you stay in control. Nothing goes out that you couldn't review and approve.",
  },
];

const TEAM = [
  {
    initials: 'AM',
    bg: 'var(--jb-d-accent)',
    color: 'var(--jb-d-bg)',
    name: 'Aisha Mensah',
    role: 'Co-founder & CEO',
    body: 'Ex-recruiting lead. Spent a decade watching great people get filtered out by bad software.',
  },
  {
    initials: 'RK',
    bg: 'var(--jb-d-footer)',
    color: '#F7F3EA',
    name: 'Ravi Kapoor',
    role: 'Co-founder & CTO',
    body: 'Built ML ranking at scale. Believes automation should serve people, not replace them.',
  },
  {
    initials: 'LT',
    bg: '#C9622E',
    color: '#fff',
    name: 'Lena Torres',
    role: 'Head of Product',
    body: 'Career-switcher turned PM. Designs for the version of herself that was job-hunting at 2am.',
  },
  {
    initials: 'JO',
    bg: '#3A6F4E',
    color: '#fff',
    name: 'Jordan Okafor',
    role: 'Head of Trust & Safety',
    body: 'Keeps every application on a real, verified page. The reason we never touch scam boards.',
  },
];

export default function About() {
  return (
    <>
      <Head>
        <title>About Jobocate — AI job search on your terms</title>
      </Head>

      <style jsx global>{`
        #jbabout * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jbabout ::selection {
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
        id="jbabout"
        style={{
          background: 'transparent',
          color: 'var(--jb-d-ink)',
          fontFamily: 'var(--jb-font-sans)',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <PublicLayout>

        {/* HERO */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 32px 48px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--jb-font-mono)',
              fontSize: 11.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--jb-d-accent)',
              marginBottom: 18,
            }}
          >
            — About Jobocate
          </div>
          <h1
            style={{
              fontFamily: 'var(--jb-font-display)',
              fontWeight: 400,
              fontSize: 'clamp(29px, 6vw, 64px)',
              lineHeight: 1.04,
              letterSpacing: '-0.01em',
              margin: '0 0 22px',
              animation: 'riseIn 0.7s ease both',
            }}
          >
            The job search is broken.
            <br />
            We&apos;re{' '}
            <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>
              fixing it.
            </span>
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: 'var(--jb-d-ink-85)', maxWidth: 600, margin: '0 auto' }}>
            Good candidates spend months lost in application portals while roles they&apos;d be right for go unfilled.
            Jobocate closes that gap — putting real job-search tooling in everyone&apos;s hands: eligibility-checked
            matches, applications tailored from your experience, and auto-apply you approve.
          </p>
        </section>

        {/* MISSION STATEMENT */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 80px' }}>
          <div style={{ background: 'var(--jb-d-footer)', borderRadius: 24, padding: '64px 56px', position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 15% 0%, rgba(31,164,99,0.28), transparent 55%)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', maxWidth: 760 }}>
              <div
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--jb-d-accent)',
                  marginBottom: 20,
                }}
              >
                — Our mission
              </div>
              <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 40px)', lineHeight: 1.22, color: '#FBF8F1', margin: 0 }}>
                To make a fair, focused job search the default — so the right person and the right role find each other
                with less noise, less guesswork, and nothing sent without your say-so.
              </p>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
              gap: 24,
              borderTop: '1px solid var(--jb-d-line-card)',
              paddingTop: 48,
            }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 44px)', fontWeight: 600, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ width: 32, height: 3, background: 'var(--jb-d-accent)', margin: '14px 0 10px' }} />
                <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* VALUES */}
        <section style={{ background: 'var(--jb-d-glass)', borderTop: '1px solid var(--jb-d-line-card)', borderBottom: '1px solid var(--jb-d-line-card)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 32px' }}>
            <div style={{ maxWidth: 600, marginBottom: 52 }}>
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
                — What we believe
              </div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>
                The principles behind the product
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 36 }}>
              {VALUES.map((v) => (
                <div key={v.title} style={{ borderTop: '2px solid var(--jb-d-footer)', paddingTop: 22 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{v.title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 48 }}>
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
              — Who&apos;s building it
            </div>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>
              A team that&apos;s been on both sides of the table
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 20 }}>
            {TEAM.map((m) => (
              <div
                key={m.name}
                style={{ background: 'var(--jb-d-glass)', border: '1px solid var(--jb-d-line-card)', borderRadius: 16, padding: 24 }}
              >
                <span
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: m.bg,
                    color: m.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 18,
                    marginBottom: 16,
                  }}
                >
                  {m.initials}
                </span>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: 'var(--jb-d-ink-65)', marginBottom: 10 }}>{m.role}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--jb-d-ink-65)', margin: 0 }}>{m.body}</p>
              </div>
            ))}
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
                Find your next role — or help others find theirs
              </h2>
              <p style={{ fontSize: 18, color: 'var(--jb-d-ink-65)', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.55 }}>
                Start your search free, or come build the product that runs it. Either way, there&apos;s a place for you
                here.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href={appRoute('Enterprise.dc.html')}
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
                  View open roles <span style={{ fontSize: 19 }}>→</span>
                </Link>
                <Link
                  href={appRoute('Jobocate Home.dc.html')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'transparent',
                    color: '#F7F3EA',
                    border: '1px solid #3A382F',
                    fontSize: 17,
                    fontWeight: 600,
                    padding: '17px 28px',
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  Try Jobocate free
                </Link>
              </div>
            </div>
          </div>
        </section>

        </PublicLayout>
      </div>
    </>
  );
}
