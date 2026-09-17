'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from '@/components/brand/Logo';
import useJbTheme from '@/components/theme/useJbTheme';
import { useAuth } from '@/context/AuthContext';

/**
 * The candidate app shell, ported from "Jobocate Candidate v3.dc.html".
 *
 *   top bar (56px, --bg, hairline under)
 *     wordmark | GROUP GROUP GROUP ... | theme toggle
 *     Groups are DM Mono 10.5px / .14em / uppercase. The active group is
 *     bright ink with a 1px accent rule sitting on the bar's bottom edge;
 *     the rest are dim with a transparent rule, so nothing shifts on change.
 *
 *   left panel — only when the group has >1 leaf; it holds the active
 *     group's leaves and collapses behind a button on narrow screens.
 *
 * The top bar stays in the existing 1360px column with 28px side padding.
 *
 * Source: lines 66-88 of the artboard.
 */

/*
 * The design's screen graph, mapped onto this app's routes.
 *
 * `leaves` is ordered as the artboard orders them — the first leaf is where
 * the group label itself navigates to. A leaf with `href: null` is a screen
 * v3 designs that this app has no route for yet; it renders disabled rather
 * than linking somewhere that does not exist or, worse, being silently
 * dropped so the gap stops being visible.
 */
export const NAV_GROUPS = [
  {
    id: 'dash',
    label: 'Dash',
    leaves: [{ id: 'dash', label: 'Dashboard', href: '/app/dashboard' }],
  },
  {
    id: 'matches',
    label: 'Matches',
    leaves: [
      { id: 'matches', label: 'Matches', href: '/app/matches' },
      { id: 'auto', label: 'Auto-apply', href: '/app/auto-apply' },
    ],
  },
  {
    id: 'track',
    label: 'Applications',
    leaves: [
      { id: 'apps', label: 'Applications', href: '/app/tracker' },
      { id: 'saved', label: 'Saved', href: '/app/saved' },
      { id: 'offers', label: 'Offers', href: '/app/offers' },
    ],
  },
  {
    id: 'docs',
    label: 'Documents',
    leaves: [
      { id: 'resume', label: 'Résumé', href: '/app/resume' },
      // v3 calls this "Import". It points straight at the library: the old
      // /app/resume-builder redirect stub has been deleted along with the
      // separate generator screens.
      { id: 'upload', label: 'Import', href: '/app/resume-library' },
      { id: 'letter', label: 'Cover letter', href: '/app/cover-letter' },
      { id: 'profiles', label: 'Job profiles', href: '/app/job-profiles' },
    ],
  },
  {
    id: 'practice',
    label: 'Practice',
    leaves: [
      { id: 'prep', label: 'Interview prep', href: '/app/interview' },
      { id: 'buddy', label: 'Session', href: '/app/mock-interview' },
      { id: 'concierge', label: 'Concierge', href: '/app/concierge' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    leaves: [
      // v3 has a distinct "Profile" screen; this app folds it into settings.
      { id: 'profile', label: 'Profile', href: '/app/preferences' },
      { id: 'settings', label: 'Settings', href: '/app/settings' },
      { id: 'billing', label: 'Billing', href: '/app/billing' },
    ],
  },
];

/** Longest-prefix match, so /app/tracker and /app/tracker/123 both resolve. */
function locate(pathname) {
  let best = null;
  for (const group of NAV_GROUPS) {
    for (const leaf of group.leaves) {
      if (!leaf.href) continue;
      const hit = pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);
      if (hit && (!best || leaf.href.length > best.leaf.href.length)) best = { group, leaf };
    }
  }
  return best;
}

const SHELL = { maxWidth: 1360, margin: '0 auto', padding: '0 28px' };

const MONO = {
  fontFamily: 'var(--jb-v3-font-mono)',
  textTransform: 'uppercase',
};

export default function AppTopNav() {
  const { pathname } = useRouter();
  const { theme, toggle } = useJbTheme();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sectionNavOpen, setSectionNavOpen] = useState(false);

  const here = locate(pathname);
  const activeGroup = here?.group;
  const activeLeaf = here?.leaf;
  const tabs = activeGroup?.leaves || [];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header
      className="app-v3-header"
      data-subnav={tabs.length > 1 ? 'true' : 'false'}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--jb-v3-bg)',
        borderBottom: '1px solid var(--jb-v3-line)',
      }}
    >
      <div className="app-v3-primary-row" style={{ ...SHELL, height: 56, display: 'flex', alignItems: 'center', gap: 34 }}>
        <Link
          href="/app/dashboard"
          aria-label="Jobocate"
          style={{ display: 'flex', alignItems: 'center', flex: 'none', color: 'var(--jb-v3-fg)' }}
        >
          <Logo size={22} />
        </Link>

        <nav
          aria-label="Sections"
          className="app-v3-sections"
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}
        >
          {NAV_GROUPS.map((group) => {
            const on = group.id === activeGroup?.id;
            const target = group.leaves.find((l) => l.href);
            return (
              <Link
                key={group.id}
                href={target ? target.href : '#'}
                aria-current={on ? 'page' : undefined}
                style={{
                  ...MONO,
                  padding: '8px 12px 7px',
                  fontSize: 10.5,
                  letterSpacing: '0.14em',
                  // The rule is always present and only changes colour, so the
                  // row does not reflow by a pixel when the section changes.
                  borderBottom: `1px solid ${on ? 'var(--jb-v3-accent)' : 'transparent'}`,
                  color: on ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)',
                  transition: 'color .2s ease, border-color .2s ease',
                }}
              >
                {group.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          {tabs.length > 1 && (
            <button
              type="button"
              className="app-v3-nav-toggle"
              aria-label={sectionNavOpen ? 'Close section navigation' : 'Open section navigation'}
              aria-expanded={sectionNavOpen}
              onClick={() => setSectionNavOpen((open) => !open)}
            >
              ☰
            </button>
          )}
          <button
            type="button"
            onClick={toggle}
            style={{
              ...MONO,
              background: 'none',
              border: '1px solid var(--jb-v3-line-2)',
              borderRadius: 2,
              padding: '5px 10px',
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--jb-v3-fg-2)',
              cursor: 'pointer',
            }}
          >
            {theme === 'light' ? 'Light' : 'Dark'}
          </button>
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Log out"
              style={{
                ...MONO,
                background: 'none',
                border: '1px solid var(--jb-v3-line-2)',
                borderRadius: 2,
                padding: '5px 10px',
                fontSize: 10,
                letterSpacing: '0.12em',
                color: 'var(--jb-v3-fg-2)',
                cursor: loggingOut ? 'default' : 'pointer',
                opacity: loggingOut ? 0.6 : 1,
              }}
            >
              Log out
            </button>
          )}
        </div>
      </div>

      {tabs.length > 1 && (
        <nav
          aria-label={`${activeGroup.label} navigation`}
          className={`app-v3-side-nav${sectionNavOpen ? ' is-open' : ''}`}
        >
            {tabs.map((leaf) => {
              const on = leaf.id === activeLeaf?.id;
              if (!leaf.href) {
                return (
                  <span
                    key={leaf.id}
                    title="Designed in v3, not built yet"
                    className="app-v3-side-link is-disabled"
                  >
                    {leaf.label}
                  </span>
                );
              }
              return (
                <Link
                  key={leaf.id}
                  href={leaf.href}
                  aria-current={on ? 'page' : undefined}
                  className="app-v3-side-link"
                  onClick={() => setSectionNavOpen(false)}
                >
                  {leaf.label}
                </Link>
              );
            })}
        </nav>
      )}
      <style jsx global>{`
        div:has(> .app-v3-header[data-subnav='true']) {
          display: grid;
          grid-template-columns: 184px minmax(0, 1fr);
        }
        div:has(> .app-v3-header[data-subnav='true']) > .app-v3-header { grid-column: 1 / -1; }
        div:has(> .app-v3-header[data-subnav='true']) > :not(.app-v3-header) {
          grid-column: 2;
          min-width: 0;
        }
        .app-v3-side-nav {
          position: fixed;
          top: 56px;
          bottom: 0;
          left: 0;
          z-index: 31;
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 184px;
          padding: 20px 12px;
          overflow-y: auto;
          background: var(--jb-v3-sunk);
          border-right: 1px solid var(--jb-v3-line);
        }
        .app-v3-side-link {
          display: block;
          padding: 10px 12px;
          color: var(--jb-v3-fg-3);
          font-size: 12.5px;
          text-decoration: none;
        }
        .app-v3-side-link[aria-current='page'] {
          color: var(--jb-v3-fg);
          background: var(--jb-v3-panel);
          border-left: 2px solid var(--jb-v3-accent);
          padding-left: 10px;
        }
        .app-v3-side-link.is-disabled { opacity: 0.5; }
        .app-v3-nav-toggle { display: none; }
        @media (max-width: 720px) {
          div:has(> .app-v3-header[data-subnav='true']) { display: block; }
          .app-v3-primary-row { gap: 8px !important; padding: 0 12px !important; }
          .app-v3-sections { min-width: 0; overflow-x: auto; white-space: nowrap; }
          .app-v3-nav-toggle {
            display: block;
            padding: 5px 9px;
            border: 1px solid var(--jb-v3-line-2);
            color: var(--jb-v3-fg);
            background: none;
            cursor: pointer;
          }
          .app-v3-side-nav { display: none; width: min(240px, calc(100vw - 48px)); }
          .app-v3-side-nav.is-open { display: flex; }
        }
      `}</style>
    </header>
  );
}

/** The 1360/28 column every v3 screen body sits in. */
export function AppShell({ children, style }) {
  return <div style={{ ...SHELL, padding: '40px 28px 80px', ...style }}>{children}</div>;
}
