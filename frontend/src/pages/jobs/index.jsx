'use client';

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';
import { searchScrapedJobs } from '@/services/api';

// ── Design sample data (faithful to Browse Jobs.dc.html) ──────────────────
const SAMPLE_JOBS = [
  { title: 'Senior Product Designer', company: 'Stripe', location: 'Remote (US)', type: 'Full-time', salary: '$170–210k', logo: 'St', logoBg: '#EDF0FE', logoColor: '#4263EB', tags: ['Design systems', 'Fintech', 'Senior'], isNew: true, cat: 'design' },
  { title: 'Staff Frontend Engineer', company: 'Figma', location: 'San Francisco', type: 'Full-time', salary: '$210–260k', logo: 'Fi', logoBg: '#F4EFE4', logoColor: '#1B1A16', tags: ['React', 'TypeScript', 'Staff'], isNew: true, cat: 'eng' },
  { title: 'Product Manager, Growth', company: 'Linear', location: 'New York · Hybrid', type: 'Full-time', salary: '$180–220k', logo: 'Li', logoBg: '#F4EFE4', logoColor: '#1B1A16', tags: ['Growth', 'Experimentation'], isNew: false, cat: 'pm' },
  { title: 'Product Designer', company: 'Notion', location: 'Remote (US)', type: 'Full-time', salary: '$150–185k', logo: 'No', logoBg: '#F4EFE4', logoColor: '#1B1A16', tags: ['Craft', 'Consumer'], isNew: false, cat: 'design' },
  { title: 'Senior Backend Engineer', company: 'Airbnb', location: 'Remote (US)', type: 'Full-time', salary: '$200–250k', logo: 'Ai', logoBg: '#FBEDE4', logoColor: '#C9622E', tags: ['Go', 'Distributed systems'], isNew: false, cat: 'eng' },
  { title: 'Design Engineer', company: 'Linear', location: 'Remote (Global)', type: 'Full-time', salary: '$180–230k', logo: 'Li', logoBg: '#F4EFE4', logoColor: '#1B1A16', tags: ['Design eng', 'Motion'], isNew: true, cat: 'eng' },
];

const FILTER_DEFS = [
  { key: 'all', label: 'All roles' },
  { key: 'design', label: 'Design' },
  { key: 'eng', label: 'Engineering' },
  { key: 'pm', label: 'Product' },
  { key: 'remote', label: 'Remote only' },
];

const LOGO_PALETTE = [
  { logoBg: '#EDF0FE', logoColor: '#4263EB' },
  { logoBg: '#FBEDE4', logoColor: '#C9622E' },
  { logoBg: '#EAF6EE', logoColor: '#157A49' },
  { logoBg: '#F4EFE4', logoColor: '#1B1A16' },
];

// Map a backend scraped-job record into the card shape the design expects.
function normalizeJob(raw, i) {
  if (!raw || typeof raw !== 'object') return null;
  const title = raw.title || raw.jobTitle || raw.role || raw.position || 'Open role';
  const company = raw.company || raw.companyName || raw.employer || 'Company';
  const location = raw.location || raw.jobLocation || raw.city || 'Remote';
  const type = raw.type || raw.employmentType || raw.jobType || 'Full-time';
  const salary = raw.salary || raw.salaryRange || raw.compensation || '—';
  let tags = raw.tags || raw.skills || raw.keywords || [];
  if (!Array.isArray(tags)) tags = String(tags).split(',').map((t) => t.trim()).filter(Boolean);
  tags = tags.slice(0, 3);
  const initials = String(company).replace(/[^A-Za-z]/g, '').slice(0, 2) || 'Co';
  const pal = LOGO_PALETTE[i % LOGO_PALETTE.length];
  return {
    title,
    company,
    location,
    type,
    salary,
    tags,
    logo: (initials.charAt(0).toUpperCase() + (initials.charAt(1) || '').toLowerCase()) || 'Co',
    logoBg: pal.logoBg,
    logoColor: pal.logoColor,
    isNew: Boolean(raw.isNew || raw.new),
    cat: String(raw.category || raw.cat || '').toLowerCase(),
  };
}

export default function BrowseJobs() {
  const [query, setQuery] = useState('');
  const [loc, setLoc] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [remoteJobs, setRemoteJobs] = useState(null); // null = use design sample
  const [resultCount, setResultCount] = useState('1,284');

  // PUBLIC job search with graceful fallback to the design's sample data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await searchScrapedJobs({ limit: 24 });
        const list = Array.isArray(res) ? res : res?.jobs || res?.results || res?.data || [];
        const mapped = list.map(normalizeJob).filter(Boolean);
        if (!cancelled && mapped.length) {
          setRemoteJobs(mapped);
          const total = res?.total ?? res?.count ?? mapped.length;
          const n = Number(total);
          if (Number.isFinite(n)) setResultCount(n.toLocaleString('en-US'));
        }
      } catch {
        // Stay on sample data — never crash.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const baseJobs = remoteJobs && remoteJobs.length ? remoteJobs : SAMPLE_JOBS;

  const jobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = baseJobs;
    if (filter === 'remote') list = list.filter((j) => j.location.toLowerCase().includes('remote'));
    else if (filter !== 'all') list = list.filter((j) => j.cat === filter);
    if (q) list = list.filter((j) => (j.title + ' ' + j.company + ' ' + (j.tags || []).join(' ')).toLowerCase().includes(q));
    return list;
  }, [baseJobs, filter, query]);

  const jobHref = appRoute('Public Job.dc.html');

  return (
    <>
      <Head>
        <title>Browse Jobs — Jobocate</title>
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
        #emkt input:focus {
          outline: none;
          border-color: #1fa463;
        }
        #emkt input::placeholder {
          color: #a79e8f;
        }
        #emkt .jb-search-field:focus-within {
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.14);
        }
        #emkt .jb-job-card:hover {
          border-color: #1fa463 !important;
        }
        #emkt .jb-search-btn:hover,
        #emkt .jb-cta:hover {
          background: #1b9159 !important;
        }
      `}</style>

      <div
        id="emkt"
        style={{
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
          background: '#F7F3EA',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        {/* HERO + SEARCH */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '48px 32px 20px' }}>
          <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 46, lineHeight: 1.04, margin: '0 0 8px' }}>
            Find your next role.
          </h1>
          <p style={{ fontSize: 16, color: '#5A544A', margin: '0 0 26px' }}>
            {resultCount} open jobs from verified company career pages — never scam boards.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <div
              className="jb-search-field"
              style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 10, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '12px 18px' }}
            >
              <span style={{ color: '#A79E8F', fontSize: 14 }}>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Job title, company, or keyword"
                style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 15, color: '#1B1A16' }}
              />
            </div>
            <div
              className="jb-search-field"
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '12px 18px', minWidth: 200 }}
            >
              <span style={{ color: '#A79E8F', fontSize: 14 }}>⌖</span>
              <input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="Location or remote"
                style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 15, color: '#1B1A16' }}
              />
            </div>
            <button
              className="jb-search-btn"
              type="button"
              style={{ background: '#1FA463', color: '#0C2C1C', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, padding: '12px 26px', border: 'none', borderRadius: 999, cursor: 'pointer' }}
            >
              Search
            </button>
          </div>

          {/* FILTER CHIPS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {FILTER_DEFS.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: on ? '#0C2C1C' : '#46413A',
                    background: on ? '#1FA463' : '#FFFEFB',
                    border: `1px solid ${on ? '#1FA463' : '#E1D9C9'}`,
                    borderRadius: 999,
                    padding: '8px 15px',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* RESULTS */}
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '14px 32px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {jobs.map((j, i) => (
              <Link
                key={`${j.company}-${j.title}-${i}`}
                href={jobHref}
                className="jb-job-card"
                style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: '20px 22px', textDecoration: 'none' }}
              >
                <span style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 13, background: j.logoBg, color: j.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, fontFamily: "'JetBrains Mono',monospace" }}>
                  {j.logo}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1B1A16' }}>{j.title}</span>
                    {j.isNew && (
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '2px 7px', borderRadius: 999 }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13.5, color: '#5A544A' }}>
                    {j.company} · {j.location} · {j.type}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
                    {(j.tags || []).map((t, ti) => (
                      <span key={`${t}-${ti}`} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: '#5A544A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '3px 8px', borderRadius: 999 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 600, color: '#1B1A16', marginBottom: 6 }}>{j.salary}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#9A9286', background: '#F4EFE4', border: '1px solid #E6DECF', borderRadius: 999, padding: '5px 11px' }}>
                    <span style={{ filter: 'blur(3px)', fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>9X%</span> match · sign in
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* SIGNUP BANNER */}
          <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', borderRadius: 18, padding: '28px 32px', margin: '20px 0', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 88% 10%, rgba(31,164,99,0.3), transparent 58%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 26, lineHeight: 1.1, color: '#FBF8F1', marginBottom: 6 }}>
                Create a free account to auto-apply.
              </div>
              <div style={{ fontSize: 14, color: '#B8B1A4' }}>
                See your real match % on every role and let your copilot apply to the best ones for you.
              </div>
            </div>
            <Link
              href={appRoute('App Sign Up.dc.html')}
              className="jb-cta"
              style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1FA463', color: '#0C2C1C', fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 999, textDecoration: 'none' }}
            >
              Create free account →
            </Link>
          </div>

          {/* PAGINATION */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px 0 8px' }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#8A8378', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 9, padding: '9px 13px', cursor: 'pointer' }}
            >
              ←
            </button>
            {['1', '2', '3', '4', '5'].map((label) => {
              const on = String(page) === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPage(Number(label))}
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    color: on ? '#0C2C1C' : '#5A544A',
                    background: on ? '#1FA463' : '#FFFEFB',
                    border: `1px solid ${on ? '#1FA463' : '#E1D9C9'}`,
                    borderRadius: 9,
                    padding: '9px 14px',
                    cursor: 'pointer',
                    minWidth: 40,
                  }}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(5, p + 1))}
              style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 9, padding: '9px 13px', cursor: 'pointer' }}
            >
              →
            </button>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
