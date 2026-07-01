'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';
import { getScrapedJobById } from '@/services/api';

// ---- Design sample data (faithful fallback) ----
const SAMPLE_JOB = {
  title: 'Senior Product Designer',
  company: 'Stripe',
  logo: 'St',
  logoBg: '#EDF0FE',
  logoColor: '#4263EB',
  location: 'Remote (US)',
  type: 'Full-time',
  salary: '$170–210k',
  match: '96%',
  headTags: ['Design systems', 'Fintech', 'Senior', 'Remote (US)'],
  sections: [
    {
      title: 'About the role',
      isProse: true,
      body: 'As a Senior Product Designer at Stripe, you’ll shape the products millions of businesses rely on to move money online. You’ll own end-to-end design for a core surface — from framing the problem and running research to shipping polished, measurable work — and help raise the bar for craft across the team.',
    },
    {
      title: 'What you’ll do',
      isList: true,
      bullet: '→',
      items: [
        'Own design for a core payments surface, end to end.',
        'Partner with PM and engineering to ship measurable improvements.',
        'Contribute to and extend our design system.',
        'Run lightweight research to validate direction.',
      ],
    },
    {
      title: 'What we’re looking for',
      isList: true,
      bullet: '✓',
      items: [
        '6+ years designing complex B2B or fintech products.',
        'A portfolio that shows craft and measurable impact.',
        'Experience building or scaling a design system.',
        'Strong written communication and systems thinking.',
      ],
    },
    {
      title: 'Benefits',
      isList: true,
      bullet: '+',
      items: [
        'Competitive salary and meaningful equity.',
        'Comprehensive health, dental and vision.',
        'Remote-friendly with a generous home-office budget.',
        '16 weeks paid parental leave.',
      ],
    },
  ],
  glance: [
    { label: 'Seniority', value: 'Senior' },
    { label: 'Type', value: 'Full-time' },
    { label: 'Location', value: 'Remote (US)' },
    { label: 'Posted', value: '2 days ago' },
  ],
  similar: [
    { title: 'Product Designer', company: 'Notion', location: 'Remote (US)', salary: '$150–185k', logo: 'No', logoBg: '#F4EFE4', logoColor: '#1B1A16' },
    { title: 'Design Engineer', company: 'Linear', location: 'Remote (Global)', salary: '$180–230k', logo: 'Li', logoBg: '#F4EFE4', logoColor: '#1B1A16' },
    { title: 'Senior Designer, Systems', company: 'Figma', location: 'San Francisco', salary: '$190–240k', logo: 'Fi', logoBg: '#F4EFE4', logoColor: '#1B1A16' },
  ],
};

const COMPANY_SNIPPET = {
  meta: 'Financial infrastructure · 8,000+ employees · San Francisco',
  blurb:
    'Stripe builds economic infrastructure for the internet. Businesses of every size use Stripe to accept payments, grow revenue, and accelerate new business models.',
};

// Derive a 2-letter monogram from a company name.
const monogram = (name) =>
  ((name || 'Jb')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, 2)
    .replace(/^./, (c) => c.toUpperCase())) || 'Jb';

// Map a scraped-job API payload onto the design's shape, leaning on the
// sample for any fields the public API doesn't return. Never throws.
function normalizeJob(raw) {
  if (!raw || typeof raw !== 'object') return SAMPLE_JOB;
  const job = raw.job || raw.data || raw;
  const company = job.company || job.companyName || SAMPLE_JOB.company;
  const title = job.title || job.jobTitle || SAMPLE_JOB.title;
  const location = job.location || job.jobLocation || SAMPLE_JOB.location;
  const type = job.employmentType || job.type || SAMPLE_JOB.type;
  const salary = job.salary || job.salaryRange || job.compensation || SAMPLE_JOB.salary;

  const tags = Array.isArray(job.skills) && job.skills.length
    ? job.skills.slice(0, 4)
    : Array.isArray(job.tags) && job.tags.length
    ? job.tags.slice(0, 4)
    : SAMPLE_JOB.headTags;

  const sections = [];
  if (job.description || job.summary) {
    sections.push({ title: 'About the role', isProse: true, body: job.description || job.summary });
  }
  if (Array.isArray(job.responsibilities) && job.responsibilities.length) {
    sections.push({ title: 'What you’ll do', isList: true, bullet: '→', items: job.responsibilities });
  }
  if (Array.isArray(job.requirements) && job.requirements.length) {
    sections.push({ title: 'What we’re looking for', isList: true, bullet: '✓', items: job.requirements });
  }
  if (Array.isArray(job.benefits) && job.benefits.length) {
    sections.push({ title: 'Benefits', isList: true, bullet: '+', items: job.benefits });
  }

  const hasCompany = !!(job.company || job.companyName);

  return {
    ...SAMPLE_JOB,
    title,
    company,
    logo: hasCompany ? monogram(company) : SAMPLE_JOB.logo,
    logoBg: hasCompany ? '#F4EFE4' : SAMPLE_JOB.logoBg,
    logoColor: hasCompany ? '#1B1A16' : SAMPLE_JOB.logoColor,
    location,
    type,
    salary,
    headTags: tags,
    sections: sections.length ? sections : SAMPLE_JOB.sections,
    glance: [
      { label: 'Seniority', value: job.seniority || job.experienceLevel || 'Senior' },
      { label: 'Type', value: type },
      { label: 'Location', value: location },
      { label: 'Posted', value: job.postedAt || '2 days ago' },
    ],
  };
}

export default function PublicJob() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState(SAMPLE_JOB);

  useEffect(() => {
    if (!id || id === 'role') return; // 'role' is the static design placeholder route
    let active = true;
    (async () => {
      try {
        const raw = await getScrapedJobById(id);
        if (active && raw) setJob(normalizeJob(raw));
      } catch {
        // Public page: gracefully keep the design's sample content.
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const signup = appRoute('App Sign Up.dc.html');

  return (
    <>
      <Head>
        <title>{job.title} · {job.company} — Jobocate</title>
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
          background: #1fa463;
          color: #f7f3ea;
        }
        #emkt .emkt-similar:hover {
          border-color: #1fa463 !important;
        }
        #emkt .emkt-apply:hover {
          background: #1b9159 !important;
        }
      `}</style>

      <div id="emkt" style={{ fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16', background: '#F7F3EA' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>
            <Link href={appRoute('Browse Jobs.dc.html')} style={{ color: '#9A9286', textDecoration: 'none' }}>Jobs</Link>
            {' / '}
            <span style={{ color: '#9A9286' }}>{job.company}</span>
            {' / '}
            <span style={{ color: '#5A544A' }}>{job.title}</span>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1140,
            margin: '0 auto',
            padding: '22px 32px 64px',
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* MAIN */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
              <span
                style={{
                  width: 62,
                  height: 62,
                  flexShrink: 0,
                  borderRadius: 16,
                  background: job.logoBg,
                  color: job.logoColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 22,
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                {job.logo}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1.05, margin: '0 0 6px' }}>
                  {job.title}
                </h1>
                <div style={{ fontSize: 15, color: '#5A544A' }}>
                  <span style={{ color: '#157A49', fontWeight: 600 }}>{job.company}</span> · {job.location} · {job.type}
                </div>
                <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
                  {job.headTags.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        color: '#5A544A',
                        background: '#F2ECE0',
                        border: '1px solid #E6DECF',
                        padding: '4px 10px',
                        borderRadius: 999,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {job.sections.map((s, i) => (
              <div key={`${s.title}-${i}`} style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 23, lineHeight: 1.1, margin: '0 0 12px' }}>
                  {s.title}
                </h2>
                {s.isProse && (
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: '#3A352C', margin: 0 }}>{s.body}</p>
                )}
                {s.isList && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {s.items.map((it, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 14.5, lineHeight: 1.55, color: '#3A352C' }}>
                        <span style={{ color: '#1FA463', flexShrink: 0, marginTop: 2 }}>{s.bullet}</span>
                        {it}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* COMPANY SNIPPET */}
            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <span
                  style={{
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: 12,
                    background: job.logoBg,
                    color: job.logoColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 16,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  {job.logo}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{job.company}</div>
                  <div style={{ fontSize: 13, color: '#8A8378' }}>{COMPANY_SNIPPET.meta}</div>
                </div>
                <Link href={appRoute('Browse Jobs.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none', flexShrink: 0 }}>
                  View company →
                </Link>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#5A544A', margin: 0 }}>{COMPANY_SNIPPET.blurb}</p>
            </div>

            {/* SIMILAR ROLES */}
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 23, lineHeight: 1.1, margin: '0 0 14px' }}>
                Similar roles
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {job.similar.map((r, i) => (
                  <Link
                    key={`${r.title}-${i}`}
                    href={appRoute('Public Job.dc.html')}
                    className="emkt-similar"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      background: '#FFFEFB',
                      border: '1px solid #E6DECF',
                      borderRadius: 14,
                      padding: '16px 18px',
                      textDecoration: 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 11,
                        background: r.logoBg,
                        color: r.logoColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                    >
                      {r.logo}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{r.title}</div>
                      <div style={{ fontSize: 12.5, color: '#8A8378' }}>{r.company} · {r.location}</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: '#5A544A', flexShrink: 0 }}>{r.salary}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* STICKY CTA RAIL */}
          <div style={{ position: 'sticky', top: 92, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', border: '1px solid #2C2A22', borderRadius: 18, padding: 24 }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 8%, rgba(31,164,99,0.3), transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: '#FBF8F1' }}>{job.salary}</span>
                  <span style={{ fontSize: 12, color: '#9A9286' }}>/ year</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 13, color: '#B8B1A4' }}>
                  <span style={{ filter: 'blur(3px)', fontFamily: "'JetBrains Mono',monospace", color: '#5BD08C' }}>{job.match}</span> match · sign in to reveal
                </div>
                <Link
                  href={signup}
                  className="emkt-apply"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#1FA463',
                    color: '#0C2C1C',
                    fontSize: 15,
                    fontWeight: 700,
                    padding: 13,
                    borderRadius: 999,
                    textDecoration: 'none',
                    marginBottom: 9,
                  }}
                >
                  See your match &amp; apply →
                </Link>
                <div style={{ textAlign: 'center', fontSize: 12, color: '#8A8378' }}>Free · 1-click apply with your copilot</div>
              </div>
            </div>

            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 18 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 13 }}>
                Role at a glance
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {job.glance.map((g, i) => (
                  <div key={`${g.label}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#8A8378' }}>{g.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16', textAlign: 'right' }}>{g.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 12, padding: '13px 15px' }}>
              <span style={{ color: '#157A49', flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: '#1F4733' }}>
                Verified careers page — you apply direct, never a third-party board.
              </span>
            </div>
          </div>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
