'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/brand/Logo';
import useJbTheme from '@/components/theme/useJbTheme';

/**
 * Marketing header - the single public nav for every logged-out page.
 *
 * Rebuilt against the "Jobocate Candidate v3" artboard: a 56px bar of flat
 * mono-uppercase links with a 1px accent underline on the active section. The
 * previous build carried two flyout menus advertising 11 destinations; every
 * one of those destinations has since been deleted, so the flyouts, the mobile
 * drawer, the body-scroll lock and the focus-restore machinery all went with
 * them.
 *
 * The design's own SITE_GROUPS is Product / Pricing / About. Two entries are
 * added to that:
 *
 *   Jobs           - /jobs is a real product surface wired to the public jobs
 *                    API, not marketing filler, so it keeps a nav slot.
 *   For employers  - the employer funnel needs a logged-out entry point.
 *
 * Destinations are plain hrefs. The previous build resolved them through
 * appRoute('Some Page.dc.html'), which falls back to '/app' on a miss - and
 * there is no pages/app/index.jsx, so a typo became an invisible 404. Five
 * literal paths fail loudly instead.
 *
 * Retained from the previous build: the skip-to-content link (PublicLayout
 * renders the #main target), aria-current section matching, and the auth-aware
 * CTA that sends a signed-in user to their own surface.
 *
 * @param {'candidate'|'employer'} variant - 'employer' swaps the CTA to the
 *   hiring funnel. Both of its destinations are public routes; the old build
 *   pointed the same "Post a job" label at the gated /employer/jobs/post from
 *   the footer and the public /employers from the nav.
 */

const NAV_LINKS = [
  { label: 'Product', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'For employers', href: '/employers' },
  { label: 'Jobs', href: '/jobs' },
];

/** Where a signed-in user goes. Keep in sync with the role gate in AuthContext. */
const ROLE_HOME = {
  ROLE_CANDIDATE: { href: '/app/dashboard', label: 'Dashboard' },
  ROLE_EMPLOYER: { href: '/employer/dashboard', label: 'Hiring dashboard' },
  ROLE_AGENT: { href: '/agent/dashboard', label: 'Agent console' },
  ROLE_ADMIN: { href: '/admin/dashboard', label: 'Admin' },
};

export default function SiteNav({ variant = 'candidate' }) {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user;
  const { theme, toggle } = useJbTheme();

  const isEmployer = variant === 'employer';
  const home = ROLE_HOME[user?.role] || ROLE_HOME.ROLE_CANDIDATE;

  /**
   * Section match, not exact match, so /jobs/[id] still marks "Jobs" current.
   * '/' is special-cased: a prefix test would mark it current everywhere.
   */
  const isCurrent = useCallback(
    (href) => {
      const path = (router.pathname || '/').split('?')[0];
      if (href === '/') return path === '/';
      return path === href || path.startsWith(`${href}/`);
    },
    [router.pathname],
  );

  return (
    <header className="jbnav">
      <a className="jb-skip" href="#main">
        Skip to content
      </a>

      <div className="jbnav__bar">
        <Link href="/" className="jbnav__logo" aria-label="Jobocate home">
          <Logo size={22} style={{ color: 'var(--jb-ink)' }} />
        </Link>

        <nav className="jbnav__links" aria-label="Primary">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="jbnav__link"
              aria-current={isCurrent(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="jbnav__actions">
          {user ? (
            <Link href={home.href} className="jbnav__cta">
              {home.label}
            </Link>
          ) : (
            <>
              <Link
                href={isEmployer ? '/app/login?as=employer' : '/app/login'}
                className="jbnav__signin"
              >
                Sign in
              </Link>
              <Link
                href={isEmployer ? '/app/signup?as=employer' : '/app/signup'}
                className="jbnav__cta"
              >
                {isEmployer ? 'Post a job' : 'Start free'}
              </Link>
            </>
          )}

          {/* Outside .jbnav__actions' old hidden-on-mobile container in the
              previous build, the toggle was unreachable below 1080px. It now
              survives at every width. */}
          <button
            type="button"
            className="jbnav__theme"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Below the bar on narrow screens the same five links become one
          scrollable row, so nothing is hidden behind a menu button. */}
      <nav className="jbnav__rail" aria-label="Primary, condensed">
        {NAV_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="jbnav__link"
            aria-current={isCurrent(item.href) ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Global rather than scoped: styled-jsx does not attach its scope class
          to a custom component, and this file is almost entirely <Link>. The
          jbnav__ prefix is what keeps it from colliding. */}
      <style jsx global>{`
        .jbnav {
          position: sticky;
          top: 0;
          z-index: 40;
          background: var(--jb-nav-wash);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--jb-border-soft);
        }

        .jbnav__bar {
          max-width: 1360px;
          margin: 0 auto;
          padding: 0 28px;
          height: 56px;
          display: flex;
          align-items: center;
          gap: 34px;
        }

        .jbnav__logo {
          flex: none;
          display: flex;
          align-items: center;
        }

        .jbnav__links {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 2px;
          min-width: 0;
        }

        .jbnav__link {
          padding: 8px 12px 7px;
          font-family: var(--jb-font-mono);
          font-size: 10.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          white-space: nowrap;
          color: var(--jb-ink-muted);
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: color 0.2s ease, border-color 0.2s ease;
        }

        .jbnav__link:hover {
          color: var(--jb-ink);
        }

        /* The active state is the 1px rule, never a background pill. */
        .jbnav__link[aria-current='page'] {
          color: var(--jb-ink);
          border-bottom-color: var(--jb-v3-accent, var(--jb-accent));
        }

        .jbnav__actions {
          flex: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .jbnav__signin {
          font-family: var(--jb-font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--jb-ink-muted);
          text-decoration: none;
          padding: 6px 8px;
          transition: color 0.2s ease;
        }

        .jbnav__signin:hover {
          color: var(--jb-ink);
        }

        .jbnav__cta {
          /* Cobalt fill with white ink, per the artboard. The chrome-wide
             --jb-accent is v3's accent-FOREGROUND (#c6d2ff), chosen so link
             text passes AA on near-black; a filled button wants the real
             accent instead. Falls back for non-v3 surfaces. */
          background: var(--jb-v3-accent, var(--jb-accent));
          color: var(--jb-v3-accent-ink, var(--jb-ivory));
          border-radius: 2px;
          padding: 6px 14px;
          font-family: var(--jb-font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
          transition: transform 0.18s ease;
        }

        .jbnav__cta:hover {
          transform: translateY(-1px);
        }

        .jbnav__theme {
          background: none;
          border: 1px solid var(--jb-border-strong);
          border-radius: 2px;
          padding: 5px 10px;
          font-family: var(--jb-font-mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--jb-ink-muted);
          cursor: pointer;
          transition: border-color 0.2s ease, color 0.2s ease;
        }

        .jbnav__theme:hover {
          border-color: var(--jb-accent);
          color: var(--jb-ink);
        }

        /* Desktop shows the inline row; the rail is the narrow-screen fallback. */
        .jbnav__rail {
          display: none;
        }

        @media (max-width: 900px) {
          .jbnav__bar {
            padding: 0 20px;
            gap: 16px;
          }

          .jbnav__links {
            display: none;
          }

          .jbnav__rail {
            display: flex;
            align-items: center;
            gap: 2px;
            padding: 0 20px 6px;
            overflow-x: auto;
            scrollbar-width: none;
            border-top: 1px solid var(--jb-border-soft);
          }

          .jbnav__rail::-webkit-scrollbar {
            display: none;
          }

          .jbnav__signin {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jbnav__cta,
          .jbnav__link,
          .jbnav__theme {
            transition: none;
          }

          .jbnav__cta:hover {
            transform: none;
          }
        }
      `}</style>
    </header>
  );
}
