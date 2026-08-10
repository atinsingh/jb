'use client';

import { useState, useId } from 'react';
import { useRouter } from 'next/router';
import { Container, Display, Eyebrow, Button, Pill } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';
import { PREVIEW_JOBS, PREVIEW_FILTERS } from '@/lib/homePreviewData';

/**
 * Live job discovery preview.
 *
 * The search form is real: submitting sends the visitor to /jobs with their
 * query, so this is an entry point rather than a screenshot. The result cards
 * below it are sample data (see homePreviewData.js) and are labelled as such —
 * they exist to show what matching output looks like, including the match
 * explanation, which never appears as a bare number.
 *
 * On mobile the filter row collapses into a disclosure so it does not push the
 * results off-screen.
 */

const WEIGHT_LABEL = { strong: 'Strong', medium: 'Partial', weak: 'Weak' };

function MatchFactors({ job, open, onToggle, panelId, btnId }) {
  return (
    <div className="mf">
      <button
        type="button"
        id={btnId}
        className="mf__btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        Why this matches
        <svg className={`mf__chev ${open ? 'is-open' : ''}`} width="10" height="7" viewBox="0 0 10 7" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <div id={panelId} role="region" aria-labelledby={btnId} hidden={!open} className="mf__panel">
        <ul className="mf__list">
          {job.factors.map((f) => (
            <li key={f.label} className="mf__row">
              <span className={`mf__dot mf__dot--${f.weight}`} aria-hidden="true" />
              <span className="mf__label">{f.label}</span>
              <span className="mf__detail">{f.detail}</span>
              {/* Weight is spelled out, never signalled by colour alone. */}
              <span className={`mf__weight mf__weight--${f.weight}`}>{WEIGHT_LABEL[f.weight]}</span>
            </li>
          ))}
        </ul>
      </div>

      <style jsx>{`
        .mf__btn {
          appearance: none;
          background: none;
          border: none;
          padding: 8px 0;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-base);
          font-weight: 700;
          color: var(--jb-accent-text);
          cursor: pointer;
        }
        .mf__btn:hover {
          text-decoration: underline;
        }
        .mf__btn:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .mf__chev {
          transition: transform var(--jb-dur) var(--jb-ease);
        }
        .mf__chev.is-open {
          transform: rotate(180deg);
        }
        .mf__panel {
          padding-top: 4px;
        }
        .mf__list {
          list-style: none;
          margin: 0;
          padding: 10px 12px;
          background: var(--jb-surface-sunk);
          border-radius: var(--jb-radius);
          display: grid;
          gap: 8px;
        }
        .mf__row {
          display: grid;
          grid-template-columns: 8px 80px 1fr auto;
          align-items: center;
          gap: 8px;
          font-size: var(--jb-text-base);
        }
        .mf__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .mf__dot--strong {
          background: var(--jb-accent-text);
        }
        .mf__dot--medium {
          background: var(--jb-warn-text);
        }
        .mf__dot--weak {
          background: var(--jb-ink-subtle);
        }
        .mf__label {
          font-weight: 700;
          color: var(--jb-ink);
        }
        .mf__detail {
          color: var(--jb-ink-muted);
        }
        .mf__weight {
          font-size: var(--jb-text-xs);
          font-weight: 700;
        }
        .mf__weight--strong {
          color: var(--jb-accent-text);
        }
        .mf__weight--medium {
          color: var(--jb-warn-text);
        }
        .mf__weight--weak {
          color: var(--jb-ink-subtle);
        }
        @media (max-width: 560px) {
          .mf__row {
            grid-template-columns: 8px 1fr auto;
          }
          .mf__detail {
            grid-column: 2 / -1;
          }
        }
      `}</style>
    </div>
  );
}

function JobCard({ job }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const uid = useId();

  return (
    <li className="card">
      <div className="card__head">
        <span className="card__logo" aria-hidden="true">
          {job.initials}
        </span>
        <div className="card__id">
          <div className="card__emprow">
            <span className="card__emp">{job.employer}</span>
            {job.verified ? (
              <Pill tone="verified" icon="✓">
                Verified employer
              </Pill>
            ) : (
              <Pill tone="warn" icon="!">
                Not yet verified
              </Pill>
            )}
          </div>
          <h3 className="card__title">{job.title}</h3>
        </div>
        <div className="card__match">
          <span className="card__matchn">{job.match}%</span>
          <span className="card__matchl">match</span>
        </div>
      </div>

      <ul className="card__meta">
        <li>{job.location}</li>
        <li>{job.workplace}</li>
        <li>{job.type}</li>
        <li>{job.salary ?? 'Salary not published'}</li>
        <li>{job.posted}</li>
      </ul>

      <MatchFactors
        job={job}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        panelId={`${uid}-panel`}
        btnId={`${uid}-btn`}
      />

      <div className="card__actions">
        <Button href={appRoute('Public Job.dc.html')} variant="secondary" size="sm">
          View job
        </Button>
        <Button href={appRoute('App Apply.dc.html')} variant="primary" size="sm">
          Quick apply
        </Button>
        <button
          type="button"
          className={`card__save ${saved ? 'is-saved' : ''}`}
          aria-pressed={saved}
          onClick={() => setSaved((v) => !v)}
        >
          <span aria-hidden="true">{saved ? '★' : '☆'}</span>
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <style jsx>{`
        .card {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
        }
        .card__head {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .card__logo {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: var(--jb-surface-alt);
          color: var(--jb-ink);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }
        .card__id {
          flex: 1;
          min-width: 0;
        }
        .card__emprow {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .card__emp {
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-muted);
        }
        .card__title {
          margin: 0;
          font-size: var(--jb-text-lg);
          font-weight: 700;
          line-height: 1.3;
        }
        .card__match {
          text-align: right;
          flex-shrink: 0;
        }
        .card__matchn {
          display: block;
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-lg);
          font-weight: 600;
          color: var(--jb-accent-text);
        }
        .card__matchl {
          display: block;
          font-size: var(--jb-text-xs);
          color: var(--jb-ink-subtle);
        }
        .card__meta {
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 6px 14px;
          margin: 12px 0 4px;
          padding: 0;
          font-size: var(--jb-text-base);
          color: var(--jb-ink-muted);
        }
        .card__meta li {
          position: relative;
        }
        .card__meta li + li::before {
          content: '·';
          position: absolute;
          left: -9px;
        }
        .card__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .card__save {
          appearance: none;
          background: none;
          border: 1px solid var(--jb-border-strong);
          border-radius: var(--jb-radius-pill);
          min-height: 44px;
          padding: 10px 16px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-body);
          cursor: pointer;
          margin-left: auto;
          transition: border-color var(--jb-dur) var(--jb-ease), background-color var(--jb-dur) var(--jb-ease);
        }
        .card__save:hover {
          border-color: var(--jb-ink);
        }
        .card__save.is-saved {
          background: var(--jb-tint-green);
          border-color: rgba(21, 122, 73, 0.4);
          color: var(--jb-accent-text);
        }
        .card__save:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
        }
        @media (max-width: 560px) {
          .card__save {
            margin-left: 0;
            width: 100%;
            justify-content: center;
          }
          .card__actions :global(.jb-btn) {
            flex: 1;
          }
        }
      `}</style>
    </li>
  );
}

export default function JobDiscovery() {
  const router = useRouter();
  const uid = useId();
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (loc.trim()) params.set('location', loc.trim());
    const qs = params.toString();
    router.push(qs ? `${appRoute('Browse Jobs.dc.html')}?${qs}` : appRoute('Browse Jobs.dc.html'));
  };

  return (
    <section className="disc" id="find-jobs" aria-labelledby="disc-h">
      <Container>
        <div className="disc__head">
          <Eyebrow>Live job discovery</Eyebrow>
          <Display level={2} id="disc-h">
            Search real openings. See why each one fits.
          </Display>
          <p className="disc__lead">
            Filter the way you actually think about a job — then open any match to see the factors behind
            the score.
          </p>
        </div>

        <form className="search" onSubmit={submit} role="search">
          <div className="search__row">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-q`}>
                Keyword or job title
              </label>
              <input
                id={`${uid}-q`}
                className="field__input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. Product Designer"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-loc`}>
                Location
              </label>
              <input
                id={`${uid}-loc`}
                className="field__input"
                type="text"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="City or “Remote”"
              />
            </div>
            <Button type="submit" variant="primary" size="lg">
              Search jobs
            </Button>
          </div>

          <button
            type="button"
            className="search__toggle"
            aria-expanded={filtersOpen}
            aria-controls={`${uid}-filters`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {filtersOpen ? 'Hide filters' : 'All filters'}
          </button>

          <div id={`${uid}-filters`} className={`filters ${filtersOpen ? 'is-open' : ''}`}>
            {Object.entries(PREVIEW_FILTERS).map(([key, opts]) => (
              <div key={key} className="field">
                <label className="field__label" htmlFor={`${uid}-${key}`}>
                  {key === 'posted' ? 'Date posted' : key === 'type' ? 'Employment type' : key}
                </label>
                <select id={`${uid}-${key}`} className="field__input" defaultValue={opts[0]}>
                  {opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="field field--check">
              <input id={`${uid}-verified`} type="checkbox" className="field__check" />
              <label htmlFor={`${uid}-verified`} className="field__checklabel">
                Verified employers only
              </label>
            </div>
            <div className="field field--check">
              <input id={`${uid}-visa`} type="checkbox" className="field__check" />
              <label htmlFor={`${uid}-visa`} className="field__checklabel">
                Offers visa sponsorship
              </label>
            </div>
          </div>
        </form>

        <p className="disc__sample">
          Sample results — showing how matches are explained. <a href={appRoute('Browse Jobs.dc.html')}>Browse live jobs →</a>
        </p>

        <ul className="disc__results">
          {PREVIEW_JOBS.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      </Container>

      <style jsx>{`
        .disc {
          background: var(--jb-surface-alt);
          border-top: 1px solid var(--jb-border);
          border-bottom: 1px solid var(--jb-border);
          padding-block: clamp(56px, 7vw, 88px);
        }
        .disc__head {
          max-width: 620px;
          margin-bottom: var(--jb-space-8);
        }
        .disc__lead {
          margin: 0;
          font-size: var(--jb-text-md);
          line-height: 1.6;
          color: var(--jb-ink-muted);
        }
        .search {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
          margin-bottom: var(--jb-space-6);
        }
        .search__row {
          display: grid;
          grid-template-columns: 1.4fr 1fr auto;
          gap: var(--jb-space-3);
          align-items: end;
        }
        .field__label {
          display: block;
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-body);
          margin-bottom: 6px;
          text-transform: capitalize;
        }
        .field__input {
          width: 100%;
          min-height: 48px;
          padding: 12px 14px;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-base);
          color: var(--jb-ink);
          background: var(--jb-surface);
          border: 1px solid var(--jb-border-strong);
          border-radius: var(--jb-radius);
        }
        .field__input:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 1px;
          border-color: var(--jb-accent-strong);
        }
        .field--check {
          display: flex;
          align-items: center;
          gap: 8px;
          align-self: end;
          min-height: 44px;
        }
        .field__check {
          width: 20px;
          height: 20px;
          accent-color: var(--jb-accent-strong);
        }
        .field__checklabel {
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-body);
        }
        .search__toggle {
          appearance: none;
          background: none;
          border: none;
          margin-top: var(--jb-space-4);
          padding: 8px 0;
          min-height: 44px;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-sm);
          font-weight: 700;
          color: var(--jb-accent-text);
          cursor: pointer;
          text-decoration: underline;
        }
        .search__toggle:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .filters {
          display: none;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
          gap: var(--jb-space-4);
          padding-top: var(--jb-space-4);
          border-top: 1px solid var(--jb-border-soft);
        }
        .filters.is-open {
          display: grid;
        }
        .disc__sample {
          margin: 0 0 var(--jb-space-4);
          font-size: var(--jb-text-base);
          color: var(--jb-ink-muted);
        }
        .disc__sample a {
          color: var(--jb-accent-text);
          font-weight: 700;
        }
        .disc__results {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: var(--jb-space-4);
        }

        @media (max-width: 900px) {
          .search__row {
            grid-template-columns: 1fr;
          }
          .search__row :global(.jb-btn) {
            width: 100%;
          }
          .filters {
            grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
          }
        }
        @media (max-width: 560px) {
          .filters {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
