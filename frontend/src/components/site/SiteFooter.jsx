'use client';

import Link from 'next/link';
import Logo from '@/components/brand/Logo';

/**
 * Marketing footer - one hairline row.
 *
 * The v3 design bundle has no footer: every public artboard ends on a bare
 * hairline rule. This is therefore designed *to* the v3 language rather than
 * copied from an artboard - a single strip of mono links, matching the
 * hairline-first treatment used on the page bodies.
 *
 * It replaces 28 links across 6 columns. Three real defects went with them:
 *
 *   1. Six links pointed at auth-gated routes (/app/tracker, /app/help,
 *      /employer/jobs/post, /employer/talent-pool, /employer/sourcing,
 *      /employer/candidates). A logged-out visitor clicking any of them was
 *      pushed to the login wall. Nothing here is gated.
 *   2. "Responsible AI" linked to /#responsible-ai. The element carrying that
 *      id lived in HomeBoardingPass, which the homepage rebuild deleted, so it
 *      loaded the homepage and jumped nowhere.
 *   3. "Post a job" resolved to the gated /employer/jobs/post here while the
 *      nav sent the same label to public /employers. One destination now.
 *
 * The footer also used to hardcode a dark ground and pass Logo theme="dark"
 * unconditionally, so it stayed dark while the nav flipped to light. The Logo
 * now inherits its ink from the surrounding text colour, so neither this file
 * nor the nav has to tell it which theme is active.
 */

/** Every destination is public. Do not add a /app/* or /employer/* link here. */
const LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'For employers', href: '/employers' },
  { label: 'Employer pricing', href: '/employers/pricing' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'GDPR', href: '/gdpr' },
];

export default function SiteFooter() {

  return (
    <footer className="jbfoot" aria-labelledby="jbfoot-heading">
      <h2 id="jbfoot-heading" className="jb-sr">
        Site footer
      </h2>

      <div className="jbfoot__inner">
        <div className="jbfoot__row">
          <Link href="/" className="jbfoot__logo" aria-label="Jobocate home">
            <Logo size={20} style={{ color: 'var(--jb-ink-muted)' }} />
          </Link>

          <nav className="jbfoot__links" aria-label="Footer">
            {LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="jbfoot__link">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="jbfoot__bottom">
          <p className="jbfoot__meta">
            {`© ${new Date().getFullYear()} Jobocate. All rights reserved.`}
          </p>
          {/* Kept deliberately: this is a disclosure about automated ranking,
              not marketing copy. */}
          <p className="jbfoot__meta">
            Jobocate uses AI to assist applications and ranking. People make the final decisions.
          </p>
        </div>
      </div>

      {/* Global for the same reason as SiteNav: styled-jsx does not scope
          custom components, and this file is almost entirely <Link>. */}
      <style jsx global>{`
        .jbfoot {
          background: var(--jb-ivory);
          border-top: 1px solid var(--jb-border-soft);
          color: var(--jb-ink);
        }

        .jbfoot__inner {
          max-width: 1360px;
          margin: 0 auto;
          padding: 32px 28px 28px;
        }

        .jbfoot__row {
          display: flex;
          align-items: center;
          gap: 40px;
          flex-wrap: wrap;
          padding-bottom: 22px;
        }

        .jbfoot__logo {
          flex: none;
          display: flex;
          align-items: center;
        }

        .jbfoot__links {
          display: flex;
          align-items: center;
          gap: 4px 20px;
          flex-wrap: wrap;
        }

        .jbfoot__link {
          font-family: var(--jb-font-mono);
          font-size: 10.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--jb-ink-muted);
          text-decoration: none;
          /* 44px touch target, kept from the previous footer. */
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          transition: color 0.2s ease;
        }

        .jbfoot__link:hover {
          color: var(--jb-ink);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .jbfoot__bottom {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          padding-top: 18px;
          border-top: 1px solid var(--jb-border-soft);
        }

        .jbfoot__meta {
          margin: 0;
          font-family: var(--jb-font-mono);
          font-size: 9.5px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--jb-ink-subtle);
        }

        @media (max-width: 900px) {
          .jbfoot__inner {
            padding: 28px 20px 24px;
          }

          .jbfoot__row {
            gap: 20px;
          }

          .jbfoot__links {
            gap: 0 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jbfoot__link {
            transition: none;
          }
        }
      `}</style>
    </footer>
  );
}
