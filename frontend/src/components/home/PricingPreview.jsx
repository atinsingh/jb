'use client';

import { useState, useId } from 'react';
import { Container, Display, Eyebrow, Button, Pill } from '@/components/site/primitives';
import { appRoute } from '@/components/app/appRoutes';
import { CANDIDATE_PRICING, EMPLOYER_PRICING, ANNUAL_SAVING_NOTE, priceFor } from '@/lib/pricing';

/**
 * Pricing preview — two paths.
 *
 * Candidate amounts come from lib/pricing.js, the same module /pricing reads,
 * so the two pages cannot drift. Employer pricing shows no amount: the billing
 * service has no real employer amounts configured, so inventing one here would
 * be a fabricated claim. It links to the employer pricing page instead.
 */

export default function PricingPreview() {
  const [annual, setAnnual] = useState(false);
  const uid = useId();
  const tiers = [CANDIDATE_PRICING.free, CANDIDATE_PRICING.pro, CANDIDATE_PRICING.premium];

  return (
    <section className="pp" id="pricing" aria-labelledby="pp-h">
      <Container>
        <div className="pp__head">
          <Eyebrow>Pricing</Eyebrow>
          <Display level={2} id="pp-h">
            Free to start, on both sides
          </Display>
          <p className="pp__lead">
            Candidates can search, build a profile, and apply without paying. Employers pay per job or by
            subscription.
          </p>
        </div>

        <div className="pp__grid">
          <div className="pp__col">
            <div className="pp__colhead">
              <h3 className="pp__coltitle">For candidates</h3>
              <div className="toggle">
                <span id={`${uid}-bl`} className="toggle__label">
                  Billing
                </span>
                <div className="toggle__group" role="group" aria-labelledby={`${uid}-bl`}>
                  <button
                    type="button"
                    className={`toggle__btn ${!annual ? 'is-on' : ''}`}
                    aria-pressed={!annual}
                    onClick={() => setAnnual(false)}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={`toggle__btn ${annual ? 'is-on' : ''}`}
                    aria-pressed={annual}
                    onClick={() => setAnnual(true)}
                  >
                    Annual
                  </button>
                </div>
              </div>
            </div>

            <ul className="tiers">
              {tiers.map((t) => (
                <li key={t.name} className={`tier ${t.name === 'Pro' ? 'is-pop' : ''}`}>
                  <div className="tier__top">
                    <span className="tier__name">{t.name}</span>
                    {t.name === 'Pro' && <Pill tone="verified">Most popular</Pill>}
                  </div>
                  <div className="tier__price">
                    <span className="tier__amt">{priceFor(t, annual)}</span>
                    <span className="tier__per">{t.per}</span>
                  </div>
                  {annual && t.name !== 'Free' && <span className="tier__note">{ANNUAL_SAVING_NOTE}</span>}
                  <p className="tier__tag">{t.tagline}</p>
                  <ul className="tier__f">
                    {t.highlights.map((h) => (
                      <li key={h}>
                        <span aria-hidden="true">✓</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <Button href={appRoute('Pricing.dc.html')} variant="primary" size="md">
              Compare candidate plans
            </Button>
          </div>

          <div className="pp__col pp__col--emp">
            <div className="pp__colhead">
              <h3 className="pp__coltitle">For employers</h3>
            </div>

            <div className="emp">
              <p className="emp__sum">{EMPLOYER_PRICING.summary}</p>
              <ul className="emp__f">
                {EMPLOYER_PRICING.highlights.map((h) => (
                  <li key={h}>
                    <span aria-hidden="true">✓</span>
                    {h}
                  </li>
                ))}
              </ul>
              {/* No amount shown: employer billing is not finalized, and a
                  placeholder number here would be an invented claim. */}
              <p className="emp__note">
                Team features and volume options depend on how you hire — see the plans for current
                options.
              </p>
              <Button href={appRoute('Employer Pricing.dc.html')} variant="employer" size="md">
                {EMPLOYER_PRICING.ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </Container>

      <style jsx>{`
        .pp {
          background: var(--jb-ivory);
          padding-block: clamp(56px, 7vw, 88px);
        }
        .pp__head {
          max-width: 620px;
          margin-bottom: var(--jb-space-10);
        }
        .pp__lead {
          margin: 0;
          font-size: var(--jb-text-md);
          line-height: 1.6;
          color: var(--jb-ink-muted);
        }
        .pp__grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: var(--jb-space-8);
          align-items: start;
        }
        .pp__colhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--jb-space-4);
          flex-wrap: wrap;
          margin-bottom: var(--jb-space-5);
          min-height: 44px;
        }
        .pp__coltitle {
          margin: 0;
          font-size: var(--jb-text-lg);
          font-weight: 700;
        }
        .toggle {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .toggle__label {
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
        .toggle__group {
          display: inline-flex;
          gap: 2px;
          padding: 3px;
          background: var(--jb-surface-alt);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-pill);
        }
        .toggle__btn {
          appearance: none;
          border: none;
          background: none;
          font-family: var(--jb-font-sans);
          font-size: var(--jb-text-sm);
          font-weight: 600;
          color: var(--jb-ink-muted);
          padding: 8px 14px;
          min-height: 40px;
          border-radius: var(--jb-radius-pill);
          cursor: pointer;
        }
        .toggle__btn.is-on {
          background: var(--jb-ink);
          color: var(--jb-ivory);
        }
        .toggle__btn:focus-visible {
          outline: 3px solid var(--jb-accent-strong);
          outline-offset: 2px;
        }

        .tiers {
          list-style: none;
          margin: 0 0 var(--jb-space-6);
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
          gap: var(--jb-space-3);
        }
        .tier {
          background: var(--jb-surface);
          border: 1px solid var(--jb-border);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
        }
        .tier.is-pop {
          border-color: var(--jb-accent-strong);
          border-width: 2px;
        }
        .tier__top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: var(--jb-space-3);
        }
        .tier__name {
          font-size: var(--jb-text-base);
          font-weight: 700;
        }
        .tier__price {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .tier__amt {
          font-family: var(--jb-font-display);
          font-size: clamp(26px, 5vw, 40px);
          line-height: 1;
        }
        .tier__per {
          font-size: var(--jb-text-sm);
          color: var(--jb-ink-muted);
        }
        .tier__note {
          display: block;
          margin-top: 4px;
          font-size: var(--jb-text-xs);
          color: var(--jb-accent-text);
          font-weight: 600;
        }
        .tier__tag {
          margin: var(--jb-space-3) 0 var(--jb-space-4);
          font-size: var(--jb-text-base);
          line-height: 1.5;
          color: var(--jb-ink-muted);
        }
        .tier__f,
        .emp__f {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 7px;
        }
        .tier__f li,
        .emp__f li {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: var(--jb-text-base);
          color: var(--jb-ink-body);
        }
        .tier__f span,
        .emp__f span {
          color: var(--jb-accent-text);
          font-weight: 700;
          flex-shrink: 0;
        }

        .emp {
          background: var(--jb-employer-tint);
          border: 1px solid rgba(35, 64, 158, 0.2);
          border-radius: var(--jb-radius-lg);
          padding: var(--jb-space-5);
        }
        .emp__sum {
          margin: 0 0 var(--jb-space-4);
          font-size: var(--jb-text-base);
          font-weight: 700;
          color: var(--jb-ink);
        }
        .emp__f {
          margin-bottom: var(--jb-space-4);
        }
        .emp__f span {
          color: var(--jb-employer-text);
        }
        .emp__note {
          margin: 0 0 var(--jb-space-5);
          font-size: var(--jb-text-base);
          line-height: 1.5;
          color: var(--jb-ink-muted);
        }

        @media (max-width: 1024px) {
          .pp__grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .tiers {
            grid-template-columns: 1fr;
          }
          .pp__grid :global(.jb-btn) {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
