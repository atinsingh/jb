"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from '@/components/brand/Logo';
import useJbTheme from '@/components/theme/useJbTheme';
import { useAuth } from '@/context/AuthContext';

// V1 visibility only: other candidate routes remain available directly.
const NAV = [
  ['Dashboard', '/app/dashboard'],
  ['Resume', '/app/resume'],
  ['Library', '/app/resume-library'],
  ['Preferences', '/app/preferences'],
  ['Settings', '/app/settings'],
  ['Billing', '/app/billing'],
];

export default function AppTopNav({ items = NAV, navigationLabel = 'Candidate navigation', homeHref = '/app/resume', ...headerProps }) {
  const { pathname } = useRouter();
  const { theme, toggle } = useJbTheme();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); } catch { setLoggingOut(false); }
  };
  return (
    <header className="app-v3-header" {...headerProps}>
      <div className="candidate-nav-row">
        <Link href={homeHref} aria-label="Jobocate" className="candidate-logo"><Logo size={22} /></Link>
        <nav aria-label={navigationLabel}>
          {items.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}>{label}</Link>)}
        </nav>
        <div className="candidate-nav-actions">
          <button type="button" onClick={toggle} aria-label="Toggle theme">{theme === 'light' ? 'Light' : 'Dark'}</button>
          {user && <button type="button" onClick={handleLogout} disabled={loggingOut}>Log out</button>}
        </div>
      </div>
      <style jsx global>{`
        .app-v3-header { position: sticky; top: 0; z-index: 30; background: var(--jb-v3-bg); border-bottom: 1px solid var(--jb-v3-line); }
        .candidate-nav-row { max-width: 1200px; margin: auto; padding: 0 24px; min-height: 64px; display: flex; align-items: center; gap: 28px; }
        .candidate-logo { display: flex; flex: none; color: var(--jb-v3-fg); }
        .candidate-nav-row nav { display: flex; flex: 1; gap: 4px; overflow-x: auto; }
        .candidate-nav-row nav a { padding: 12px; border: 1px solid transparent; border-radius: 8px; color: var(--jb-v3-fg-2); white-space: nowrap; font-size: 13px; text-decoration: none; }
        .candidate-nav-row nav a[aria-current=page] { background: var(--jb-v3-accent-soft); color: var(--jb-v3-fg); }
        .candidate-nav-actions { display: flex; gap: 8px; }
        .candidate-nav-actions button { background: var(--jb-v3-panel); color: var(--jb-v3-fg-2); border: 1px solid var(--jb-v3-line-2); padding: 8px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .candidate-nav-row a:focus-visible, .candidate-nav-row button:focus-visible { outline: 2px solid var(--jb-v3-accent); outline-offset: 3px; }
        @media(max-width: 800px) {
          .candidate-nav-row { padding: 12px 16px 0; flex-wrap: wrap; gap: 12px; }
          .candidate-nav-actions { margin-left: auto; }
          .candidate-nav-row nav { order: 3; flex-basis: 100%; overflow-x: auto; }
          .candidate-nav-row nav a { padding: 12px 5px; font-size: 12px; }
        }
      `}</style>
    </header>
  );
}

export function AppShell({ children, style }) {
  return <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 48px', ...style }}>{children}</div>;
}
