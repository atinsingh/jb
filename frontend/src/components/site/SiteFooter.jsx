'use client';

import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';
import Logo from '@/components/brand/Logo';

/**
 * Marketing footer — shared by every public page.
 *
 * Rebuilt into the six-group IA (Candidates / Employers / Product / Resources /
 * Company / Trust & Legal). Every link resolves to a route that exists: the
 * previous version pointed several items at href="#" and asked appRoute() for
 * 'Application Tracker.dc.html', which is absent from the map and silently fell
 * back to /app.
 *
 * Deliberately omitted:
 *   - "Accessibility" — no such page exists yet; a dead link is worse than none.
 *   - Newsletter signup — there is no subscribe endpoint, so there would be no
 *     working success/error state to honour.
 * Add either back once the route/endpoint lands.
 */

const COLUMNS = [
  {
    heading: 'Candidates',
    links: [
      { label: 'Find Jobs', dc: 'Browse Jobs.dc.html' },
      { label: 'Resume Builder', dc: 'Resume Builder.dc.html' },
      { label: 'Auto-Apply', dc: 'Auto-Apply.dc.html' },
      { label: 'Application Tracker', dc: 'App Tracker.dc.html' },
      { label: 'Interview Preparation', dc: 'Interview Prep.dc.html' },
    ],
  },
  {
    heading: 'Employers',
    links: [
      { label: 'Post a Job', dc: 'Employer Post Job.dc.html' },
      { label: 'Candidate Search', dc: 'Employer Talent Pool.dc.html' },
      { label: 'AI Candidate Matching', dc: 'Employer Sourcing Agent.dc.html' },
      { label: 'Hiring Pipeline', dc: 'Employer Candidates.dc.html' },
      { label: 'Employer Pricing', dc: 'Employer Pricing.dc.html' },
    ],
  },
  {
    heading: 'Product',
    links: [
      { label: 'Job Matching', dc: 'Job Matching.dc.html' },
      { label: 'Cover Letters', dc: 'Cover Letters.dc.html' },
      { label: 'Pricing', dc: 'Pricing.dc.html' },
      { label: 'Enterprise', dc: 'Enterprise.dc.html' },
      { label: 'Book a demo', dc: 'Book Demo.dc.html' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', dc: 'Blog.dc.html' },
      { label: 'Help Center', dc: 'App Help Center.dc.html' },
      { label: 'Sitemap', href: '/sitemap' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', dc: 'About.dc.html' },
      { label: 'Contact', href: '/contact' },
      { label: 'For Employers', dc: 'For Employers.dc.html' },
    ],
  },
  {
    heading: 'Trust & Legal',
    links: [
      // Anchor verified: HomeBoardingPass renders id="responsible-ai" on the
      // FAQ section, which is where the consent / verification / data-sharing
      // answers live.
      { label: 'Responsible AI', href: '/#responsible-ai' },
      { label: 'Report a job', href: '/contact' },
      { label: 'Security', dc: 'Security.dc.html' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookie settings', href: '/cookies' },
      { label: 'GDPR', href: '/gdpr' },
    ],
  },
];

const hrefFor = (link) => link.href || appRoute(link.dc);

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="jb jbfoot" aria-labelledby="jbfoot-heading">
      <h2 id="jbfoot-heading" className="jb-sr">
        Site footer
      </h2>

      <div className="jbfoot__inner">
        <div className="jbfoot__top">
          <div className="jbfoot__brand">
            <Link href={appRoute('Jobocate Home.dc.html')} className="jbfoot__logo" aria-label="Jobocate home">
              <Logo theme="dark" />
            </Link>
            <p className="jbfoot__blurb">
              An AI career and hiring platform. Candidates stay in control of every application; employers
              reach better-matched people faster.
            </p>
          </div>

          <nav className="jbfoot__cols" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="jbfoot__col">
                <h3 className="jbfoot__head">{col.heading}</h3>
                <ul className="jbfoot__list">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={hrefFor(link)} className="jbfoot__link">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="jbfoot__bottom">
          <p className="jbfoot__copy">© {year} Jobocate. All rights reserved.</p>
          <p className="jbfoot__note">
            Jobocate uses AI to assist applications and ranking. People make the final decisions.
          </p>
        </div>
      </div>

      {/*
        `global` is required, not stylistic: the footer is almost entirely
        <Link> elements, and styled-jsx does not attach its scope class to
        custom components — a plain `<style jsx>` block leaves every link
        unstyled. All selectors are prefixed `jbfoot__`, so global scope cannot
        collide with the rest of the app.
      */}
      <style jsx global>{`
        .jbfoot {
          background: var(--jb-dark);
          color: var(--jb-on-dark);
          font-family: var(--jb-font-sans);
        }
        .jbfoot__inner {
          max-width: var(--jb-maxw);
          margin: 0 auto;
          padding: clamp(48px, 6vw, 72px) var(--jb-gutter) var(--jb-space-8);
        }
        .jbfoot__top {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: var(--jb-space-16);
        }
        .jbfoot__logo {
          font-family: var(--jb-font-display);
          font-weight: 400;
          font-size: 24px;
          letter-spacing: -0.02em;
          color: var(--jb-on-dark);
          text-decoration: none;
        }
        .jbfoot__logo span {
          color: var(--jb-accent-on-dark);
        }
        .jbfoot__blurb {
          margin: var(--jb-space-4) 0 0;
          font-size: var(--jb-text-base);
          line-height: 1.6;
          color: var(--jb-on-dark-muted);
          max-width: 34ch;
        }
        .jbfoot__cols {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: var(--jb-space-6);
        }
        .jbfoot__head {
          font-family: var(--jb-font-mono);
          font-size: var(--jb-text-xs);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--jb-accent-on-dark);
          margin: 0 0 var(--jb-space-4);
        }
        .jbfoot__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
        }
        /* 44px minimum, matching what SiteNav already enforces on its own
           links. These 29 links previously sat at ~35px of hit area, which is
           under every touch-target guideline and under the design system's own
           rule — the densest link list in the product was the one place it was
           not applied. */
        .jbfoot__link {
          display: flex;
          align-items: center;
          min-height: 44px;
          padding: 6px 0;
          font-size: var(--jb-text-base);
          line-height: 1.35;
          color: var(--jb-on-dark-muted);
          text-decoration: none;
          transition: color var(--jb-dur) var(--jb-ease);
        }
        .jbfoot__link:hover {
          color: var(--jb-on-dark);
          text-decoration: underline;
        }
        .jbfoot__link:focus-visible {
          outline: 3px solid var(--jb-accent-on-dark);
          outline-offset: 2px;
          border-radius: 4px;
        }
        .jbfoot__bottom {
          margin-top: var(--jb-space-12);
          padding-top: var(--jb-space-6);
          border-top: 1px solid var(--jb-dark-border);
          display: flex;
          justify-content: space-between;
          gap: var(--jb-space-4);
          flex-wrap: wrap;
        }
        .jbfoot__copy,
        .jbfoot__note {
          margin: 0;
          font-size: var(--jb-text-sm);
          color: var(--jb-on-dark-muted);
        }

        @media (max-width: 1080px) {
          .jbfoot__top {
            grid-template-columns: 1fr;
            gap: var(--jb-space-10);
          }
          .jbfoot__cols {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: var(--jb-space-8);
          }
        }
        @media (max-width: 640px) {
          .jbfoot__cols {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .jbfoot__blurb {
            max-width: none;
          }
        }
        @media (max-width: 380px) {
          .jbfoot__cols {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
}
