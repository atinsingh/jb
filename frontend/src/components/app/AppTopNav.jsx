'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from '@/components/brand/Logo';
import useJbTheme from '@/components/theme/useJbTheme';

/**
 * The candidate app shell, ported from "Jobocate Candidate v3.dc.html".
 *
 * THE DESIGN HAS NO SIDEBAR. The logged-in candidate surface navigates from a
 * two-level sticky top bar, and the 587-line AppSidebar this replaces was a
 * carry-over from the previous direction, not something v3 ever specified.
 *
 *   row 1 (56px, --bg, hairline under)
 *     wordmark | GROUP GROUP GROUP ... | theme toggle
 *     Groups are DM Mono 10.5px / .14em / uppercase. The active group is
 *     bright ink with a 1px accent rule sitting on the bar's bottom edge;
 *     the rest are dim with a transparent rule, so nothing shifts on change.
 *
 *   row 2 (40px, --sunk, hairline over) — only when the group has >1 leaf
 *     the leaves of the active group, 12.5px sans, 20px gap.
 *
 * Both rows are centred in a 1360px column with 28px side padding, which is
 * the container every v3 screen uses.
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
      // v3 calls this "Import". /app/resume-builder is only a redirect stub to
      // the library, so this points at the library directly — one hop fewer,
      // and the nav highlight resolves to a route that actually renders.
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

  const here = locate(pathname);
  const activeGroup = here?.group;
  const activeLeaf = here?.leaf;
  const tabs = activeGroup?.leaves || [];

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--jb-v3-bg)',
        borderBottom: '1px solid var(--jb-v3-line)',
      }}
    >
      <div style={{ ...SHELL, height: 56, display: 'flex', alignItems: 'center', gap: 34 }}>
        <Link
          href="/app/dashboard"
          aria-label="Jobocate"
          style={{ display: 'flex', alignItems: 'center', flex: 'none', color: 'var(--jb-v3-fg)' }}
        >
          <Logo size={22} />
        </Link>

        <nav
          aria-label="Sections"
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

        <button
          type="button"
          onClick={toggle}
          style={{
            ...MONO,
            flex: 'none',
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
      </div>

      {tabs.length > 1 && (
        <div
          style={{
            borderTop: '1px solid var(--jb-v3-line)',
            background: 'var(--jb-v3-sunk)',
          }}
        >
          <div style={{ ...SHELL, height: 40, display: 'flex', alignItems: 'center', gap: 20 }}>
            {tabs.map((leaf) => {
              const on = leaf.id === activeLeaf?.id;
              if (!leaf.href) {
                return (
                  <span
                    key={leaf.id}
                    title="Designed in v3, not built yet"
                    style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)', opacity: 0.5 }}
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
                  style={{
                    padding: '4px 0',
                    fontSize: 12.5,
                    color: on ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)',
                    transition: 'color .2s ease',
                  }}
                >
                  {leaf.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}

/** The 1360/28 column every v3 screen body sits in. */
export function AppShell({ children, style }) {
  return <div style={{ ...SHELL, padding: '40px 28px 80px', ...style }}>{children}</div>;
}
