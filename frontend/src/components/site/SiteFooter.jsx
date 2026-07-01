'use client';

import Head from 'next/head';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Auto-Apply', href: 'Auto-Apply.dc.html' },
      { label: 'Resume Builder', href: 'Resume Builder.dc.html' },
      { label: 'Job Matching', href: 'Job Matching.dc.html' },
      { label: 'Cover Letters', href: 'Cover Letters.dc.html' },
      { label: 'Tracker', href: 'Application Tracker.dc.html' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'For employers', href: 'For Employers.dc.html' },
      { label: 'Career switchers', href: '#' },
      { label: 'Senior ICs', href: '#' },
      { label: 'Enterprise', href: 'Enterprise.dc.html' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: 'About.dc.html' },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Press', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help Center', href: '#' },
      { label: 'Pricing', href: 'Pricing.dc.html' },
      { label: 'API', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Cookies', href: '#' },
      { label: 'GDPR', href: '#' },
    ],
  },
];

const SOCIAL = ['X', 'in', 'gh', 'yt'];

const linkStyle = {
  display: 'block',
  color: '#B8B1A4',
  fontSize: 14.5,
  marginBottom: 12,
  textDecoration: 'none',
  transition: 'color 0.15s',
};

const socialStyle = {
  width: 34,
  height: 34,
  border: '1px solid #2C2A22',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  color: '#9A9286',
  fontWeight: 600,
};

export default function SiteFooter() {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbfoot a:hover {
          color: #1b1a16 !important;
        }
      `}</style>

      <footer id="jbfoot" style={{ fontFamily: "'Hanken Grotesk',sans-serif", background: '#15140F', color: '#B8B1A4' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 32px 34px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.7fr 1fr 1fr 1fr 1fr',
              gap: 36,
              paddingBottom: 52,
              borderBottom: '1px solid #2C2A22',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
                <span
                  style={{
                    fontFamily: "'Bricolage Grotesque',sans-serif",
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontSize: 24,
                    lineHeight: 1,
                    color: '#FBF8F1',
                  }}
                >
                  Jobocate<span style={{ color: '#5BD08C' }}>.</span>
                </span>
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, maxWidth: 280, margin: '0 0 22px' }}>
                The AI copilot for your job search. Find roles that fit, apply in seconds, land interviews faster.
              </p>
              <div style={{ border: '1px solid #2C2A22', borderRadius: 12, padding: 16, maxWidth: 300 }}>
                <div style={{ fontSize: 13.5, color: '#FBF8F1', fontWeight: 600, marginBottom: 10 }}>
                  Get the weekly job-search edge
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    placeholder="you@email.com"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: '#0E0D09',
                      border: '1px solid #2C2A22',
                      borderRadius: 8,
                      padding: '9px 11px',
                      color: '#F2EDE2',
                      fontFamily: 'inherit',
                      fontSize: 13,
                    }}
                  />
                  <button
                    style={{
                      background: '#1FA463',
                      color: '#0C2C1C',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0 14px',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>

            {COLS.map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#6F695C',
                    marginBottom: 18,
                  }}
                >
                  {col.title}
                </div>
                {col.links.map((l) =>
                  l.href === '#' ? (
                    <a key={l.label} href="#" style={linkStyle}>
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={appRoute(l.href)} style={linkStyle}>
                      {l.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              paddingTop: 26,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 13.5, color: '#7A7367' }}>© 2026 Jobocate, Inc.</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#9A9286' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1FA463' }} /> All systems
                operational
              </span>
            </div>
            <div style={{ display: 'flex', gap: 9 }}>
              {SOCIAL.map((s) => (
                <span key={s} style={socialStyle}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
