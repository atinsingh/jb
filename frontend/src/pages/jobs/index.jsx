'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { API_URL } from '@/config/api';
import styles from '@/components/site/v3/PublicV3.module.css';

/**
 * Browse jobs.
 *
 * The v3 bundle has no public jobs artboard, so the presentation is built from
 * the patterns it does define: the hairline table used by the employer
 * candidates screen (mono column heads, 1px row rules, hover on --panel) plus
 * the mono chip row from the pipeline screens.
 *
 * The DATA LAYER IS UNCHANGED. Search, location, the filter chips and
 * pagination all query GET /api/public/jobs, the count in the subhead is the
 * live total, and a failed request renders an error rather than sample
 * listings - inventing roles that do not exist is exactly what an earlier
 * version of this page did.
 *
 * Match scores stay behind sign-in: the score is per-candidate and there is no
 * candidate until someone signs in.
 */

const CHIPS = [
  { id: 'all', label: 'All roles' },
  { id: 'design', label: 'Design', q: 'designer' },
  { id: 'eng', label: 'Engineering', q: 'engineer' },
  { id: 'product', label: 'Product', q: 'product manager' },
  { id: 'remote', label: 'Remote only', remote: true },
];

const PER_PAGE = 10;

const initials = (name = '') =>
  name
    .replace(/[^a-zA-Z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '·';

/**
 * Company mark. Logos come from unavatar, which 404s for plenty of the scraped
 * employers, so a failed load falls back to initials rather than leaving an
 * empty tile.
 */
function JobLogo({ company, src }) {
  const [broken, setBroken] = useState(false);
  const showImg = src && !broken;
  return (
    <span className={styles.jobLogo} aria-hidden="true">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        initials(company)
      )}
    </span>
  );
}

export default function FindJobs() {
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [chip, setChip] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ jobs: [], total: null, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reqId = useRef(0);

  const load = useCallback(async (opts) => {
    const mine = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const active = CHIPS.find((c) => c.id === opts.chip) || CHIPS[0];
      const params = new URLSearchParams({ page: String(opts.page), limit: String(PER_PAGE) });
      const search = [opts.q, active.q].filter(Boolean).join(' ').trim();
      if (search) params.set('q', search);
      if (opts.loc.trim()) params.set('location', opts.loc.trim());
      if (active.remote) params.set('remote', 'true');

      const res = await fetch(`${API_URL}/api/public/jobs?${params}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = await res.json();
      if (mine !== reqId.current) return; // a newer query already landed
      setData({ jobs: body.jobs || [], total: body.total ?? 0, pages: body.pages || 1 });
    } catch (e) {
      if (mine !== reqId.current) return;
      // No sample fallback: rendering invented listings when the API is down is
      // how this page previously claimed roles that did not exist.
      setData({ jobs: [], total: null, pages: 1 });
      setError("We couldn't load roles just now. Please retry in a moment.");
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ q, loc, chip, page });
    // q/loc apply on submit, not per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chip, page, load]);

  const submit = (e) => {
    e.preventDefault();
    setPage(1);
    load({ q, loc, chip, page: 1 });
  };

  const pickChip = (id) => {
    setChip(id);
    setPage(1);
  };

  // Windowed pagination: ‹ 1 2 3 4 5 ›
  const pageWindow = () => {
    const total = data.pages;
    const start = Math.max(1, Math.min(page - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => start + i).filter((n) => n <= total);
  };

  const countLabel = loading
    ? 'Loading'
    : data.total === null
      ? 'Unavailable'
      : `${data.total.toLocaleString()} open`;

  return (
    <>
      <Head>
        <title>Browse Jobs — AI Job Search | Jobocate</title>
        <meta
          name="description"
          content="Browse open roles pulled straight from verified company career pages. No reposts, no scam listings — and every match opens to show exactly why it fits."
        />
        <link rel="canonical" href="https://jobocate.com/jobs" />
      </Head>

      <PublicLayout surface="v3">
        <div className={`jb ${styles.page}`}>
          <div className={styles.headRow}>
            <h1>Jobs</h1>
            <p className={styles.monoLabel} aria-live="polite">
              {countLabel}
            </p>
          </div>

          <form className={styles.filterBar} onSubmit={submit} role="search">
            <label className={styles.srOnly} htmlFor="jobs-q">
              Role or keyword
            </label>
            <input
              id="jobs-q"
              className={styles.field}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Role, skill or company"
            />
            <label className={styles.srOnly} htmlFor="jobs-loc">
              Location
            </label>
            <input
              id="jobs-loc"
              className={styles.field}
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              placeholder="Location"
            />
            <button type="submit" className={styles.fieldBtn}>
              Search
            </button>
          </form>

          <div className={styles.chipRow}>
            {CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`${styles.chip} ${chip === c.id ? styles.chipOn : ''}`}
                aria-pressed={chip === c.id}
                onClick={() => pickChip(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className={styles.tableHead} aria-hidden="true">
            <span />
            <span>Role</span>
            <span>Location</span>
            <span>Type</span>
            <span>Salary</span>
          </div>

          {error ? (
            <p className={styles.stateMsg} role="alert">
              {error}
            </p>
          ) : loading ? (
            <p className={styles.stateMsg}>Loading roles…</p>
          ) : data.jobs.length === 0 ? (
            <p className={styles.stateMsg}>
              No roles match that search. Try a broader keyword or clear the filters.
            </p>
          ) : (
            <ul className={styles.rows}>
              {data.jobs.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className={styles.row}>
                    <JobLogo company={j.company} src={j.logo} />
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {j.title}
                        {j.isNew ? <span className={styles.rowFlag}>New</span> : null}
                      </span>
                      <span className={styles.rowSub}>{j.company}</span>
                    </span>
                    <span className={styles.rowMeta}>
                      {j.isRemote ? 'Remote' : j.location || '—'}
                    </span>
                    <span className={styles.rowMeta}>{j.jobType || '—'}</span>
                    <span className={styles.rowMetaStrong}>{j.salary || '—'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.rule} />

          {data.pages > 1 && !loading && !error ? (
            <nav className={styles.pager} aria-label="Pagination">
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                ‹
              </button>
              {pageWindow().map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.pageBtn} ${n === page ? styles.pageBtnOn : ''}`}
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                aria-label="Next page"
              >
                ›
              </button>
            </nav>
          ) : null}
        </div>
      </PublicLayout>
    </>
  );
}
