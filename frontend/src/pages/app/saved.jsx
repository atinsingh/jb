'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getInterestedJobs, markJobAsInterested } from '@/services/savedApi';

/* ---------------------------------------------------------------- sample --- */
/* The design's own sample data — also our graceful fallback when the user is
   unauthenticated or the request fails. Mirrors the DCLogic jobData(). */
const SAMPLE_JOBS = [
  { id: 'stripe-spd', logo: 'St', company: 'Stripe', role: 'Senior Product Designer', location: 'Remote (US)', type: 'Full-time', salary: '$170–210k', match: '96%', matchNum: 96, salaryMin: 170, savedTs: 6, savedDate: 'Jun 27', bg: '#EAF6EE', fg: '#157A49', tags: ['Design systems', '0→1', 'Fintech'], dream: true, review: true, note: 'Pinged Priya on the design team — she said to apply this week.' },
  { id: 'figma-ds', logo: 'Fi', company: 'Figma', role: 'Product Designer, Design Systems', location: 'San Francisco · Hybrid', type: 'Full-time', salary: '$185–220k', match: '93%', matchNum: 93, salaryMin: 185, savedTs: 5, savedDate: 'Jun 26', bg: '#F4EFE4', fg: '#1B1A16', tags: ['Tokens', 'Components', 'Craft'], dream: true, review: false, note: 'Dream team. Tailor the portfolio toward systems work before applying.' },
  { id: 'linear-de', logo: 'Li', company: 'Linear', role: 'Design Engineer', location: 'Remote', type: 'Full-time', salary: '$180–215k', match: '91%', matchNum: 91, salaryMin: 180, savedTs: 4, savedDate: 'Jun 24', bg: '#F4EFE4', fg: '#1B1A16', tags: ['React', 'Prototyping', 'Design-eng'], dream: false, review: true, note: 'Need to confirm they’re open to a design-leaning hybrid role.' },
  { id: 'notion-dsl', logo: 'No', company: 'Notion', role: 'Design Systems Lead', location: 'New York · Hybrid', type: 'Full-time', salary: '$190–230k', match: '89%', matchNum: 89, salaryMin: 190, savedTs: 3, savedDate: 'Jun 22', bg: '#F4EFE4', fg: '#1B1A16', tags: ['Leadership', 'Accessibility', 'Tokens'], dream: true, review: false, note: 'Leadership scope I want — but it’s hybrid NY. Worth a conversation.' },
  { id: 'stripe-staff', logo: 'St', company: 'Stripe', role: 'Staff Product Designer, Checkout', location: 'Remote (US)', type: 'Full-time', salary: '$190–230k', match: '92%', matchNum: 92, salaryMin: 190, savedTs: 2, savedDate: 'Jun 20', bg: '#EAF6EE', fg: '#157A49', tags: ['Checkout', 'Payments', '0→1'], dream: false, review: true, note: 'Same recruiter as the SPD role — ask which is the better fit.' },
  { id: 'figma-pm', logo: 'Fi', company: 'Figma', role: 'Senior PM, Growth', location: 'San Francisco · Hybrid', type: 'Full-time', salary: '$185–220k', match: '88%', matchNum: 88, salaryMin: 185, savedTs: 1, savedDate: 'Jun 18', bg: '#F4EFE4', fg: '#1B1A16', tags: ['Growth', 'PLG', 'Experimentation'], dream: false, review: false, note: 'Stretch into PM — keep as a backup while design roles are open.' },
];

const LOGO_PALETTE = [
  { bg: '#EAF6EE', fg: '#157A49' },
  { bg: '#F4EFE4', fg: '#1B1A16' },
];

/* ------------------------------------------------------------- normalize --- */
// Turn whatever the API returns into the shape the card renderer expects,
// while preserving the rich sample fields when the API has no equivalent.
function normalizeApiJobs(payload) {
  let list = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.interested)) list = payload.interested;
  else if (Array.isArray(payload?.matches)) list = payload.matches;
  else if (Array.isArray(payload?.jobs)) list = payload.jobs;
  else if (Array.isArray(payload?.data)) list = payload.data;

  if (!list.length) return [];

  return list.map((raw, i) => {
    const job = raw.job || raw.jobId || raw; // matches often nest the job doc
    const id = String(raw._id || raw.id || job._id || job.id || `job-${i}`);
    const company = job.company || job.companyName || raw.company || 'Company';
    const role = job.title || job.role || raw.title || 'Role';
    const matchNum = Math.round(
      raw.matchScore ?? raw.score ?? job.matchScore ?? job.match ?? 0,
    );
    const salaryMin =
      job.salaryMin ?? raw.salaryMin ?? (job.salary && job.salary.min) ?? 0;
    const salaryMax =
      job.salaryMax ?? raw.salaryMax ?? (job.salary && job.salary.max) ?? 0;
    const salary =
      job.salaryDisplay ||
      raw.salaryDisplay ||
      (salaryMin && salaryMax
        ? `$${Math.round(salaryMin / 1000)}–${Math.round(salaryMax / 1000)}k`
        : salaryMin
          ? `$${Math.round(salaryMin / 1000)}k+`
          : '—');
    const tags = Array.isArray(job.skills)
      ? job.skills.slice(0, 3)
      : Array.isArray(job.tags)
        ? job.tags.slice(0, 3)
        : [];
    const palette = LOGO_PALETTE[i % LOGO_PALETTE.length];
    const savedAt = raw.updatedAt || raw.savedAt || raw.createdAt || job.updatedAt;
    const savedTs = savedAt ? new Date(savedAt).getTime() : list.length - i;
    const savedDate = savedAt
      ? new Date(savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';

    return {
      id,
      logo: company.slice(0, 2),
      company,
      role,
      location: job.location || job.locationType || raw.location || 'Remote',
      type: job.employmentType || job.type || 'Full-time',
      salary,
      match: matchNum ? `${matchNum}%` : '—',
      matchNum,
      salaryMin,
      savedTs,
      savedDate,
      bg: palette.bg,
      fg: palette.fg,
      tags,
      dream: Boolean(raw.isDream || job.isDream || matchNum >= 92),
      review: Boolean(raw.needsReview || raw.review),
      note: raw.note || job.note || '',
    };
  });
}

/* ----------------------------------------------------------------- icons --- */
const BookmarkFill = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="#1FA463">
    <path d="M6 3 h12 a1 1 0 0 1 1 1 v17 l-7 -4 -7 4 V4 a1 1 0 0 1 1 -1 Z" />
  </svg>
);

/* ------------------------------------------------------------- component --- */
export default function AppSaved() {
  const [allJobs, setAllJobs] = useState(SAMPLE_JOBS);
  const [removed, setRemoved] = useState([]);
  const [collection, setCollection] = useState('all'); // all | review | dream
  const [sort, setSort] = useState('recent'); // recent | match | salary
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const hasToken =
      typeof window !== 'undefined' &&
      (localStorage.getItem('authToken') || localStorage.getItem('token'));

    if (!hasToken) {
      // Unauthenticated — render the design faithfully with its sample data.
      setLoading(false);
      return undefined;
    }

    (async () => {
      try {
        const data = await getInterestedJobs();
        const normalized = normalizeApiJobs(data);
        if (cancelled) return;
        if (normalized.length) {
          setAllJobs(normalized);
          setUsingSample(false);
        }
        // empty array from a real account -> show the (real) empty state
        if (Array.isArray(data) || data?.interested || data?.matches || data?.jobs || data?.data) {
          if (!normalized.length) {
            setAllJobs([]);
            setUsingSample(false);
          }
        }
      } catch (err) {
        // Network/auth failure — fall back gracefully to the sample data.
        if (!cancelled) {
          setAllJobs(SAMPLE_JOBS);
          setUsingSample(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = (id) => {
    setRemoved((r) => (r.includes(id) ? r : r.concat(id)));
    if (!usingSample) {
      // Best-effort unsave on the backend; UI optimistically updates regardless.
      markJobAsInterested(id, false).catch(() => {});
    }
  };

  /* ---- derived view (mirrors the DCLogic renderVals) ---- */
  const live = useMemo(
    () => allJobs.filter((j) => !removed.includes(j.id)),
    [allJobs, removed],
  );

  const reviewCount = useMemo(() => live.filter((j) => j.review).length, [live]);
  const dreamCount = useMemo(() => live.filter((j) => j.dream).length, [live]);

  const collections = [
    { key: 'all', label: 'All', count: live.length },
    { key: 'review', label: 'To review', count: reviewCount },
    { key: 'dream', label: 'Dream roles', count: dreamCount },
  ].map((c) => {
    const on = collection === c.key;
    return {
      ...c,
      color: on ? '#0C2C1C' : '#46413A',
      bg: on ? '#1FA463' : '#FFFEFB',
      border: on ? '#1FA463' : '#E1D9C9',
      countColor: on ? '#0C2C1C' : '#A79E8F',
    };
  });

  const sorts = [
    { key: 'recent', label: 'Recently saved' },
    { key: 'match', label: 'Match' },
    { key: 'salary', label: 'Salary' },
  ].map((s) => {
    const on = sort === s.key;
    return {
      ...s,
      color: on ? '#1B1A16' : '#8A8378',
      bg: on ? '#FFFEFB' : 'transparent',
      shadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
    };
  });

  const jobs = useMemo(() => {
    let filtered = live;
    if (collection === 'review') filtered = live.filter((j) => j.review);
    else if (collection === 'dream') filtered = live.filter((j) => j.dream);

    return filtered.slice().sort((a, b) => {
      if (sort === 'match') return b.matchNum - a.matchNum;
      if (sort === 'salary') return b.salaryMin - a.salaryMin;
      return b.savedTs - a.savedTs;
    });
  }, [live, collection, sort]);

  const empties = {
    all: { t: 'Nothing saved yet', s: 'Bookmark roles from your matches and they’ll collect here for later.' },
    review: { t: 'Nothing to review', s: 'Roles you flag for a closer look will show up in this collection.' },
    dream: { t: 'No dream roles yet', s: 'Star the roles you’d love most — they’ll live here so they’re easy to find.' },
  };
  const e = empties[collection] || empties.all;

  const hasJobs = jobs.length > 0;
  const isEmpty = jobs.length === 0;

  return (
    <>
      <Head>
        <title>Saved jobs — Jobocate</title>
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
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus {
          outline: none;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        #jbapp .jb-saved-card:hover {
          border-color: #1fa463;
        }
        #jbapp .jb-browse-btn:hover {
          background: #1b9159;
        }
        #jbapp .jb-apply-btn:hover {
          background: #2a2820;
        }
        #jbapp .jb-remove-btn:hover {
          background: #fbe9e2;
          border-color: #ead0c4;
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="saved" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Workspace / Saved jobs</div>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('App Matches.dc.html')} className="jb-browse-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#1FA463', color: '#0C2C1C', fontSize: 13.5, fontWeight: 700, padding: '10px 16px', borderRadius: 999, textDecoration: 'none' }}>Browse matches →</Link>
          </header>

          <div style={{ padding: '30px 32px 56px', maxWidth: 1180, width: '100%' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Saved jobs</h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                <b style={{ color: '#1B1A16' }}>{live.length} roles</b> bookmarked · <span style={{ color: '#157A49', fontWeight: 600 }}>{reviewCount} to review</span>
              </p>
            </div>

            {/* COLLECTION CHIPS + SORT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {collections.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCollection(c.key)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}
                >
                  {c.label}
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: c.countColor }}>{c.count}</span>
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' }}>Sort</span>
              <div style={{ display: 'inline-flex', padding: 4, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 4 }}>
                {sorts.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: s.color, background: s.bg, border: 'none', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', boxShadow: s.shadow }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SAVED CARDS */}
            {hasJobs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {jobs.map((job) => (
                  <div key={job.id} className="jb-saved-card" style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22, animation: 'rbpop 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 13, background: job.bg, color: job.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17 }}>{job.logo}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                          <h3 style={{ fontSize: 17.5, fontWeight: 700, margin: 0 }}>{job.role}</h3>
                          {job.dream && (
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '2px 8px', borderRadius: 999 }}>★ DREAM</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#5A544A', marginBottom: 13, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#1B1A16' }}>{job.company}</span>
                          <span style={{ color: '#C9BFAC' }}>·</span>
                          <span>{job.location}</span>
                          <span style={{ color: '#C9BFAC' }}>·</span>
                          <span>{job.type}</span>
                          <span style={{ color: '#C9BFAC' }}>·</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>{job.salary}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          {job.tags.map((t, i) => (
                            <span key={`${t}-${i}`} style={{ fontSize: 12, fontWeight: 500, color: '#5A544A', background: '#F4EFE4', borderRadius: 7, padding: '5px 10px' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, color: '#157A49', lineHeight: 1 }}>{job.match}</div>
                          <div style={{ fontSize: 11, color: '#8A8378', fontFamily: "'JetBrains Mono',monospace" }}>match</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleRemove(job.id)}
                            title="Remove from saved"
                            className="jb-remove-btn"
                            style={{ width: 40, height: 40, border: '1px solid #CDE9D6', background: '#EAF6EE', borderRadius: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <BookmarkFill />
                          </button>
                          <Link href={appRoute('App Apply.dc.html')} className="jb-apply-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1B1A16', color: '#F7F3EA', fontSize: 13.5, fontWeight: 600, padding: '11px 18px', borderRadius: 11, textDecoration: 'none' }}>Apply →</Link>
                        </div>
                      </div>
                    </div>
                    {(job.savedDate || job.note) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 15, borderTop: '1px solid #F2ECE0', flexWrap: 'wrap' }}>
                        {job.savedDate && (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9A9286', flexShrink: 0 }}>Saved {job.savedDate}</span>
                        )}
                        {job.savedDate && job.note && <span style={{ width: 1, height: 13, background: '#E1D9C9' }} />}
                        {job.note && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#5A544A', minWidth: 0 }}>
                            <span style={{ color: '#C9622E', flexShrink: 0 }}>✎</span>
                            <span style={{ fontStyle: 'italic' }}>{job.note}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY STATE */}
            {isEmpty && (
              <div style={{ background: '#FFFEFB', border: '1px dashed #D2C9B7', borderRadius: 20, padding: '64px 30px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, margin: '0 auto 22px', borderRadius: '50%', background: '#F4EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A79E8F" strokeWidth="1.7" strokeLinejoin="round">
                    <path d="M6 3 h12 a1 1 0 0 1 1 1 v17 l-7 -4 -7 4 V4 a1 1 0 0 1 1 -1 Z" />
                  </svg>
                </div>
                <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 28, lineHeight: 1.1, margin: '0 0 8px' }}>{loading ? 'Loading saved jobs…' : e.t}</h2>
                <p style={{ fontSize: 14.5, color: '#8A8378', margin: '0 auto 24px', maxWidth: 380 }}>{loading ? 'Fetching the roles you bookmarked.' : e.s}</p>
                <Link href={appRoute('App Matches.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1FA463', color: '#0C2C1C', fontSize: 14.5, fontWeight: 700, padding: '13px 24px', borderRadius: 999, textDecoration: 'none' }}>Browse matches →</Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
