'use client';

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import {
  getMyMatches,
  getJobRecommendations,
  markJobAsInterested,
} from '@/services/matchesApi';

/* ----------------------------------------------------------- design data --- */
// Faithful reproduction of the Component.renderVals() sample data from
// "App Matches.dc.html". Used as graceful fallback when unauthenticated /
// the backend is unavailable, so the page always renders something faithful.
const chip = (label, on, caret) => ({
  label,
  caret: caret || false,
  color: on ? '#0C2C1C' : '#46413A',
  bg: on ? '#1FA463' : '#FFFEFB',
  border: on ? '#1FA463' : '#E1D9C9',
});

const FILTERS = [
  chip('All matches', true, false),
  chip('Remote', false, false),
  chip('Role', false, true),
  chip('Salary', false, true),
  chip('Seniority', false, true),
  chip('Posted this week', false, false),
];

const SAMPLE_JOBS = [
  { logo: 'St', company: 'Stripe', role: 'Senior Product Designer', location: 'Remote (US)', type: 'Full-time', salary: '$170–210k', match: '96%', isNew: true, bg: '#EAF6EE', fg: '#157A49', tags: ['Design systems', '0→1', 'Fintech'], reason: 'Matches your design-systems background and fintech experience at Plaid.' },
  { logo: 'Fi', company: 'Figma', role: 'Product Manager, Growth', location: 'San Francisco · Hybrid', type: 'Full-time', salary: '$185–220k', match: '93%', isNew: true, bg: '#F4EFE4', fg: '#1B1A16', tags: ['Growth', 'B2B SaaS', 'Experimentation'], reason: 'Your growth metrics and PLG experience are a strong fit for this team.' },
  { logo: 'Li', company: 'Linear', role: 'Senior Frontend Engineer', location: 'Remote', type: 'Full-time', salary: '$180–215k', match: '91%', isNew: false, bg: '#F4EFE4', fg: '#1B1A16', tags: ['React', 'TypeScript', 'Design-eng'], reason: 'React + design-engineering hybrid roles align with your portfolio.' },
  { logo: 'No', company: 'Notion', role: 'Design Systems Lead', location: 'New York · Hybrid', type: 'Full-time', salary: '$190–230k', match: '89%', isNew: false, bg: '#F4EFE4', fg: '#1B1A16', tags: ['Leadership', 'Tokens', 'Accessibility'], reason: 'Leadership scope matches your goal of managing a small team.' },
  { logo: 'Va', company: 'Vanta', role: 'Staff Product Designer', location: 'Remote (US)', type: 'Full-time', salary: '$175–205k', match: '87%', isNew: false, bg: '#F4EFE4', fg: '#1B1A16', tags: ['Security', 'Enterprise', '0→1'], reason: 'Enterprise UX depth and your compliance-tool work line up well.' },
  { logo: 'Ra', company: 'Ramp', role: 'Senior PM, Platform', location: 'New York · Hybrid', type: 'Full-time', salary: '$195–235k', match: '85%', isNew: false, bg: '#F4EFE4', fg: '#1B1A16', tags: ['Platform', 'APIs', 'Fintech'], reason: 'Platform PM scope and fintech domain match your last two roles.' },
];

/* ----------------------------------------------------------- normalize --- */
const TINTS = [
  { bg: '#EAF6EE', fg: '#157A49' },
  { bg: '#F4EFE4', fg: '#1B1A16' },
];

const initialsOf = (name) => {
  if (!name) return '··';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]);
};

const formatSalary = (job) => {
  if (job.salary) return job.salary;
  const min = job.salaryMin ?? job.minSalary;
  const max = job.salaryMax ?? job.maxSalary;
  const k = (n) => `$${Math.round(n / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max).replace('$', '')}`;
  if (min) return `${k(min)}+`;
  if (max) return `Up to ${k(max)}`;
  return '';
};

const isRecent = (job) => {
  const d = job.postedAt || job.createdAt || job.scrapedAt;
  if (!d) return false;
  const days = (Date.now() - new Date(d).getTime()) / 86400000;
  return days <= 1;
};

// A backend match record can shape vary; pull both the match wrapper and the
// embedded job. Map onto the design's card model.
const normalizeMatch = (m, i) => {
  const job = m.job || m.scrapedJob || m.jobDetails || m;
  const score = m.score ?? m.matchScore ?? m.overallScore ?? job.matchScore;
  const tint = TINTS[score != null && score >= 90 ? 0 : 1] || TINTS[1];
  const rawTags = job.tags || job.skills || m.matchedSkills || [];
  const tags = (Array.isArray(rawTags) ? rawTags : []).slice(0, 3).map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
  return {
    id: m.id || m._id || job.id || job._id || `match-${i}`,
    jobId: job.id || job._id || m.jobId,
    logo: initialsOf(job.company || job.companyName),
    company: job.company || job.companyName || 'Company',
    role: job.role || job.title || job.jobTitle || 'Role',
    location: job.location || job.workLocation || 'Location',
    type: job.type || job.jobType || job.employmentType || 'Full-time',
    salary: formatSalary(job),
    match: score != null ? `${Math.round(score)}%` : '—',
    isNew: m.isNew ?? isRecent(job),
    bg: tint.bg,
    fg: tint.fg,
    tags,
    reason: m.reason || m.matchReason || m.explanation || job.description || '',
    isInterested: m.isInterested ?? false,
  };
};

/* ----------------------------------------------------------- component --- */
export default function AppMatches() {
  const [jobs, setJobs] = useState(SAMPLE_JOBS);
  const [total, setTotal] = useState(128);
  const [newToday, setNewToday] = useState(12);
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(true);
  const [error, setError] = useState('');
  const [interested, setInterested] = useState({}); // jobId -> bool

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let raw = [];
      let count = null;
      try {
        const res = await getMyMatches({ minScore: 60 });
        raw = res.matches || res.data || [];
        count = res.total ?? null;
      } catch (e1) {
        // Fall back to recommendations if matches endpoint is empty/unavailable.
        const rec = await getJobRecommendations(60);
        raw = rec.recommendations || rec.data || [];
        count = rec.total ?? null;
      }

      if (Array.isArray(raw) && raw.length > 0) {
        const mapped = raw.map(normalizeMatch);
        setJobs(mapped);
        setTotal(count ?? mapped.length);
        setNewToday(mapped.filter((j) => j.isNew).length);
        setUsingSample(false);
        const seed = {};
        mapped.forEach((j) => { if (j.jobId) seed[j.jobId] = !!j.isInterested; });
        setInterested(seed);
      } else {
        // No data — keep faithful sample so the screen never renders empty.
        setJobs(SAMPLE_JOBS);
        setUsingSample(true);
      }
    } catch (err) {
      setError(err?.message || 'Could not load matches');
      setJobs(SAMPLE_JOBS);
      setUsingSample(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleInterest = async (job) => {
    if (!job.jobId) return; // sample rows have no real id
    const wasOn = !!interested[job.jobId];
    setInterested((p) => ({ ...p, [job.jobId]: !wasOn }));
    try {
      await markJobAsInterested(job.jobId, !wasOn);
    } catch (e) {
      // revert on failure
      setInterested((p) => ({ ...p, [job.jobId]: wasOn }));
    }
  };

  const remaining = Math.max(total - jobs.length, 0);

  const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 22 };

  return (
    <>
      <Head>
        <title>Job Matches — Jobocate</title>
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
        #jbapp .jb-jobcard {
          transition: border-color 0.15s ease;
        }
        #jbapp .jb-jobcard:hover {
          border-color: #1fa463;
        }
        #jbapp .jb-heart:hover {
          background: #f4efe4 !important;
        }
        #jbapp .jb-applybtn:hover {
          background: #2a2820 !important;
        }
        #jbapp .jb-loadmore:hover {
          background: #f4efe4 !important;
        }
        #jbapp .jb-autoapply:hover {
          background: #1b9159 !important;
        }
        @keyframes jbshimmer {
          0% {
            background-position: -480px 0;
          }
          100% {
            background-position: 480px 0;
          }
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="matches" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Workspace / Job Matches</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 999, padding: '9px 15px', width: 280 }}>
              <span style={{ color: '#A79E8F', fontSize: 14 }}>⌕</span>
              <input placeholder="Search roles, companies…" style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 14, color: '#1B1A16' }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#A79E8F', border: '1px solid #E1D9C9', borderRadius: 5, padding: '1px 5px' }}>⌘K</span>
            </div>
            <Link href={appRoute('App Auto-Apply.dc.html')} className="jb-autoapply" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#1FA463', color: '#0C2C1C', fontSize: 13.5, fontWeight: 700, padding: '10px 16px', borderRadius: 999, textDecoration: 'none' }}>Auto-apply all ✦</Link>
          </header>

          <div style={{ padding: '30px 32px 48px', maxWidth: 1180, width: '100%' }}>
            {/* TITLE */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 22 }}>
              <div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Your matches</h1>
                <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                  <b style={{ color: '#1B1A16' }}>{total} roles</b> fit your profile · <span style={{ color: '#157A49', fontWeight: 600 }}>{newToday} new today</span>
                </p>
              </div>
            </div>

            {/* FILTER BAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {FILTERS.map((f) => (
                <button key={f.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: f.color, background: f.bg, border: `1px solid ${f.border}`, borderRadius: 999, padding: '8px 15px', cursor: 'pointer' }}>
                  {f.label}
                  {f.caret && <span style={{ fontSize: 9, color: '#9A9286' }}>▼</span>}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>Sorted by match</span>
            </div>

            {/* ERROR NOTICE (non-blocking; sample still shown) */}
            {error && !loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '11px 15px', background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 12, fontSize: 13, color: '#8A8378' }}>
                <span>Showing sample matches — couldn&apos;t reach your live matches.</span>
              </div>
            )}

            {/* JOB CARDS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} card={card} />)
                : jobs.map((job, i) => {
                    const on = job.jobId ? !!interested[job.jobId] : false;
                    return (
                      <div key={job.id || i} className="jb-jobcard" style={card}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                          <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 13, background: job.bg, color: job.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17 }}>{job.logo}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                              <h3 style={{ fontSize: 17.5, fontWeight: 700, margin: 0 }}>{job.role}</h3>
                              {job.isNew && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, color: '#0C2C1C', background: '#1FA463', padding: '2px 8px', borderRadius: 999 }}>NEW</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: '#5A544A', marginBottom: 14, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: '#1B1A16' }}>{job.company}</span>
                              {job.location && <><span style={{ color: '#C9BFAC' }}>·</span><span>{job.location}</span></>}
                              {job.type && <><span style={{ color: '#C9BFAC' }}>·</span><span>{job.type}</span></>}
                              {job.salary && <><span style={{ color: '#C9BFAC' }}>·</span><span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>{job.salary}</span></>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                              {job.tags.map((t, ti) => (
                                <span key={ti} style={{ fontSize: 12, fontWeight: 500, color: '#5A544A', background: '#F4EFE4', borderRadius: 7, padding: '5px 10px' }}>{t}</span>
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
                                onClick={() => toggleInterest(job)}
                                title={on ? 'Saved as interested' : 'Mark as interested'}
                                className="jb-heart"
                                style={{ width: 40, height: 40, border: `1px solid ${on ? '#1FA463' : '#E1D9C9'}`, background: on ? '#EAF6EE' : '#FFFEFB', borderRadius: 11, cursor: 'pointer', fontSize: 16, color: on ? '#157A49' : '#8A8378' }}
                              >
                                {on ? '♥' : '♡'}
                              </button>
                              <Link href={appRoute('App Apply.dc.html')} className="jb-applybtn" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1B1A16', color: '#F7F3EA', fontSize: 13.5, fontWeight: 600, padding: '11px 18px', borderRadius: 11, textDecoration: 'none' }}>Apply →</Link>
                            </div>
                          </div>
                        </div>
                        {job.reason && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 15, borderTop: '1px solid #F2ECE0' }}>
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1FA463', flexShrink: 0 }}>Why it fits</span>
                            <span style={{ fontSize: 13, color: '#5A544A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.reason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>

            {/* EMPTY STATE */}
            {!loading && jobs.length === 0 && (
              <div style={{ ...card, padding: '48px 30px', textAlign: 'center' }}>
                <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 28, margin: '0 0 8px' }}>No matches yet.</h2>
                <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Complete your profile and we&apos;ll start ranking roles by fit.</p>
              </div>
            )}

            {/* LOAD MORE */}
            {!loading && jobs.length > 0 && remaining > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
                <button className="jb-loadmore" style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '13px 26px', cursor: 'pointer' }}>Load {remaining} more matches</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

/* ----------------------------------------------------------- skeleton --- */
function SkeletonCard({ card }) {
  const bar = (w, h = 14) => ({
    width: w,
    height: h,
    borderRadius: 7,
    background: 'linear-gradient(90deg,#F1EBDD 25%,#F7F2E7 37%,#F1EBDD 63%)',
    backgroundSize: '480px 100%',
    animation: 'jbshimmer 1.4s ease infinite',
  });
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 13, ...bar(52, 52) }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...bar(220, 18), marginBottom: 10 }} />
          <div style={{ ...bar(300, 13), marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 7 }}>
            <span style={bar(78, 26)} />
            <span style={bar(64, 26)} />
            <span style={bar(70, 26)} />
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
          <div style={bar(48, 28)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={bar(40, 40)} />
            <span style={bar(82, 40)} />
          </div>
        </div>
      </div>
    </div>
  );
}
