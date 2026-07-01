'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getCompanyMatches } from '@/services/companyApi';

/* ----------------------------------------------------- sample (design) --- */
const SAMPLE_ROLES = [
  { role: 'Senior Product Designer', location: 'Remote (US)', type: 'Full-time', salary: '$170–210k', match: '96%' },
  { role: 'Staff Product Designer, Checkout', location: 'Remote (US)', type: 'Full-time', salary: '$190–230k', match: '92%' },
  { role: 'Product Designer, Growth', location: 'San Francisco · Hybrid', type: 'Full-time', salary: '$165–200k', match: '90%' },
  { role: 'Design Systems Engineer', location: 'Remote (US)', type: 'Full-time', salary: '$180–220k', match: '88%' },
];

const BENEFITS = [
  { dot: '◆', label: 'Remote-friendly' },
  { dot: '◆', label: 'Top-decile equity' },
  { dot: '◆', label: 'Unlimited PTO' },
  { dot: '◆', label: '$3k annual learning budget' },
  { dot: '◆', label: 'Full health, dental & vision' },
  { dot: '◆', label: '16-week parental leave' },
  { dot: '◆', label: 'Design-led product culture' },
  { dot: '◆', label: 'Annual team offsite' },
];

const COMPANY_NAME = 'Stripe';

/* ----------------------------------------------------------- helpers --- */
const fmtSalary = (job) => {
  if (job?.salaryRange) return job.salaryRange;
  const min = job?.salaryMin ?? job?.salary?.min;
  const max = job?.salaryMax ?? job?.salary?.max;
  if (min && max) return `$${Math.round(min / 1000)}–${Math.round(max / 1000)}k`;
  return '$170–210k';
};

const fmtMatch = (m) => {
  const s = m?.matchScore ?? m?.score ?? m?.overallScore;
  if (typeof s === 'number') return `${Math.round(s > 1 ? s : s * 100)}%`;
  return '—';
};

// Map a backend match record to the design's role-card shape.
// Only keeps roles at the profiled company so the page stays on-topic.
const mapMatchesToRoles = (matches) => {
  if (!Array.isArray(matches)) return [];
  return matches
    .map((m) => {
      const job = m.job || m.jobPosting || m;
      const company =
        job.company || job.companyName || job.employer || m.company || '';
      return {
        company,
        role: job.title || job.role || job.jobTitle || 'Open role',
        location: job.location || (job.remote ? 'Remote (US)' : 'On-site'),
        type: job.employmentType || job.type || 'Full-time',
        salary: fmtSalary(job),
        match: fmtMatch(m),
      };
    })
    .filter(
      (r) =>
        typeof r.company === 'string' &&
        r.company.toLowerCase().includes(COMPANY_NAME.toLowerCase())
    )
    .map(({ company, ...rest }) => rest);
};

/* --------------------------------------------------------- component --- */
export default function AppCompany() {
  const [following, setFollowing] = useState(false);
  const [roles, setRoles] = useState(SAMPLE_ROLES);

  // Best-effort: enrich open roles from the user's matches. On any failure or
  // when unauthenticated, keep the design's own sample data so the page always
  // renders faithfully.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCompanyMatches({ minScore: 80 });
        const list = data?.matches || data?.recommendations || data || [];
        const mapped = mapMatchesToRoles(list);
        if (!cancelled && mapped.length > 0) setRoles(mapped);
      } catch (e) {
        /* fall back to sample data — never crash */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const roleCount = roles.length;

  const followLabel = following ? 'Following ✓' : '+ Follow';
  const followColor = following ? '#157A49' : '#0C2C1C';
  const followBg = following ? '#EAF6EE' : '#1FA463';
  const followBorder = following ? '#CDE9D6' : '#1FA463';

  return (
    <>
      <Head>
        <title>Stripe · Company profile — Jobocate</title>
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
        #jbapp .jb-role:hover {
          border-color: #1fa463 !important;
        }
        #jbapp .jb-apply:hover {
          background: #2a2820 !important;
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="matches" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <Link
              href={appRoute('App Matches.dc.html')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}
            >
              ← Back to matches
            </Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>Company profile</span>
          </header>

          <div style={{ padding: '32px 32px 64px', maxWidth: 840, width: '100%', margin: '0 auto' }}>
            {/* COMPANY HEADER */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 26 }}>
              <span
                style={{
                  width: 78,
                  height: 78,
                  flexShrink: 0,
                  borderRadius: 20,
                  background: '#EAF6EE',
                  color: '#157A49',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Bricolage Grotesque',sans-serif",
                  fontWeight: 800,
                  fontSize: 34,
                }}
              >
                St
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 9px' }}>Stripe</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', fontSize: 14, color: '#5A544A' }}>
                  <span>Financial infrastructure</span>
                  <span style={{ color: '#C9BFAC' }}>·</span>
                  <span>8,000+ employees</span>
                  <span style={{ color: '#C9BFAC' }}>·</span>
                  <span>San Francisco, CA</span>
                  <span style={{ color: '#C9BFAC' }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>
                    <span style={{ color: '#1FA463' }}>★</span>4.4
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <Link href={appRoute('App Matches.dc.html')} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#157A49', textDecoration: 'none' }}>
                    stripe.com ↗
                  </Link>
                </div>
              </div>
              <button
                onClick={() => setFollowing((f) => !f)}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 700,
                  color: followColor,
                  background: followBg,
                  border: `1.5px solid ${followBorder}`,
                  borderRadius: 999,
                  padding: '11px 20px',
                  cursor: 'pointer',
                }}
              >
                {followLabel}
              </button>
            </div>

            {/* WHY IT FITS */}
            <div style={{ background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 16, padding: '20px 22px', marginBottom: 26 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#157A49', marginBottom: 8 }}>
                Why it fits you
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#1F4733', margin: 0 }}>
                Stripe is doubling down on design-led product craft across Checkout and Billing — exactly the surface where your <b>Plaid onboarding redesign (+31% activation)</b> and the <b>design system you scaled to 40+ engineers</b> translate directly. Their fintech depth matches the domain you already know cold.
              </p>
            </div>

            {/* ABOUT */}
            <div style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>About</h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: '#46413A', margin: 0 }}>
                Stripe builds economic infrastructure for the internet. Millions of businesses — from ambitious startups to the world&apos;s largest enterprises — use its software to accept payments, send payouts, and run financially complex operations. The product organization is known for unusually high craft standards, strong design–engineering partnership, and shipping measurable improvements to conversion and developer experience.
              </p>
            </div>

            {/* OPEN ROLES */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Open roles</h2>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#8A8378' }}>{roleCount} matched to you</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {roles.map((r, i) => (
                  <div
                    key={`${r.role}-${i}`}
                    className="jb-role"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      background: '#FFFEFB',
                      border: '1px solid #E6DECF',
                      borderRadius: 15,
                      padding: '17px 20px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{r.role}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5A544A', flexWrap: 'wrap' }}>
                        <span>{r.location}</span>
                        <span style={{ color: '#C9BFAC' }}>·</span>
                        <span>{r.type}</span>
                        <span style={{ color: '#C9BFAC' }}>·</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>{r.salary}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 19, fontWeight: 600, color: '#157A49', lineHeight: 1 }}>{r.match}</div>
                      <div style={{ fontSize: 10, color: '#8A8378', fontFamily: "'JetBrains Mono',monospace" }}>match</div>
                    </div>
                    <Link
                      href={appRoute('App Apply.dc.html')}
                      className="jb-apply"
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        background: '#1B1A16',
                        color: '#F7F3EA',
                        fontSize: 13.5,
                        fontWeight: 600,
                        padding: '11px 18px',
                        borderRadius: 11,
                        textDecoration: 'none',
                      }}
                    >
                      Apply →
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* CULTURE / BENEFITS */}
            <div style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>Culture &amp; benefits</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                {BENEFITS.map((b) => (
                  <span
                    key={b.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: '#46413A',
                      background: '#FFFEFB',
                      border: '1px solid #E6DECF',
                      borderRadius: 999,
                      padding: '9px 15px',
                    }}
                  >
                    <span style={{ color: '#1FA463' }}>{b.dot}</span>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>

            {/* TRUST NOTE */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '15px 18px', background: '#EFF8F1', border: '1px solid #CDE9D6', borderRadius: 13 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: '#5BD08C',
                  color: '#0C2C1C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                ✓
              </span>
              <span style={{ fontSize: 13.5, lineHeight: 1.5, color: '#1F4733' }}>
                <b>Verified careers page.</b> Applications you send through Jobocate go directly to Stripe — never a third-party board or reseller.
              </span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
