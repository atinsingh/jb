'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { getCompanyMatches } from '@/services/companyApi';

/* ----------------------------------------------------------- helpers --- */
const initialsFor = (name) => {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name.slice(0, 2).toUpperCase();
};

const fmtSalary = (job) => {
  if (job?.salaryRange) return job.salaryRange;
  const min = job?.salaryMin ?? job?.salary?.min;
  const max = job?.salaryMax ?? job?.salary?.max;
  if (min && max) return `$${Math.round(min / 1000)}–${Math.round(max / 1000)}k`;
  return '—';
};

const fmtMatch = (m) => {
  const s = m?.matchScore ?? m?.score ?? m?.overallScore;
  if (typeof s === 'number') return `${Math.round(s > 1 ? s : s * 100)}%`;
  return '—';
};

// Map backend match records to role cards. When a company name is known, keep
// only roles at that company; otherwise keep all matched roles.
const mapMatchesToRoles = (matches, companyName) => {
  if (!Array.isArray(matches)) return [];
  return matches
    .map((m) => {
      const job = m.job || m.jobPosting || m;
      const company = job.company || job.companyName || job.employer || m.company || '';
      return {
        company,
        role: job.title || job.role || job.jobTitle || 'Open role',
        location: job.location || (job.remote ? 'Remote (US)' : 'On-site'),
        type: job.employmentType || job.type || 'Full-time',
        salary: fmtSalary(job),
        match: fmtMatch(m),
      };
    })
    .filter((r) =>
      companyName
        ? typeof r.company === 'string' && r.company.toLowerCase().includes(companyName.toLowerCase())
        : true
    );
};

/* --------------------------------------------------------- component --- */
export default function AppCompany() {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The company being profiled comes from the route — there is no fabricated
  // default. Without one (or without a signed-in session) the page shows an
  // honest empty/loading/error state instead of demo data.
  const companyName =
    (router.isReady &&
      (router.query.company || router.query.name || router.query.id)) ||
    '';

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await getCompanyMatches({ minScore: 80 });
        const list = data?.matches || data?.recommendations || data || [];
        const mapped = mapMatchesToRoles(list, companyName);
        if (!cancelled) setRoles(mapped);
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setRoles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, companyName]);

  const roleCount = roles.length;
  const initials = initialsFor(companyName);

  const followLabel = following ? 'Following ✓' : '+ Follow';
  const followColor = following ? 'var(--jb-v3-accent)' : 'var(--jb-v3-accent-ink)';
  const followBg = following ? 'var(--jb-v3-accent-soft)' : 'var(--jb-v3-accent)';
  const followBorder = following ? 'var(--jb-v3-accent-line)' : 'var(--jb-v3-accent)';

  return (
    <>
      <Head>
        <title>{companyName ? `${companyName} · Company profile — Jobocate` : 'Company profile — Jobocate'}</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp .jb-role:hover {
          border-color: var(--jb-v3-accent) !important;
        }
        #jbapp .jb-apply:hover {
          background: var(--jb-v3-invert) !important;
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
              gap: 18,
              padding: '15px 32px',
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
            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-fg-3)' }}>Company profile</span>
          </header>

          {!companyName ? (
            <EmptyState
              title="No company selected"
              hint="Open a company from one of your matches to see its profile and open roles."
            />
          ) : (
            <div style={{ padding: '32px 32px 64px', maxWidth: 840, width: '100%', margin: '0 auto' }}>
              {/* COMPANY HEADER */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 26 }}>
                <span
                  style={{
                    width: 78,
                    height: 78,
                    flexShrink: 0,
                    borderRadius: 2,
                    background: 'var(--jb-v3-accent-soft)',
                    color: 'var(--jb-v3-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--jb-v3-font-display)',
                    fontWeight: 800,
                    fontSize: 34,
                  }}
                >
                  {initials}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 9px' }}>{companyName}</h1>
                  <div style={{ fontSize: 14, color: 'var(--jb-v3-fg-2)' }}>
                    {roleCount} {roleCount === 1 ? 'role' : 'roles'} matched to you
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
                    borderRadius: 2,
                    padding: '11px 20px',
                    cursor: 'pointer',
                  }}
                >
                  {followLabel}
                </button>
              </div>

              {/* OPEN ROLES */}
              <div style={{ marginBottom: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Open roles</h2>
                  <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-fg-3)' }}>{roleCount} matched to you</span>
                </div>

                {loading ? (
                  <LoadingState label="Loading roles…" />
                ) : error ? (
                  <ErrorState error={error} onRetry={() => router.reload()} />
                ) : roleCount === 0 ? (
                  <EmptyState
                    title="No matched roles yet"
                    hint={`We haven’t matched you to any open roles at ${companyName} yet.`}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {roles.map((r, i) => (
                      <div
                        key={`${r.role}-${i}`}
                        className="jb-role"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          background: 'var(--jb-v3-panel)',
                          border: '1px solid var(--jb-v3-line)',
                          borderRadius: 2,
                          padding: '17px 20px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{r.role}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--jb-v3-fg-2)', flexWrap: 'wrap' }}>
                            <span>{r.location}</span>
                            <span style={{ color: 'var(--jb-v3-line-2)' }}>·</span>
                            <span>{r.type}</span>
                            <span style={{ color: 'var(--jb-v3-line-2)' }}>·</span>
                            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', color: 'var(--jb-v3-accent)' }}>{r.salary}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 19, fontWeight: 600, color: 'var(--jb-v3-accent)', lineHeight: 1 }}>{r.match}</div>
                          <div style={{ fontSize: 11, color: 'var(--jb-v3-fg-3)', fontFamily: 'var(--jb-v3-font-mono)' }}>match</div>
                        </div>
                        <Link
                          href={appRoute('App Apply.dc.html')}
                          className="jb-apply"
                          style={{
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            background: 'var(--jb-v3-fg)',
                            color: 'var(--jb-v3-bg)',
                            fontSize: 13.5,
                            fontWeight: 600,
                            padding: '11px 18px',
                            borderRadius: 2,
                            textDecoration: 'none',
                          }}
                        >
                          Apply →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TRUST NOTE */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '15px 18px', background: 'var(--jb-v3-ok-soft)', border: '1px solid var(--jb-v3-accent-line)', borderRadius: 2 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: 'var(--jb-v3-ok)',
                    color: 'var(--jb-v3-accent-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--jb-v3-ok)' }}>
                  <b>Verified careers page.</b> Applications you send through Jobocate go directly to {companyName} — never a third-party board or reseller.
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
