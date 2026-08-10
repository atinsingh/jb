'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';
import { API_URL } from '@/config/api';

/**
 * Find Jobs — the "Departures" board.
 *
 * Ported from the approved `Find Jobs.dc.html` mock.
 *
 * The mock ships six hardcoded listings at Stripe/Figma/Linear/Notion/Airbnb
 * and a hardcoded "1,284 open roles" headline. This renders the real pool
 * instead, via GET /api/public/jobs — the count in the subhead is the live
 * total, and search, location, the filter chips and pagination all query the
 * server rather than being decorative (every one of them was inert before:
 * the Search button had no handler, the location field was never read, and
 * pagination set state without slicing anything).
 *
 * Match scores stay blurred behind "sign in", exactly as the mock shows — the
 * score is per-candidate, and there is no candidate until sign-in.
 */

const CHIPS = [
  { id: 'all', label: 'All roles' },
  { id: 'design', label: 'Design', q: 'designer' },
  { id: 'eng', label: 'Engineering', q: 'engineer' },
  { id: 'product', label: 'Product', q: 'product manager' },
  { id: 'remote', label: 'Remote only', remote: true },
];

const PER_PAGE = 10;

// Deterministic tint per company so a logo-less card still reads as a brand
// mark rather than a grey box. Same company always gets the same colour.
const TINTS = ['#4C6EF5', '#0CA678', '#7048E8', '#E8590C', '#2F9E44', '#1098AD', '#D6336C'];
const tintFor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
};
const initials = (name = '') =>
  name
    .replace(/[^a-zA-Z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '·';

const titleCase = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Company mark. Logos come from unavatar, which 404s for plenty of the scraped
 * employers, so a failed load has to fall back to initials rather than just
 * hiding the image and leaving an empty tile.
 */
function JobLogo({ company, src }) {
  const [broken, setBroken] = useState(false);
  const showImg = src && !broken;
  return (
    <span className="fj__logo" style={{ background: `${tintFor(company)}33` }}>
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

  return (
    <>
      <Head>
        <title>Browse Jobs — AI Job Search | Jobocate</title>
        <meta
          name="description"
          content="Browse open roles pulled straight from verified company career pages. No reposts, no scam listings — and every match opens to show exactly why it fits."
        />
      </Head>

      <PublicLayout>
        <div className="fj">
          {/* ---------- SEARCH HEADER ---------- */}
          <section className="fj__head">
            <span className="fj__eyebrow">DEPARTURES · OPEN ROLES</span>
            <h1 className="fj__h1">
              Browse real jobs, <span className="jb-em">matched to you.</span>
            </h1>
            <p className="fj__sub">
              {data.total === null
                ? 'Roles pulled straight from verified company career pages — no reposts, no scam listings.'
                : `${data.total.toLocaleString()} open ${data.total === 1 ? 'role' : 'roles'} pulled straight from verified company career pages — no reposts, no scam listings.`}
            </p>

            <form className="fj__search" onSubmit={submit} role="search">
              <div className="fj__field">
                <span className="fj__fieldicon" aria-hidden="true">⌕</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Job title, company, or keyword"
                  aria-label="Job title, company, or keyword"
                />
              </div>
              <div className="fj__field fj__field--loc">
                <span className="fj__fieldicon" aria-hidden="true">⌂</span>
                <input
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder="Location or remote"
                  aria-label="Location or remote"
                />
              </div>
              <button type="submit" className="fj__searchbtn">Search</button>
            </form>

            <div className="fj__chips" role="group" aria-label="Filter roles">
              {CHIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`fj__chip${chip === c.id ? ' fj__chip--on' : ''}`}
                  aria-pressed={chip === c.id}
                  onClick={() => pickChip(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          {/* ---------- LIST ---------- */}
          <section className="fj__list" aria-busy={loading}>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`s${i}`} className="fj__card fj__card--skeleton" aria-hidden="true">
                  <span className="fj__logo fj__sk" />
                  <span className="fj__body">
                    <span className="fj__sk fj__sk--line" style={{ width: '46%' }} />
                    <span className="fj__sk fj__sk--line" style={{ width: '30%' }} />
                  </span>
                </div>
              ))}

            {!loading && error && (
              <div className="fj__empty" role="alert">
                {error}{' '}
                <button type="button" className="fj__retry" onClick={() => load({ q, loc, chip, page })}>
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && data.jobs.length === 0 && (
              <div className="fj__empty">
                No roles match that search — try a different keyword or filter.
              </div>
            )}

            {!loading &&
              !error &&
              data.jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="fj__card">
                  <JobLogo company={j.company} src={j.logo} />

                  <span className="fj__body">
                    <span className="fj__titlerow">
                      <span className="fj__title">{j.title}</span>
                      {j.isNew && <span className="fj__new">NEW</span>}
                    </span>
                    <span className="fj__meta">
                      {[titleCase(j.company), j.isRemote ? 'Remote' : j.location, j.jobType]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {j.tags?.length > 0 && (
                      <span className="fj__tags">
                        {j.tags.map((t) => (
                          <span key={t} className="fj__tag">{t}</span>
                        ))}
                      </span>
                    )}
                  </span>

                  <span className="fj__right">
                    {j.salary && <span className="fj__salary">{j.salary}</span>}
                    <span className="fj__match">
                      <span className="fj__matchnum" aria-hidden="true">92</span>
                      MATCH · SIGN IN
                    </span>
                  </span>
                </Link>
              ))}
          </section>

          {/* ---------- ACCOUNT CTA ---------- */}
          <section className="fj__ctawrap">
            <div className="fj__cta">
              <div>
                <h2 className="fj__ctah">
                  Create a free account to see <span className="jb-em">your matches.</span>
                </h2>
                <p className="fj__ctap">
                  See your real match score on every role, with the reasoning shown — then
                  auto-apply to the ones you approve.
                </p>
              </div>
              <Link href={appRoute('App Sign Up.dc.html')} className="fj__ctabtn">
                Create free account →
              </Link>
            </div>
          </section>

          {/* ---------- PAGINATION ---------- */}
          {data.pages > 1 && (
            <nav className="fj__pager" aria-label="Pagination">
              <button
                type="button"
                className="fj__page"
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
                  className={`fj__page${n === page ? ' fj__page--on' : ''}`}
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="fj__page"
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                aria-label="Next page"
              >
                ›
              </button>
            </nav>
          )}
        </div>

        <style jsx>{`
          .fj { --pad: 48px; max-width: 1280px; margin: 0 auto; font-family: var(--jb-font-sans); }
          .fj :global(*) { box-sizing: border-box; }

          .fj__head { padding: 56px var(--pad) 32px; display: flex; flex-direction: column; gap: 14px; }
          .fj__eyebrow {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500;
            letter-spacing: 0.24em; color: var(--jb-d-accent);
          }
          .fj__h1 {
            margin: 0; font-family: var(--jb-font-display); font-weight: 400;
            font-size: clamp(34px, 4.6vw, 56px); line-height: 1.05;
          }
          .fj__sub { margin: 0; font-size: 15px; line-height: 1.6; color: var(--jb-d-ink-65); }

          .fj__search { display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap; }
          .fj__field {
            flex: 1.6 1 260px; display: flex; align-items: center; gap: 10px;
            background: var(--jb-d-panel); border: 1px solid var(--jb-d-line-input);
            border-radius: 999px; padding: 0 20px;
          }
          .fj__field--loc { flex: 1 1 200px; }
          .fj__field:focus-within { border-color: var(--jb-d-accent); }
          .fj__fieldicon { color: var(--jb-d-ink-45); font-size: 14px; }
          .fj__field input {
            flex: 1; min-width: 0; background: transparent; border: none; outline: none;
            color: var(--jb-d-ink); font-family: var(--jb-font-sans); font-size: 14px; padding: 16px 0;
          }
          .fj__searchbtn {
            background: var(--jb-d-accent); color: var(--jb-d-bg);
            font-family: var(--jb-font-sans); font-size: 14px; font-weight: 700;
            padding: 16px 30px; border: none; border-radius: 999px; cursor: pointer; min-height: 48px;
          }
          .fj__searchbtn:hover { background: var(--jb-d-accent-hi); }

          .fj__chips { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
          .fj__chip {
            font-family: var(--jb-font-sans); font-size: 12px; font-weight: 600;
            padding: 9px 16px; min-height: 38px; border-radius: 999px; cursor: pointer;
            background: transparent; color: var(--jb-d-ink-70);
            border: 1px solid var(--jb-d-line-input);
          }
          .fj__chip:hover { border-color: var(--jb-d-accent); }
          .fj__chip--on { background: var(--jb-d-accent); color: var(--jb-d-bg); border-color: var(--jb-d-accent); }

          .fj__list { padding: 8px var(--pad) 24px; display: flex; flex-direction: column; gap: 14px; }
          :global(.fj__card) {
            display: flex; align-items: center; gap: 20px;
            background: var(--jb-d-panel); border: 1px solid var(--jb-d-line-card);
            border-radius: 14px; padding: 24px 28px;
            text-decoration: none; color: inherit;
            transition: border-color 0.16s ease;
          }
          :global(.fj__card:hover) { border-color: var(--jb-d-accent); }
          :global(.fj__logo) {
            width: 48px; height: 48px; flex: none; border-radius: 10px;
            display: flex; align-items: center; justify-content: center; overflow: hidden;
            font-family: var(--jb-font-mono); font-size: 15px; font-weight: 700;
            color: var(--jb-d-ink);
          }
          :global(.fj__logo img) { width: 100%; height: 100%; object-fit: cover; }
          .fj__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
          .fj__titlerow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
          .fj__title { font-size: 17px; font-weight: 700; }
          .fj__new {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
            background: var(--jb-d-accent-tint); color: var(--jb-d-accent);
            border: 1px solid rgba(143, 214, 163, 0.4); padding: 3px 8px; border-radius: 999px;
          }
          .fj__meta { font-size: 13px; color: var(--jb-d-ink-65); }
          .fj__tags { display: flex; gap: 7px; flex-wrap: wrap; }
          .fj__tag {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.06em;
            border: 1px solid var(--jb-d-line-strong); border-radius: 4px;
            padding: 4px 9px; color: var(--jb-d-ink-65);
          }
          .fj__right { display: flex; flex-direction: column; align-items: flex-end; gap: 9px; flex: none; }
          .fj__salary { font-family: var(--jb-font-display); font-size: 22px; color: var(--jb-d-ink); }
          .fj__match {
            display: flex; align-items: center; gap: 8px;
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.08em;
            color: var(--jb-d-ink-55); border: 1px solid var(--jb-d-line-strong);
            border-radius: 999px; padding: 6px 12px; white-space: nowrap;
          }
          .fj__matchnum { filter: blur(4px); color: var(--jb-d-accent); font-weight: 600; }

          .fj__empty {
            padding: 48px; text-align: center; font-size: 15px; color: var(--jb-d-ink-55);
            border: 1px dashed var(--jb-d-line-input); border-radius: 14px;
          }
          .fj__retry {
            background: none; border: none; cursor: pointer; padding: 0;
            color: var(--jb-d-accent); font: inherit; text-decoration: underline;
          }

          :global(.fj__card--skeleton) { pointer-events: none; }
          .fj__sk { background: rgba(242, 236, 219, 0.08); border-radius: 8px; animation: fjPulse 1.4s ease-in-out infinite; }
          .fj__sk--line { height: 12px; border-radius: 6px; }
          @keyframes fjPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

          .fj__ctawrap { padding: 8px var(--pad); }
          .fj__cta {
            background:
              radial-gradient(ellipse at 90% 120%, rgba(143, 214, 163, 0.3), transparent 60%),
              var(--jb-d-panel-solid);
            border: 1px solid var(--jb-d-line-strong); border-radius: 16px;
            padding: 36px 40px; display: flex; align-items: center; justify-content: space-between;
            gap: 32px; flex-wrap: wrap;
          }
          .fj__ctah {
            margin: 0 0 8px; font-family: var(--jb-font-display); font-weight: 400;
            font-size: clamp(24px, 2.6vw, 30px); line-height: 1.1;
          }
          .fj__ctap { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--jb-d-ink-65); max-width: 52ch; }
          :global(.fj__ctabtn) {
            flex: none; background: var(--jb-d-accent); color: var(--jb-d-bg);
            font-family: var(--jb-font-sans); font-size: 14px; font-weight: 700;
            padding: 15px 28px; border-radius: 999px; text-decoration: none;
            min-height: 48px; display: inline-flex; align-items: center;
          }
          :global(.fj__ctabtn:hover) { background: var(--jb-d-accent-hi); }

          .fj__pager { display: flex; justify-content: center; gap: 8px; padding: 36px var(--pad) 64px; flex-wrap: wrap; }
          .fj__page {
            width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
            border-radius: 8px; font-family: var(--jb-font-mono); font-size: 13px; font-weight: 600;
            cursor: pointer; background: transparent; color: var(--jb-d-ink-70);
            border: 1px solid var(--jb-d-line-strong);
          }
          .fj__page:hover:not(:disabled) { border-color: var(--jb-d-accent); }
          .fj__page:disabled { opacity: 0.4; cursor: not-allowed; }
          .fj__page--on { background: var(--jb-d-accent); color: var(--jb-d-bg); border-color: var(--jb-d-accent); }

          @media (max-width: 760px) {
            .fj { --pad: 20px; }
            .fj__head { padding: 32px var(--pad) 24px; }
            .fj__search { flex-direction: column; }
            .fj__searchbtn { width: 100%; }
            :global(.fj__card) { flex-direction: column; align-items: flex-start; gap: 14px; padding: 20px; }
            .fj__right { flex-direction: row; align-items: center; justify-content: space-between; width: 100%; }
            .fj__cta { padding: 24px; }
            :global(.fj__ctabtn) { width: 100%; justify-content: center; }
          }
        `}</style>
      </PublicLayout>
    </>
  );
}
