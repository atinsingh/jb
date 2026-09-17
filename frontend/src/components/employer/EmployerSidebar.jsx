'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Logo from '@/components/brand/Logo';
import useJbTheme from '@/components/theme/useJbTheme';
import { useAuth } from '@/context/AuthContext';
import EmployerV3SurfaceStyles from './EmployerV3SurfaceStyles';

const PRIMARY = [
  { id: 'dashboard', label: 'Dashboard', href: '/employer/dashboard', paths: ['/employer/dashboard'] },
  {
    id: 'jobs', label: 'Jobs', href: '/employer/jobs',
    paths: ['/employer/jobs', '/employer/distribution'],
  },
  {
    id: 'candidates', label: 'Candidates', href: '/employer/candidates',
    paths: [
      '/employer/candidates', '/employer/screening', '/employer/pipeline',
      '/employer/talent-pool',
    ],
  },
  {
    id: 'interviews', label: 'Interviews', href: '/employer/interviews',
    paths: ['/employer/interviews', '/employer/messages', '/employer/offers'],
  },
  {
    id: 'company', label: 'Company', href: '/employer/company',
    paths: [
      '/employer/company', '/employer/usage', '/employer/compliance',
    ],
  },
];

const SECONDARY = {
  jobs: [
    { label: 'Jobs', href: '/employer/jobs' },
    { label: 'Distribution', href: '/employer/distribution' },
  ],
  candidates: [
    { label: 'Candidates', href: '/employer/candidates' },
    { label: 'Screening', href: '/employer/screening' },
    { label: 'Pipeline', href: '/employer/pipeline' },
    { label: 'Talent pool', href: '/employer/talent-pool' },
  ],
  interviews: [
    { label: 'Interviews', href: '/employer/interviews' },
    { label: 'Messages', href: '/employer/messages' },
    { label: 'Offers', href: '/employer/offers' },
  ],
  company: [
    { label: 'Company', href: '/employer/company' },
    { label: 'Usage', href: '/employer/usage' },
    { label: 'Compliance', href: '/employer/compliance' },
  ],
};

const V3_PAGES = new Set([
  ...PRIMARY.flatMap((item) => item.paths),
  '/employer/jobs/post',
]);

const matchesPath = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

function findSection(pathname, active) {
  const exact = PRIMARY.find((item) => item.paths.some((path) => matchesPath(pathname, path)));
  return exact || PRIMARY.find((item) => item.id === active) || PRIMARY[0];
}

export default function EmployerSidebar({ active = 'dashboard' }) {
  const { pathname } = useRouter();
  const { theme, toggle } = useJbTheme();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sectionNavOpen, setSectionNavOpen] = useState(false);
  const section = findSection(pathname, active);
  const tabs = SECONDARY[section.id] || [];
  const hasSubnav = tabs.length > 1;
  const isV3Page =
    V3_PAGES.has(pathname) ||
    PRIMARY.some((item) => item.paths.some((path) => matchesPath(pathname, path)));

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
      id="employer-v3-shell"
      data-subnav={hasSubnav ? 'true' : 'false'}
      data-v3-page={isV3Page ? 'true' : 'false'}
    >
      <EmployerV3SurfaceStyles />
      <style jsx global>{`
        div:has(> #employer-v3-shell) {
          flex-direction: column !important;
        }
        div:has(> #employer-v3-shell[data-subnav='true']) {
          display: grid !important;
          grid-template-columns: 184px minmax(0, 1fr);
        }
        div:has(> #employer-v3-shell[data-subnav='true']) > #employer-v3-shell {
          grid-column: 1 / -1;
        }
        div:has(> #employer-v3-shell[data-subnav='true']) > main {
          grid-column: 2;
          min-width: 0;
        }
        #employer-v3-shell + main { width: 100%; }
        #employer-v3-shell + main > header {
          top: 56px !important;
          background: var(--jb-v3-bg) !important;
          border-color: var(--jb-v3-line) !important;
        }
        .employer-v3-scroll::-webkit-scrollbar { display: none; }
        .employer-v3-primary-link {
          position: relative;
          flex: none;
          padding: 20px 12px 17px;
          border-bottom: 1px solid transparent;
          color: var(--jb-v3-fg-3);
          font: 400 10.5px/1 var(--jb-v3-font-mono);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .employer-v3-primary-link:hover,
        .employer-v3-primary-link.current { color: var(--jb-v3-fg); }
        .employer-v3-primary-link.current { border-bottom-color: var(--jb-v3-accent); }
        .employer-v3-secondary-link {
          display: block;
          padding: 10px 12px;
          color: var(--jb-v3-fg-3);
          font-size: 12.5px;
          text-decoration: none;
        }
        .employer-v3-secondary-link[aria-current='page'] {
          color: var(--jb-v3-fg);
          background: var(--jb-v3-panel);
          border-left: 2px solid var(--jb-v3-accent);
          padding-left: 10px;
        }
        @media (max-width: 720px) {
          div:has(> #employer-v3-shell[data-subnav='true']) { display: flex !important; }
          #employer-v3-shell + main > header { top: 92px !important; }
          .employer-v3-primary-link { padding: 13px 10px 11px; }
        }
      `}</style>

      <div className="primary-row">
        <Link href="/employer/dashboard" aria-label="Jobocate" className="logo">
          <Logo size={22} />
        </Link>

        <nav aria-label="Employer primary" className="primary employer-v3-scroll">
          {PRIMARY.map((item) => {
            const current = item.id === section.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`employer-v3-primary-link${current ? ' current' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="actions">
          {hasSubnav && (
            <button
              type="button"
              className="section-nav-toggle"
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
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="theme"
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label="Log out"
              className="theme"
            >
              Log out
            </button>
          )}
        </div>
      </div>

      {hasSubnav && (
        <nav aria-label={`Employer ${section.id}`} className={`secondary employer-v3-scroll${sectionNavOpen ? ' is-open' : ''}`}>
          <div>
            {tabs.map((tab) => {
              const current = tab.href && matchesPath(pathname, tab.href);
              return tab.href ? (
                <Link
                  key={tab.label}
                  href={tab.href}
                  aria-current={current ? 'page' : undefined}
                  className="employer-v3-secondary-link"
                  onClick={() => setSectionNavOpen(false)}
                >
                  {tab.label}
                </Link>
              ) : (
                <span key={tab.label} title="Designed in v3; route not available yet">
                  {tab.label}
                </span>
              );
            })}
          </div>
        </nav>
      )}

      <style jsx>{`
        #employer-v3-shell {
          position: sticky;
          top: 0;
          z-index: 60;
          flex: none;
          width: 100%;
          color: var(--jb-v3-fg);
          background: var(--jb-v3-bg);
          border-bottom: 1px solid var(--jb-v3-line);
          font-family: var(--jb-v3-font-display);
        }
        .primary-row {
          width: min(100%, 1360px);
          height: 56px;
          margin: 0 auto;
          padding: 0 28px;
          display: flex;
          align-items: center;
          gap: 34px;
        }
        .logo {
          display: flex;
          flex: none;
          align-items: center;
          color: var(--jb-v3-fg);
          text-decoration: none;
        }
        .primary {
          flex: 1;
          display: flex;
          align-items: stretch;
          gap: 2px;
          min-width: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .actions {
          flex: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .theme {
          flex: none;
          padding: 5px 10px;
          border: 1px solid var(--jb-v3-line-2);
          border-radius: 2px;
          color: var(--jb-v3-fg-2);
          background: none;
          font: 400 10px/1 var(--jb-v3-font-mono);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .theme:disabled {
          cursor: default;
          opacity: 0.6;
        }
        .section-nav-toggle { display: none; }
        .secondary {
          position: fixed;
          top: 56px;
          bottom: 0;
          left: 0;
          z-index: 61;
          width: 184px;
          overflow-y: auto;
          border-right: 1px solid var(--jb-v3-line);
          background: var(--jb-v3-sunk);
        }
        .secondary > div {
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .secondary span {
          display: block;
          padding: 10px 12px;
          color: var(--jb-v3-fg-3);
          font-size: 12.5px;
          text-decoration: none;
        }
        .secondary span { opacity: 0.48; }
        @media (max-width: 720px) {
          .primary-row {
            height: 92px;
            padding: 10px 18px 0;
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-rows: 32px 40px;
            gap: 0 16px;
          }
          .primary { grid-column: 1 / -1; width: 100%; }
          .section-nav-toggle {
            display: block;
            padding: 5px 9px;
            border: 1px solid var(--jb-v3-line-2);
            color: var(--jb-v3-fg);
            background: none;
            cursor: pointer;
          }
          .secondary { display: none; top: 92px; width: min(240px, calc(100vw - 48px)); }
          .secondary.is-open { display: block; }
        }
      `}</style>
    </header>
  );
}
