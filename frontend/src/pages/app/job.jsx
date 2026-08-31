'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { getScrapedJobById, calculateJobMatch, markJobAsInterested } from '@/services/jobApi';

/* ------------------------------------------------------------- normalize --- */
function initialsFor(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name.slice(0, 2);
}

// Fold a real scraped-job / match payload into the page's view-model shape.
// Missing fields collapse to empty values — never fabricated placeholders.
function normalize(job, match) {
  const j = job || {};
  const m = match || {};

  const company = j.company || j.companyName || '';
  const locParts = [];
  if (j.location) locParts.push(j.location);
  if (j.employmentType || j.type) locParts.push(j.employmentType || j.type);

  const score =
    m.score != null ? Math.round(m.score) :
    m.matchScore != null ? Math.round(m.matchScore) :
    null;

  const matched =
    (Array.isArray(m.matchedSkills) && m.matchedSkills) ||
    (Array.isArray(m.matched) && m.matched) ||
    [];
  const gaps =
    (Array.isArray(m.missingSkills) && m.missingSkills) ||
    (Array.isArray(m.gaps) && m.gaps) ||
    [];

  // Build description sections from whatever the scraper gives us.
  const sections = [];
  if (Array.isArray(j.responsibilities) && j.responsibilities.length)
    sections.push({ title: 'What you’ll do', items: j.responsibilities });
  if (Array.isArray(j.requirements) && j.requirements.length)
    sections.push({ title: 'What we’re looking for', items: j.requirements });
  if (Array.isArray(j.benefits) && j.benefits.length)
    sections.push({ title: 'Benefits', items: j.benefits });

  return {
    id: j._id || j.id || null,
    initials: initialsFor(company),
    title: j.title || '',
    company,
    location: locParts[0] || '',
    type: locParts[1] || '',
    salary: j.salary || j.salaryRange || '',
    matchScore: score,
    posted: j.postedAt || j.posted || '',
    applicants: j.applicants || '',
    hiringTeam: j.hiringTeam || '',
    why: m.explanation || m.reason || '',
    matched,
    gaps,
    intro: j.description || j.summary || '',
    sections,
    totalComp: j.totalComp || '',
    compNote: '',
    comp: (Array.isArray(j.comp) && j.comp) || [],
  };
}

/* ----------------------------------------------------------- bookmark svg --- */
function Bookmark({ saved }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={saved ? 'var(--jb-v3-accent)' : 'none'}
      stroke={saved ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-3)'}
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
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real data when a job id is present.
  useEffect(() => {
    if (!router.isReady) return;
    const jobId = router.query.id || router.query.jobId;
    if (!jobId) {
      setData(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [jobRes, matchRes] = await Promise.allSettled([
          getScrapedJobById(jobId),
          calculateJobMatch(jobId),
        ]);
        if (!alive) return;
        const job = jobRes.status === 'fulfilled' ? jobRes.value?.job || jobRes.value : null;
        const match = matchRes.status === 'fulfilled' ? matchRes.value?.match || matchRes.value : null;
        setData(job || match ? normalize(job, match) : null);
      } catch (e) {
        if (alive) {
          setError(e);
          setData(null);
        }
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
      if (data?.id) {
        markJobAsInterested(data.id, next).catch(() => {});
      }
      return next;
    });
  };

  const d = data;
  const matchDeg = `${((d?.matchScore || 0) / 100) * 360}deg`;

  const saveColor = saved ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-2)';
  const saveBg = saved ? 'var(--jb-v3-accent-soft)' : 'var(--jb-v3-panel)';
  const saveBorder = saved ? 'var(--jb-v3-accent-line)' : 'var(--jb-v3-line-2)';
  const saveLabel = saved ? 'Saved' : 'Save';
  const saveTitle = saved ? 'Remove from saved' : 'Save this role';

  const card = { background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 28 };

  return (
    <>
      <Head>
        <title>{d ? `${d.title} · ${d.company} — Jobocate` : 'Job — Jobocate'}</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp .jb-apply-pill:hover {
          background: var(--jb-v3-ok) !important;
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
          minHeight: '100vh',
          background: 'var(--jb-v3-bg)',
          fontFamily: 'var(--jb-v3-font-display)',
          color: 'var(--jb-v3-fg)',
        }}
      >
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'relative',
              
              
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '13px 32px',
              background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid var(--jb-v3-line)',
            }}
          >
            <Link
              href={appRoute('App Matches.dc.html')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg-2)', textDecoration: 'none' }}
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
                borderRadius: 2,
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
                background: 'var(--jb-v3-accent)',
                color: 'var(--jb-v3-accent-ink)',
                fontSize: 13.5,
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: 2,
                textDecoration: 'none',
              }}
            >
              Apply →
            </Link>
          </header>

          {loading ? (
            <LoadingState label="Loading job…" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => router.reload()} />
          ) : !d ? (
            <EmptyState title="No job to show" hint="Open a role from your matches to see the full details here." />
          ) : (
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
                    borderRadius: 2,
                    background: 'var(--jb-v3-accent-soft)',
                    color: 'var(--jb-v3-accent)',
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
                  <h1 style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 34, lineHeight: 1.04, margin: '0 0 6px' }}>{d.title}</h1>
                  <div style={{ fontSize: 14.5, color: 'var(--jb-v3-fg-2)' }}>
                    <Link href={appRoute('App Company.dc.html')} style={{ color: 'var(--jb-v3-accent)', fontWeight: 600, textDecoration: 'none' }}>
                      {d.company}
                    </Link>{' '}
                    · {d.location} · {d.type} ·{' '}
                    <span style={{ fontFamily: 'var(--jb-v3-font-mono)', color: 'var(--jb-v3-accent)' }}>{d.salary}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 30, fontWeight: 600, color: 'var(--jb-v3-accent)', lineHeight: 1 }}>{d.matchScore != null ? `${d.matchScore}%` : '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--jb-v3-fg-3)', fontFamily: 'var(--jb-v3-font-mono)' }}>match</div>
                </div>
              </div>

              {/* WHY MATCH */}
              <div style={{ background: 'var(--jb-v3-accent-soft)', border: '1px solid var(--jb-v3-accent-line)', borderRadius: 2, padding: 22 }}>
                <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-v3-accent)', marginBottom: 10 }}>
                  Why you’re a {d.matchScore != null ? `${d.matchScore}%` : ''} match
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--jb-v3-ok)', margin: '0 0 16px' }}>{d.why}</p>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jb-v3-ok)', marginBottom: 8 }}>Matched strengths</div>
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
                          color: 'var(--jb-v3-accent-ink)',
                          background: 'var(--jb-v3-ok-soft)',
                          border: '1px solid var(--jb-v3-ok-line)',
                          borderRadius: 2,
                          padding: '6px 13px',
                        }}
                      >
                        <span style={{ color: 'var(--jb-v3-accent)' }}>✓</span>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jb-v3-danger)', marginBottom: 8 }}>Worth addressing</div>
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
                          color: 'var(--jb-v3-danger)',
                          background: 'var(--jb-v3-warn-soft)',
                          border: '1px solid var(--jb-v3-danger-line)',
                          borderRadius: 2,
                          padding: '6px 13px',
                        }}
                      >
                        <span style={{ color: 'var(--jb-v3-danger)' }}>!</span>
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div style={card}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>About the role</h2>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--jb-v3-fg-2)', margin: '0 0 4px' }}>{d.intro}</p>

                {expanded && (
                  <div style={{ animation: 'rbpop 0.25s ease' }}>
                    {d.sections.map((sec, si) => (
                      <div key={`${sec.title}-${si}`} style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>{sec.title}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {sec.items.map((it, ii) => (
                            <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                              <span style={{ width: 6, height: 6, flexShrink: 0, borderRadius: '50%', background: 'var(--jb-v3-accent)', marginTop: 8 }} />
                              <span style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--jb-v3-fg-2)' }}>{it}</span>
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
                    color: 'var(--jb-v3-accent)',
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
                  <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: 'var(--jb-v3-fg-3)' }}>est. total / yr</span>
                </div>
                <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 34, fontWeight: 600, lineHeight: 1, color: 'var(--jb-v3-fg)', marginBottom: 4 }}>{d.totalComp}</div>
                <div style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)', marginBottom: 20 }}>{d.compNote}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {d.comp.map((c, i) => (
                    <div key={`${c.label}-${i}`} style={{ background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', marginBottom: 6 }}>{c.label}</div>
                      <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== RIGHT RAIL ===== */}
            <div style={{ width: 312, flexShrink: 0, position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: `conic-gradient(var(--jb-v3-accent) ${matchDeg}, var(--jb-v3-line) 0)`,
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
                        background: 'var(--jb-v3-panel)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--jb-v3-font-mono)',
                        fontSize: 17,
                        fontWeight: 600,
                        color: 'var(--jb-v3-accent)',
                      }}
                    >
                      {d.matchScore != null ? `${d.matchScore}%` : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--jb-v3-fg)' }}>Excellent match</div>
                    <div style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)' }}>Top 8% of your matches</div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 11,
                    padding: '16px 0',
                    borderTop: '1px solid var(--jb-v3-control)',
                    borderBottom: '1px solid var(--jb-v3-control)',
                    marginBottom: 18,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>Posted</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{d.posted}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>Applicants</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{d.applicants}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>Hiring team</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{d.hiringTeam}</span>
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
                    background: 'var(--jb-v3-accent)',
                    color: 'var(--jb-v3-accent-ink)',
                    fontSize: 15.5,
                    fontWeight: 700,
                    padding: 14,
                    borderRadius: 2,
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
                    borderRadius: 2,
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
                  background: 'var(--jb-v3-ok-soft)',
                  border: '1px solid var(--jb-v3-accent-line)',
                  borderRadius: 2,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: 'var(--jb-v3-ok)',
                    color: 'var(--jb-v3-accent-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--jb-v3-ok)' }}>
                  Verified careers page — your application goes straight to {d.company}.
                </span>
              </div>
            </div>
          </div>
          )}
        </main>
      </div>
    </>
  );
}
