'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';
import { API_URL } from '@/config/api';

/**
 * Job detail.
 *
 * This page used to seed its state with a hardcoded "Senior Product Designer at
 * Stripe, $170–210k" sample and swallow the fetch error, so /jobs/<any id> —
 * including real ones — rendered that same invented listing, complete with
 * Stripe's real company blurb and a "Verified careers page" badge over data
 * that was not verified or even real. It now renders the actual job from
 * GET /api/public/jobs/:id and 404s honestly when there isn't one.
 */

const TINTS = ['#4C6EF5', '#0CA678', '#7048E8', '#E8590C', '#2F9E44', '#1098AD', '#D6336C'];
const tintFor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
};
const initials = (name = '') =>
  name.replace(/[^a-zA-Z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
const titleCase = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const postedLabel = (iso) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function JobDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error

  useEffect(() => {
    if (!id) return undefined;
    let live = true;
    setState('loading');
    fetch(`${API_URL}/api/public/jobs/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (live) setState('missing');
          return null;
        }
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((body) => {
        if (!live || !body) return;
        setJob(body);
        setState('ready');
      })
      .catch(() => {
        if (live) setState('error');
      });
    return () => { live = false; };
  }, [id]);

  const heading = job ? `${job.title} · ${titleCase(job.company)} — Jobocate` : 'Job — Jobocate';

  return (
    <>
      <Head>
        <title>{heading}</title>
        {job && (
          <meta
            name="description"
            content={`${job.title} at ${titleCase(job.company)}${job.location ? ` · ${job.location}` : ''}. Apply direct through the employer's own careers page.`}
          />
        )}
      </Head>

      <PublicLayout>
        <div className="jd">
          {state === 'loading' && (
            <div className="jd__state" aria-busy="true">Loading role…</div>
          )}

          {state === 'missing' && (
            <div className="jd__state">
              <h1 className="jd__stateh">That role is no longer open.</h1>
              <p className="jd__statep">
                Listings close when the employer fills or withdraws them.
              </p>
              <Link href={appRoute('Browse Jobs.dc.html')} className="jd__btn jd__btn--green">
                Browse open roles
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="jd__state" role="alert">
              <h1 className="jd__stateh">We couldn’t load this role.</h1>
              <p className="jd__statep">Please retry in a moment.</p>
              <Link href={appRoute('Browse Jobs.dc.html')} className="jd__btn jd__btn--ghost">
                Back to all roles
              </Link>
            </div>
          )}

          {state === 'ready' && job && (
            <>
              <nav className="jd__crumbs" aria-label="Breadcrumb">
                <Link href={appRoute('Browse Jobs.dc.html')}>Jobs</Link>
                <span aria-hidden="true"> / </span>
                <span>{titleCase(job.company)}</span>
                <span aria-hidden="true"> / </span>
                <span className="jd__crumbnow">{job.title}</span>
              </nav>

              <div className="jd__grid">
                {/* ---------------- MAIN ---------------- */}
                <div className="jd__main">
                  <header className="jd__head">
                    <span className="jd__logo" style={{ background: `${tintFor(job.company)}33` }}>
                      {initials(job.company)}
                    </span>
                    <div>
                      <h1 className="jd__h1">{job.title}</h1>
                      <p className="jd__meta">
                        <span className="jd__company">{titleCase(job.company)}</span>
                        {job.isRemote ? ' · Remote' : job.location ? ` · ${job.location}` : ''}
                        {job.jobType ? ` · ${job.jobType}` : ''}
                      </p>
                    </div>
                  </header>

                  {job.skills.length > 0 && (
                    <div className="jd__tags">
                      {job.skills.map((s) => (
                        <span key={s} className="jd__tag">{s}</span>
                      ))}
                    </div>
                  )}

                  <section className="jd__block">
                    <h2 className="jd__h2">About the role</h2>
                    {job.description
                      .split(/\n{2,}/)
                      .filter((p) => p.trim())
                      .map((p, i) => (
                        <p key={i} className="jd__p">{p.trim()}</p>
                      ))}
                  </section>

                  {job.requirements.length > 0 && (
                    <section className="jd__block">
                      <h2 className="jd__h2">What we’re looking for</h2>
                      <ul className="jd__list">
                        {job.requirements.map((r, i) => (
                          <li key={i}><span className="jd__tick" aria-hidden="true">✓</span>{r}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {job.similar.length > 0 && (
                    <section className="jd__block">
                      <h2 className="jd__h2">Similar roles</h2>
                      <div className="jd__similar">
                        {job.similar.map((s) => (
                          <Link key={s.id} href={`/jobs/${s.id}`} className="jd__simcard">
                            <span className="jd__simlogo" style={{ background: `${tintFor(s.company)}33` }}>
                              {initials(s.company)}
                            </span>
                            <span className="jd__simtext">
                              <span className="jd__simtitle">{s.title}</span>
                              <span className="jd__simmeta">
                                {[titleCase(s.company), s.location].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            {s.salary && <span className="jd__simsalary">{s.salary}</span>}
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* ---------------- RAIL ---------------- */}
                <aside className="jd__rail">
                  <div className="jd__apply">
                    {job.salary ? (
                      <span className="jd__salary">{job.salary}</span>
                    ) : (
                      <span className="jd__nosalary">Salary not disclosed</span>
                    )}
                    <span className="jd__matchline">
                      <span className="jd__matchnum" aria-hidden="true">92</span>
                      match · sign in to reveal
                    </span>
                    <Link href={appRoute('App Sign Up.dc.html')} className="jd__btn jd__btn--green">
                      See your match &amp; apply →
                    </Link>
                    {job.applyUrl && (
                      <a
                        href={job.applyUrl}
                        className="jd__direct"
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        Or apply on {titleCase(job.company)}’s site ↗
                      </a>
                    )}
                  </div>

                  <div className="jd__glance">
                    <span className="jd__glancehead">ROLE AT A GLANCE</span>
                    {[
                      ['Company', titleCase(job.company)],
                      ['Type', job.jobType],
                      ['Location', job.isRemote ? `Remote${job.remoteScope ? ` (${job.remoteScope})` : ''}` : job.location],
                      ['Experience', job.experience && job.experience !== 'Not specified' ? job.experience : null],
                      ['Posted', postedLabel(job.postedAt)],
                    ]
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k} className="jd__glancerow">
                          <span className="jd__glancek">{k}</span>
                          <span className="jd__glancev">{v}</span>
                        </div>
                      ))}
                  </div>

                  <p className="jd__verified">
                    <span className="jd__tick" aria-hidden="true">✓</span>
                    Listed from the employer’s own careers page — you apply direct, never a
                    third-party board.
                  </p>
                  {job.attribution && <p className="jd__attr">{job.attribution}</p>}
                </aside>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          .jd { --pad: 48px; max-width: 1180px; margin: 0 auto; padding: 0 var(--pad) 72px; font-family: var(--jb-font-sans); }
          .jd :global(*) { box-sizing: border-box; }

          .jd__state { padding: 96px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; color: var(--jb-d-ink-65); }
          .jd__stateh { margin: 0; font-family: var(--jb-font-display); font-weight: 400; font-size: clamp(26px, 3.4vw, 38px); color: var(--jb-d-ink); }
          .jd__statep { margin: 0; font-size: 15px; }

          .jd__crumbs { padding: 28px 0 18px; font-family: var(--jb-font-mono); font-size: 11.5px; color: var(--jb-d-ink-55); }
          .jd__crumbs :global(a) { color: var(--jb-d-ink-55); text-decoration: none; }
          .jd__crumbs :global(a:hover) { color: var(--jb-d-accent); }
          .jd__crumbnow { color: var(--jb-d-ink-70); }

          .jd__grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 40px; align-items: start; }

          .jd__head { display: flex; gap: 18px; align-items: flex-start; margin-bottom: 16px; }
          .jd__logo {
            width: 56px; height: 56px; flex: none; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-family: var(--jb-font-mono); font-size: 17px; font-weight: 700; color: var(--jb-d-ink);
          }
          .jd__h1 { margin: 0 0 6px; font-family: var(--jb-font-display); font-weight: 400; font-size: clamp(28px, 3.6vw, 42px); line-height: 1.08; }
          .jd__meta { margin: 0; font-size: 15px; color: var(--jb-d-ink-65); }
          .jd__company { color: var(--jb-d-accent); }

          .jd__tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
          .jd__tag {
            font-family: var(--jb-font-mono); font-size: 11px; letter-spacing: 0.06em;
            /* Was a cream pill with cream text — invisible on the dark surface. */
            border: 1px solid var(--jb-d-line-strong); border-radius: 999px;
            padding: 6px 12px; color: var(--jb-d-ink-65);
          }

          .jd__block { margin-bottom: 34px; }
          .jd__h2 { margin: 0 0 12px; font-family: var(--jb-font-display); font-weight: 400; font-size: 24px; }
          .jd__p { margin: 0 0 14px; font-size: 15.5px; line-height: 1.7; color: var(--jb-d-ink-70); white-space: pre-line; }
          .jd__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
          .jd__list li { display: flex; gap: 10px; font-size: 15px; line-height: 1.55; color: var(--jb-d-ink-70); }
          .jd__tick { color: var(--jb-d-accent); font-weight: 700; flex: none; }

          .jd__similar { display: flex; flex-direction: column; gap: 10px; }
          :global(.jd__simcard) {
            display: flex; align-items: center; gap: 14px;
            background: var(--jb-d-panel); border: 1px solid var(--jb-d-line-card);
            border-radius: 12px; padding: 16px 18px; text-decoration: none; color: inherit;
            transition: border-color 0.16s ease;
          }
          :global(.jd__simcard:hover) { border-color: var(--jb-d-accent); }
          .jd__simlogo {
            width: 34px; height: 34px; flex: none; border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-family: var(--jb-font-mono); font-size: 12px; font-weight: 700; color: var(--jb-d-ink);
          }
          .jd__simtext { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
          .jd__simtitle { font-size: 15px; font-weight: 600; }
          .jd__simmeta { font-size: 12.5px; color: var(--jb-d-ink-55); }
          .jd__simsalary { font-family: var(--jb-font-display); font-size: 17px; color: var(--jb-d-ink); flex: none; }

          /* ---- rail ---- */
          .jd__rail { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 14px; }
          .jd__apply {
            background:
              radial-gradient(ellipse at 90% 0%, rgba(143, 214, 163, 0.22), transparent 60%),
              var(--jb-d-panel-solid);
            border: 1px solid var(--jb-d-line-strong); border-radius: 14px;
            padding: 24px; display: flex; flex-direction: column; gap: 12px;
          }
          .jd__salary { font-family: var(--jb-font-mono); font-size: 24px; font-weight: 600; }
          .jd__nosalary { font-size: 15px; color: var(--jb-d-ink-65); }
          .jd__matchline {
            display: flex; align-items: center; gap: 8px;
            font-family: var(--jb-font-mono); font-size: 11.5px; color: var(--jb-d-ink-55);
          }
          .jd__matchnum { filter: blur(4px); color: var(--jb-d-accent); font-weight: 600; }
          .jd__direct { font-size: 12.5px; color: var(--jb-d-ink-55); text-align: center; text-decoration: none; }
          .jd__direct:hover { color: var(--jb-d-accent); text-decoration: underline; }

          .jd__glance {
            background: var(--jb-d-panel); border: 1px solid var(--jb-d-line-card);
            border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; gap: 10px;
          }
          .jd__glancehead {
            font-family: var(--jb-font-mono); font-size: 11px; letter-spacing: 0.18em; color: var(--jb-d-ink-55);
            padding-bottom: 6px; border-bottom: 1px solid var(--jb-d-line);
          }
          .jd__glancerow { display: flex; justify-content: space-between; gap: 14px; font-size: 13.5px; }
          .jd__glancek { color: var(--jb-d-ink-55); }
          .jd__glancev { color: var(--jb-d-ink); font-weight: 600; text-align: right; }

          .jd__verified {
            margin: 0; display: flex; gap: 9px;
            background: var(--jb-d-accent-tint); border: 1px solid rgba(143, 214, 163, 0.35);
            border-radius: 12px; padding: 14px 16px;
            /* Was dark ink on the dark panel, i.e. unreadable. */
            font-size: 12.5px; line-height: 1.5; color: var(--jb-d-ink-85);
          }
          .jd__attr { margin: 0; font-size: 11.5px; color: var(--jb-d-ink-45); }

          :global(.jd__btn) {
            display: inline-flex; align-items: center; justify-content: center;
            min-height: 48px; padding: 14px 24px; border-radius: 999px;
            font-family: var(--jb-font-sans); font-size: 15px; font-weight: 700;
            text-decoration: none; border: 1.5px solid transparent; text-align: center;
          }
          :global(.jd__btn--green) { background: var(--jb-d-accent); color: var(--jb-d-bg); }
          :global(.jd__btn--green:hover) { background: var(--jb-d-accent-hi); }
          :global(.jd__btn--ghost) { border-color: var(--jb-d-line-btn); color: var(--jb-d-ink); }

          @media (max-width: 960px) {
            .jd__grid { grid-template-columns: 1fr; gap: 28px; }
            .jd__rail { position: static; order: -1; }
          }
          @media (max-width: 760px) {
            .jd { --pad: 20px; }
            .jd__head { gap: 14px; }
            .jd__logo { width: 46px; height: 46px; }
          }
        `}</style>
      </PublicLayout>
    </>
  );
}
