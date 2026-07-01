'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getScrapedJobById, calculateJobMatch, markJobAsInterested } from '@/services/jobApi';

/* ---------------------------------------------------------------- sample --- */
/* Mirrors the design's DCLogic renderVals() — used as graceful fallback when
   unauthenticated or when the backend request fails. The page always renders. */
const SAMPLE = {
  id: null,
  initials: 'St',
  title: 'Senior Product Designer',
  company: 'Stripe',
  location: 'Remote (US)',
  type: 'Full-time',
  salary: '$170–210k',
  matchScore: 96,
  posted: '4 days ago',
  applicants: '47 so far',
  hiringTeam: 'Actively reviewing',
  why:
    'Your design-systems leadership and fintech background at Plaid line up almost perfectly with what Stripe is hiring for. Two small gaps are easy to address in your application.',
  matched: ['Design systems', '0→1 product', 'Fintech domain', 'Prototyping', 'Cross-functional leadership'],
  gaps: ['Payments depth', 'Direct people management'],
  intro:
    'Stripe is hiring a Senior Product Designer to raise the craft bar on Checkout — the surface millions of businesses use to get paid. You’ll own end-to-end design for high-impact flows, partner closely with engineering and research, and help evolve the design system that keeps Stripe’s products coherent at scale.',
  sections: [
    {
      title: 'What you’ll do',
      items: [
        'Own end-to-end design for core Checkout flows, from problem framing to shipped, measured outcomes.',
        'Partner daily with engineering and research to turn ambiguous problems into crisp, tested solutions.',
        'Push the craft bar — interaction detail, motion, and accessibility — on surfaces seen by millions.',
        'Contribute components and patterns back to Stripe’s shared design system.',
      ],
    },
    {
      title: 'What we’re looking for',
      items: [
        '6+ years designing complex, data-rich product experiences, ideally in fintech or B2B SaaS.',
        'A portfolio that shows measurable impact, not just polished screens.',
        'Fluency with design systems and a track record of scaling them across teams.',
        'Strong written communication and comfort operating with high autonomy.',
      ],
    },
    {
      title: 'Benefits',
      items: [
        'Competitive salary, meaningful equity, and an annual performance bonus.',
        'Fully remote within the US, with quarterly team gatherings.',
        'Comprehensive health, dental, and vision coverage.',
        '16 weeks of parental leave and a $3,000 annual learning budget.',
      ],
    },
  ],
  totalComp: '$399–459k',
  compNote: 'Base + equity + target bonus, plus a one-time sign-on.',
  comp: [
    { label: 'Base salary', value: '$170–210k' },
    { label: 'Equity / yr', value: '~$180k' },
    { label: 'Target bonus', value: '15%' },
    { label: 'Sign-on', value: '$25k' },
  ],
};

/* ------------------------------------------------------------- normalize --- */
function initialsFor(name) {
  if (!name) return SAMPLE.initials;
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name.slice(0, 2);
}

// Fold a real scraped-job / match payload into the design's view-model shape.
function normalize(job, match) {
  if (!job && !match) return SAMPLE;
  const j = job || {};
  const m = match || {};

  const company = j.company || j.companyName || SAMPLE.company;
  const locParts = [];
  if (j.location) locParts.push(j.location);
  if (j.employmentType || j.type) locParts.push(j.employmentType || j.type);

  const score =
    m.score != null ? Math.round(m.score) :
    m.matchScore != null ? Math.round(m.matchScore) :
    SAMPLE.matchScore;

  const matched =
    (Array.isArray(m.matchedSkills) && m.matchedSkills.length && m.matchedSkills) ||
    (Array.isArray(m.matched) && m.matched.length && m.matched) ||
    SAMPLE.matched;
  const gaps =
    (Array.isArray(m.missingSkills) && m.missingSkills.length && m.missingSkills) ||
    (Array.isArray(m.gaps) && m.gaps.length && m.gaps) ||
    SAMPLE.gaps;

  // Build description sections from whatever the scraper gives us.
  let sections = SAMPLE.sections;
  let intro = j.description || j.summary || SAMPLE.intro;
  if (Array.isArray(j.responsibilities) || Array.isArray(j.requirements) || Array.isArray(j.benefits)) {
    sections = [];
    if (Array.isArray(j.responsibilities) && j.responsibilities.length)
      sections.push({ title: 'What you’ll do', items: j.responsibilities });
    if (Array.isArray(j.requirements) && j.requirements.length)
      sections.push({ title: 'What we’re looking for', items: j.requirements });
    if (Array.isArray(j.benefits) && j.benefits.length)
      sections.push({ title: 'Benefits', items: j.benefits });
    if (!sections.length) sections = SAMPLE.sections;
  }

  return {
    id: j._id || j.id || null,
    initials: initialsFor(company),
    title: j.title || SAMPLE.title,
    company,
    location: locParts[0] || SAMPLE.location,
    type: locParts[1] || SAMPLE.type,
    salary: j.salary || j.salaryRange || SAMPLE.salary,
    matchScore: score,
    posted: j.postedAt || j.posted || SAMPLE.posted,
    applicants: j.applicants || SAMPLE.applicants,
    hiringTeam: j.hiringTeam || SAMPLE.hiringTeam,
    why: m.explanation || m.reason || SAMPLE.why,
    matched,
    gaps,
    intro,
    sections,
    totalComp: j.totalComp || SAMPLE.totalComp,
    compNote: SAMPLE.compNote,
    comp: (Array.isArray(j.comp) && j.comp.length && j.comp) || SAMPLE.comp,
  };
}

/* ----------------------------------------------------------- bookmark svg --- */
function Bookmark({ saved }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={saved ? '#1FA463' : 'none'}
      stroke={saved ? '#1FA463' : '#8A8378'}
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M6 3 h12 a1 1 0 0 1 1 1 v17 l-7 -4 -7 4 V4 a1 1 0 0 1 1 -1 Z" />
    </svg>
  );
}

/* ----------------------------------------------------------- component --- */
export default function AppJob() {
  const router = useRouter();
  const [data, setData] = useState(SAMPLE);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch real data when a job id is present; otherwise show the sample design.
  useEffect(() => {
    if (!router.isReady) return;
    const jobId = router.query.id || router.query.jobId;
    if (!jobId) {
      setData(SAMPLE);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [jobRes, matchRes] = await Promise.allSettled([
          getScrapedJobById(jobId),
          calculateJobMatch(jobId),
        ]);
        if (!alive) return;
        const job = jobRes.status === 'fulfilled' ? jobRes.value?.job || jobRes.value : null;
        const match = matchRes.status === 'fulfilled' ? matchRes.value?.match || matchRes.value : null;
        // Graceful fallback: if both failed, keep the faithful sample design.
        setData(job || match ? normalize(job, match) : SAMPLE);
      } catch (e) {
        if (alive) setData(SAMPLE);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router.isReady, router.query.id, router.query.jobId]);

  const toggleSave = () => {
    setSaved((prev) => {
      const next = !prev;
      if (data.id) {
        markJobAsInterested(data.id, next).catch(() => {});
      }
      return next;
    });
  };

  const d = data;
  const matchDeg = `${(d.matchScore / 100) * 360}deg`;

  const saveColor = saved ? '#157A49' : '#46413A';
  const saveBg = saved ? '#EAF6EE' : '#FFFEFB';
  const saveBorder = saved ? '#CDE9D6' : '#D9D0BE';
  const saveLabel = saved ? 'Saved' : 'Save';
  const saveTitle = saved ? 'Remove from saved' : 'Save this role';

  const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 28 };

  return (
    <>
      <Head>
        <title>{`${d.title} · ${d.company} — Jobocate`}</title>
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
        #jbapp .jb-apply-pill:hover {
          background: #1b9159 !important;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
              gap: 14,
              padding: '13px 32px',
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
            <button
              onClick={toggleSave}
              title={saveTitle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: 600,
                color: saveColor,
                background: saveBg,
                border: `1px solid ${saveBorder}`,
                borderRadius: 999,
                padding: '9px 15px',
                cursor: 'pointer',
              }}
            >
              <Bookmark saved={saved} />
              {saveLabel}
            </button>
            <Link
              href={appRoute('App Apply.dc.html')}
              className="jb-apply-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#1FA463',
                color: '#0C2C1C',
                fontSize: 13.5,
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              Apply →
            </Link>
          </header>

          <div
            style={{
              display: 'flex',
              gap: 32,
              padding: '30px 32px 64px',
              maxWidth: 1120,
              width: '100%',
              margin: '0 auto',
              alignItems: 'flex-start',
            }}
          >
            {/* ===== MAIN ===== */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* HEADER */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                <Link
                  href={appRoute('App Company.dc.html')}
                  style={{
                    width: 60,
                    height: 60,
                    flexShrink: 0,
                    borderRadius: 15,
                    background: '#EAF6EE',
                    color: '#157A49',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 20,
                    textDecoration: 'none',
                  }}
                >
                  {d.initials}
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.04, margin: '0 0 6px' }}>{d.title}</h1>
                  <div style={{ fontSize: 14.5, color: '#5A544A' }}>
                    <Link href={appRoute('App Company.dc.html')} style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}>
                      {d.company}
                    </Link>{' '}
                    · {d.location} · {d.type} ·{' '}
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>{d.salary}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 600, color: '#157A49', lineHeight: 1 }}>{d.matchScore}%</div>
                  <div style={{ fontSize: 11, color: '#8A8378', fontFamily: "'JetBrains Mono',monospace" }}>match</div>
                </div>
              </div>

              {/* WHY MATCH */}
              <div style={{ background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 16, padding: 22 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#157A49', marginBottom: 10 }}>
                  Why you’re a {d.matchScore}% match
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#1F4733', margin: '0 0 16px' }}>{d.why}</p>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1F4733', marginBottom: 8 }}>Matched strengths</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {d.matched.map((m, i) => (
                      <span
                        key={`${m}-${i}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#0C2C1C',
                          background: '#C7EFD5',
                          border: '1px solid #A6E0BC',
                          borderRadius: 999,
                          padding: '6px 13px',
                        }}
                      >
                        <span style={{ color: '#157A49' }}>✓</span>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#7A4326', marginBottom: 8 }}>Worth addressing</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {d.gaps.map((g, i) => (
                      <span
                        key={`${g}-${i}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#7A4326',
                          background: '#F7E4D8',
                          border: '1px solid #EAD0C4',
                          borderRadius: 999,
                          padding: '6px 13px',
                        }}
                      >
                        <span style={{ color: '#C9622E' }}>!</span>
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div style={card}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>About the role</h2>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#46413A', margin: '0 0 4px' }}>{d.intro}</p>

                {expanded && (
                  <div style={{ animation: 'rbpop 0.25s ease' }}>
                    {d.sections.map((sec, si) => (
                      <div key={`${sec.title}-${si}`} style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>{sec.title}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {sec.items.map((it, ii) => (
                            <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                              <span style={{ width: 6, height: 6, flexShrink: 0, borderRadius: '50%', background: '#1FA463', marginTop: 8 }} />
                              <span style={{ fontSize: 14.5, lineHeight: 1.6, color: '#46413A' }}>{it}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setExpanded((e) => !e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: '#157A49',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    marginTop: 18,
                  }}
                >
                  {expanded ? 'Show less' : 'Read full description'} <span>{expanded ? '↑' : '↓'}</span>
                </button>
              </div>

              {/* COMPENSATION */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, marginBottom: 18 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Compensation</h2>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378' }}>est. total / yr</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 34, fontWeight: 600, lineHeight: 1, color: '#1B1A16', marginBottom: 4 }}>{d.totalComp}</div>
                <div style={{ fontSize: 13, color: '#8A8378', marginBottom: 20 }}>{d.compNote}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {d.comp.map((c, i) => (
                    <div key={`${c.label}-${i}`} style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 6 }}>{c.label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600, color: '#1B1A16' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== RIGHT RAIL ===== */}
            <div style={{ width: 312, flexShrink: 0, position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: `conic-gradient(#1FA463 ${matchDeg}, #EFE8DA 0)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: '#FFFEFB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 17,
                        fontWeight: 600,
                        color: '#157A49',
                      }}
                    >
                      {d.matchScore}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>Excellent match</div>
                    <div style={{ fontSize: 12.5, color: '#8A8378' }}>Top 8% of your matches</div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 11,
                    padding: '16px 0',
                    borderTop: '1px solid #F2ECE0',
                    borderBottom: '1px solid #F2ECE0',
                    marginBottom: 18,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#8A8378' }}>Posted</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{d.posted}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#8A8378' }}>Applicants</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{d.applicants}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#8A8378' }}>Hiring team</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1A16' }}>{d.hiringTeam}</span>
                  </div>
                </div>

                <Link
                  href={appRoute('App Apply.dc.html')}
                  className="jb-apply-pill"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    background: '#1FA463',
                    color: '#0C2C1C',
                    fontSize: 15.5,
                    fontWeight: 700,
                    padding: 14,
                    borderRadius: 999,
                    textDecoration: 'none',
                    marginBottom: 10,
                  }}
                >
                  Apply now →
                </Link>
                <button
                  onClick={toggleSave}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 600,
                    color: saveColor,
                    background: saveBg,
                    border: `1px solid ${saveBorder}`,
                    borderRadius: 999,
                    padding: 12,
                    cursor: 'pointer',
                  }}
                >
                  <Bookmark saved={saved} />
                  {saveLabel}
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '14px 16px',
                  background: '#EFF8F1',
                  border: '1px solid #CDE9D6',
                  borderRadius: 13,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: '#5BD08C',
                    color: '#0C2C1C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: '#1F4733' }}>
                  Verified careers page — your application goes straight to {d.company}.
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
