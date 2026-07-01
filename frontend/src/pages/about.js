'use client';

import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const STATS = [
  { value: '100K+', label: 'People hired with Jobocate' },
  { value: '2021', label: 'Founded in San Francisco' },
  { value: '48', label: 'People on the team' },
  { value: '$40M', label: 'Raised to back the mission' },
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
    bg: '#1FA463',
    color: '#0C2C1C',
    name: 'Aisha Mensah',
    role: 'Co-founder & CEO',
    body: 'Ex-recruiting lead. Spent a decade watching great people get filtered out by bad software.',
  },
  {
    initials: 'RK',
    bg: '#1B1A16',
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
        <title>About — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbabout * {
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        #jbabout ::selection {
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
        id="jbabout"
        style={{
          background: '#F7F3EA',
          color: '#1B1A16',
          fontFamily: "'Hanken Grotesk',sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
          <SiteNav />
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 32px 48px', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#1FA463',
              marginBottom: 18,
            }}
          >
            — About Jobocate
          </div>
          <h1
            style={{
              fontFamily: "'Instrument Serif',serif",
              fontWeight: 400,
              fontSize: 64,
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
          <p style={{ fontSize: 19, lineHeight: 1.6, color: '#4B463E', maxWidth: 600, margin: '0 auto' }}>
            Talented people spend months lost in application portals while great roles go unfilled. Jobocate exists to
            close that gap — putting world-class job-search tooling in everyone&apos;s hands, not just those who can
            afford a coach.
          </p>
        </section>

        {/* MISSION STATEMENT */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 80px' }}>
          <div style={{ background: '#1B1A16', borderRadius: 24, padding: '64px 56px', position: 'relative', overflow: 'hidden' }}>
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
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11.5,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#5BD08C',
                  marginBottom: 20,
                }}
              >
                — Our mission
              </div>
              <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 40, lineHeight: 1.22, color: '#FBF8F1', margin: 0 }}>
                To make a fair, fast job search the default — so the right person and the right role find each other in
                days, not desperate months.
              </p>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 24,
              borderTop: '1px solid #E7E0D2',
              paddingTop: 48,
            }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 44, fontWeight: 600, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ width: 32, height: 3, background: '#1FA463', margin: '14px 0 10px' }} />
                <div style={{ fontSize: 14, color: '#5A544A' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* VALUES */}
        <section style={{ background: '#F1ECE0', borderTop: '1px solid #E7E0D2', borderBottom: '1px solid #E7E0D2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 32px' }}>
            <div style={{ maxWidth: 600, marginBottom: 52 }}>
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
                — What we believe
              </div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0 }}>
                The principles behind the product
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 36 }}>
              {VALUES.map((v) => (
                <div key={v.title} style={{ borderTop: '2px solid #1B1A16', paddingTop: 22 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{v.title}</h3>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: 0 }}>{v.body}</p>
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
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#1FA463',
                marginBottom: 16,
              }}
            >
              — Who&apos;s building it
            </div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0 }}>
              A team that&apos;s been on both sides of the table
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {TEAM.map((m) => (
              <div
                key={m.name}
                style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 16, padding: 24 }}
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
                <div style={{ fontSize: 13, color: '#7A7367', marginBottom: 10 }}>{m.role}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: '#7A7367', margin: 0 }}>{m.body}</p>
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
                Come build the future of work
              </h2>
              <p style={{ fontSize: 18, color: '#B8B1A4', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.55 }}>
                Whether you&apos;re hunting for your next role or want to help others find theirs — there&apos;s a place
                for you here.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href={appRoute('Enterprise.dc.html')}
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

        <SiteFooter />
      </div>
    </>
  );
}
