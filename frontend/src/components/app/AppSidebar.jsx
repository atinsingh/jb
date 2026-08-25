'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { appRoute } from './appRoutes';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/brand/Logo';

/* Build display initials from a name/email. */
const initialsFrom = (name = '', email = '') => {
  const src = (name || email || '').trim();
  if (!src) return 'JB';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

/* ---------------------------------------------------------------- glyphs --- */
const svgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Glyph = {
  profiles: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <line x1="12" y1="1.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22.5" y2="12" />
    </svg>
  ),
  dashboard: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </svg>
  ),
  matches: (
    <svg {...svgProps}>
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="15.5" y1="15.5" x2="20.5" y2="20.5" />
    </svg>
  ),
  saved: (
    <svg {...svgProps}>
      <path d="M6 3 h12 v18 l-6 -4 -6 4 Z" />
    </svg>
  ),
  tracker: (
    <svg {...svgProps}>
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="0.9" />
      <circle cx="4" cy="12" r="0.9" />
      <circle cx="4" cy="18" r="0.9" />
    </svg>
  ),
  offers: (
    <svg {...svgProps}>
      <circle cx="12" cy="9" r="5" />
      <line x1="9.5" y1="13" x2="8" y2="21" />
      <line x1="14.5" y1="13" x2="16" y2="21" />
      <path d="M10 9 l1.5 1.5 L14 7.5" />
    </svg>
  ),
  auto: (
    <svg {...svgProps}>
      <path d="M12 3 L21 12 L12 21 L3 12 Z" />
      <path d="M9.5 12 L11.5 14 L15 9.5" />
    </svg>
  ),
  resume: (
    <svg {...svgProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <line x1="8.5" y1="8" x2="15.5" y2="8" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
      <line x1="8.5" y1="16" x2="13" y2="16" />
    </svg>
  ),
  interview: (
    <svg {...svgProps}>
      <path d="M4 5 h16 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 H9 l-4 4 V6 a1 1 0 0 1 1 -1 Z" />
      <line x1="8" y1="9.5" x2="17" y2="9.5" />
      <line x1="8" y1="12.5" x2="14" y2="12.5" />
    </svg>
  ),
  live: (
    <svg {...svgProps}>
      <line x1="5" y1="10" x2="5" y2="14" />
      <line x1="9.5" y1="7" x2="9.5" y2="17" />
      <line x1="14.5" y1="4.5" x2="14.5" y2="19.5" />
      <line x1="19" y1="9" x2="19" y2="15" />
    </svg>
  ),
  concierge: (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20 a6.5 6.5 0 0 1 13 0" />
    </svg>
  ),
  messages: (
    <svg {...svgProps}>
      <path d="M4 5 h16 a1 1 0 0 1 1 1 v8 a1 1 0 0 1 -1 1 H10 l-4 4 v-4 H5 a1 1 0 0 1 -1 -1 V6 a1 1 0 0 1 1 -1 Z" />
      <circle cx="9" cy="10" r="0.9" />
      <circle cx="12.5" cy="10" r="0.9" />
      <circle cx="16" cy="10" r="0.9" />
    </svg>
  ),
  settings: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  building: (
    <svg {...svgProps}>
      <path d="M4.4 21.4V4.6a1.8 1.8 0 0 1 1.8-1.8h7.6a1.8 1.8 0 0 1 1.8 1.8v16.8M15.6 9.6h2.2a1.8 1.8 0 0 1 1.8 1.8v10M8 7.4h4M8 11.4h4M8 15.4h4" />
    </svg>
  ),
};

/* ---------------------------------------------------------------- data --- */
// Everything reachable from ⌘K. The rail shows nine destinations; this list is
// the escape hatch for the rest (Job Profiles, Messages, Live Interview,
// Company, Settings), which is why it must stay a superset of RAIL below.
const DESTINATIONS = [
  { key: 'dashboard', label: 'Dashboard', hint: 'Your daily overview', dc: 'App Dashboard.dc.html', tag: 'DB' },
  { key: 'matches', label: 'Job Matches', hint: 'Roles ranked by fit', dc: 'App Matches.dc.html', tag: 'JM' },
  { key: 'job-profiles', label: 'Job Profiles', hint: "What you're looking for, and where", dc: 'App Job Profiles.dc.html', tag: 'JP' },
  { key: 'saved', label: 'Saved Jobs', hint: 'Roles you bookmarked', dc: 'App Saved.dc.html', tag: 'SV' },
  { key: 'tracker', label: 'Applications', hint: 'Your pipeline board', dc: 'App Tracker.dc.html', tag: 'AP' },
  { key: 'offers', label: 'Offers', hint: 'Compare your offers', dc: 'App Offers.dc.html', tag: 'OF' },
  { key: 'auto', label: 'Auto-Apply', hint: 'Automation queue', dc: 'App Auto-Apply.dc.html', tag: 'AA' },
  { key: 'resume', label: 'Resume', hint: 'Editor & ATS score', dc: 'App Resume.dc.html', tag: 'RB' },
  { key: 'interview', label: 'Interview Prep', hint: 'Practice & readiness', dc: 'App Interview.dc.html', tag: 'IP' },
  { key: 'mock', label: 'Start mock interview', hint: 'Run a practice session', dc: 'App Mock Interview.dc.html', tag: '▶' },
  { key: 'live', label: 'Live Interview', hint: 'In-call copilot', dc: 'App Live Interview.dc.html', tag: 'LV' },
  { key: 'concierge', label: 'Concierge', hint: 'Your career coach', dc: 'App Concierge.dc.html', tag: 'CC' },
  { key: 'messages', label: 'Messages', hint: 'Chat with your concierge', dc: 'App Messages.dc.html', tag: 'MS' },
  { key: 'company', label: 'Company', hint: 'Company profile', dc: 'App Company.dc.html', tag: 'Co' },
  { key: 'settings', label: 'Settings', hint: 'Account & billing', dc: 'App Settings.dc.html', tag: 'SE' },
];

// Notifications are not wired to a feed yet. An empty list renders the honest
// "all caught up" state rather than fabricated items.
const NOTIFS = [];

// The rail, in the design's order. Nine for candidates, eight for employers —
// short enough that every icon stays above the fold on a phone.
const CANDIDATE_RAIL = [
  { key: 'dashboard', label: 'Dashboard', dc: 'App Dashboard.dc.html', glyph: 'dashboard' },
  { key: 'matches', label: 'Matches', dc: 'App Matches.dc.html', glyph: 'matches' },
  { key: 'tracker', label: 'Applications', dc: 'App Tracker.dc.html', glyph: 'tracker' },
  { key: 'saved', label: 'Saved', dc: 'App Saved.dc.html', glyph: 'saved' },
  { key: 'offers', label: 'Offers', dc: 'App Offers.dc.html', glyph: 'offers' },
  { key: 'auto', label: 'Auto-apply', dc: 'App Auto-Apply.dc.html', glyph: 'auto' },
  { key: 'resume', label: 'Résumé', dc: 'App Resume Library.dc.html', glyph: 'resume' },
  { key: 'interview', label: 'Interview prep', dc: 'App Interview.dc.html', glyph: 'interview' },
  { key: 'concierge', label: 'Concierge', dc: 'App Concierge.dc.html', glyph: 'concierge' },
];

const EMPLOYER_RAIL = [
  { key: 'dashboard', label: 'Hiring dashboard', dc: 'Employer Dashboard.dc.html', glyph: 'dashboard' },
  { key: 'company', label: 'Company', dc: 'Employer Company.dc.html', glyph: 'building' },
  { key: 'candidates', label: 'Candidates', dc: 'Employer Candidates.dc.html', glyph: 'profiles' },
  { key: 'messages', label: 'Messages', dc: 'Employer Messages.dc.html', glyph: 'messages' },
  { key: 'interviews', label: 'Interviews', dc: 'Employer Interviews.dc.html', glyph: 'interview' },
  { key: 'jobs', label: 'Pipeline', dc: 'Employer Jobs.dc.html', glyph: 'tracker' },
  { key: 'offers', label: 'Offers', dc: 'Employer Offers.dc.html', glyph: 'offers' },
  { key: 'settings', label: 'Settings', dc: 'Employer Settings.dc.html', glyph: 'settings' },
];

// Anything on the page can open the palette by dispatching this. The Search
// affordance now lives in each screen's own 64px header bar, not in the rail,
// so it needs a way to reach state that lives here. A window event keeps that
// one-way and avoids threading a context provider through every layout.
export const PALETTE_EVENT = 'jb:open-palette';
export const openCommandPalette = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
};

function RailItem({ item, on, onShowTip, onHideTip }) {
  return (
    <Link
      href={appRoute(item.dc)}
      title={item.label}
      aria-label={item.label}
      aria-current={on ? 'page' : undefined}
      onMouseEnter={(e) => onShowTip(e.currentTarget, item)}
      onMouseLeave={onHideTip}
      onFocus={(e) => onShowTip(e.currentTarget, item)}
      onBlur={onHideTip}
      style={{
        width: 42,
        height: 42,
        borderRadius: 11,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        background: on ? 'var(--jb-a-tint)' : 'transparent',
        color: on ? 'var(--jb-a-accent)' : 'var(--jb-a-ink-warm)',
      }}
    >
      {Glyph[item.glyph]}
    </Link>
  );
}

export default function AppSidebar({ active = 'dashboard', surface = 'candidate' }) {
  const auth = useAuth() || {};
  const user = auth.user || null;
  // Normalize a shouty ALL-CAPS or all-lowercase name for display; leave
  // intentionally mixed-case names (e.g. "McDonald") untouched.
  const rawName = user?.name || '';
  const normName =
    rawName && (rawName === rawName.toUpperCase() || rawName === rawName.toLowerCase())
      ? rawName.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
      : rawName;
  const displayName = normName || user?.email || 'Your account';
  const planLabel = user?.plan || user?.subscriptionPlan || 'Free plan';
  const initials = initialsFrom(user?.name, user?.email);
  const employer = surface === 'employer';
  const RAIL = employer ? EMPLOYER_RAIL : CANDIDATE_RAIL;

  /* Rail tooltip.
     Rendered ONCE, position:fixed, portalled to <body>. It cannot live inside
     the item: the rail scrolls vertically, and CSS forces overflow-x to auto
     whenever overflow-y is set, so any tooltip positioned beyond the rail's
     width gets clipped. A portal escapes both that and the stacking context
     the rail establishes. top/left are runtime rect coordinates, so they stay
     as inline positioning data. */
  const [tip, setTip] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        setQuery('');
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setNotifOpen(false);
      }
    };
    const onOpen = () => {
      setQuery('');
      setPaletteOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PALETTE_EVENT, onOpen);
    };
  }, []);

  const showTip = useCallback((el, it) => {
    const r = el.getBoundingClientRect();
    setTip({ label: it.label, top: r.top + r.height / 2, left: r.right + 12 });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? DESTINATIONS.filter((d) => `${d.label} ${d.hint}`.toLowerCase().includes(q))
    : DESTINATIONS;

  const overlayCard = {
    background: 'var(--jb-a-card)',
    border: '1px solid var(--jb-a-line)',
    borderRadius: 14,
    boxShadow: 'var(--jb-a-shadow-paper)',
    overflow: 'hidden',
  };

  return (
    <nav
      aria-label={employer ? 'Hiring navigation' : 'App navigation'}
      style={{
        width: 70,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        borderRight: '1px solid var(--jb-a-line)',
        background: 'var(--jb-a-rail)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '22px 0 16px',
        fontFamily: 'var(--jb-font-sans)',
        zIndex: 30,
      }}
    >
      {tip &&
        mounted &&
        createPortal(
          <div
            role="presentation"
            style={{
              position: 'fixed',
              top: tip.top,
              left: tip.left,
              transform: 'translateY(-50%)',
              zIndex: 200,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              background: 'var(--jb-a-invert)',
              color: 'var(--jb-a-invert-ink)',
              borderRadius: 8,
              padding: '7px 11px',
              fontFamily: 'var(--jb-font-sans)',
              fontSize: 12.5,
              fontWeight: 600,
              lineHeight: 1,
              boxShadow: 'var(--jb-a-shadow-lift)',
            }}
          >
            {tip.label}
          </div>,
          document.body,
        )}

      <Link href="/" aria-label="Jobocate home" style={{ marginBottom: 30, display: 'flex' }}>
        <Logo size={24} mark accent="var(--jb-a-accent)" />
      </Link>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {RAIL.map((it) => (
          <RailItem
            key={it.key}
            item={it}
            on={active === it.key}
            onShowTip={showTip}
            onHideTip={hideTip}
          />
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 12 }} />

      <button
        type="button"
        onClick={() => setNotifOpen((n) => !n)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={notifOpen}
        style={{
          width: 42,
          height: 42,
          border: 0,
          borderRadius: 11,
          background: notifOpen ? 'var(--jb-a-tint)' : 'transparent',
          color: notifOpen ? 'var(--jb-a-accent)' : 'var(--jb-a-ink-warm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginBottom: 6,
        }}
      >
        <svg {...svgProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </button>

      <Link
        href={appRoute(employer ? 'Employer Settings.dc.html' : 'App Settings.dc.html')}
        title={`${displayName} · ${planLabel}`}
        aria-label={`Account: ${displayName}`}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: employer ? 'var(--jb-a-invert)' : 'var(--jb-a-accent)',
          color: 'var(--jb-a-accent-ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 12,
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        {initials}
      </Link>

      <button
        type="button"
        onClick={() => auth.logout && auth.logout()}
        title="Sign out"
        aria-label="Sign out"
        style={{
          marginTop: 10,
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--jb-a-ink-faint)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <svg {...svgProps} width="16" height="16">
          <path d="M15 12H4" />
          <path d="M8 8l-4 4 4 4" />
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        </svg>
      </button>

      {/* COMMAND PALETTE — the only way to reach destinations off the rail. */}
      {paletteOpen && (
        <div
          onClick={() => setPaletteOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'var(--jb-a-scrim)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh',
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...overlayCard, width: 'min(92vw, 560px)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '16px 18px',
                borderBottom: '1px solid var(--jb-a-line)',
              }}
            >
              <span style={{ color: 'var(--jb-a-ink-3)', fontSize: 16 }}>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                aria-label="Search screens and actions"
                placeholder="Search screens & actions…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: 16,
                  color: 'var(--jb-a-ink)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11,
                  color: 'var(--jb-a-ink-3)',
                  border: '1px solid var(--jb-a-line)',
                  borderRadius: 5,
                  padding: '2px 6px',
                }}
              >
                ESC
              </span>
            </div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 8 }}>
              {filtered.map((r) => (
                <Link
                  key={r.key}
                  href={appRoute(r.dc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    padding: '11px 12px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: 'var(--jb-a-ink)',
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--jb-font-mono)',
                      fontWeight: 600,
                      fontSize: 11,
                      background: 'var(--jb-a-tint)',
                      color: 'var(--jb-a-accent)',
                    }}
                  >
                    {r.tag}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{r.label}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--jb-a-ink-3)' }}>{r.hint}</span>
                  </span>
                  <span style={{ color: 'var(--jb-a-ink-faint)', fontSize: 14 }}>↵</span>
                </Link>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13.5, color: 'var(--jb-a-ink-3)' }}>
                  No matches for “{query}”.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {notifOpen && (
        <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 88 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ ...overlayCard, position: 'fixed', bottom: 24, left: 84, width: 340, maxWidth: '88vw' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px 18px',
                borderBottom: '1px solid var(--jb-a-line)',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--jb-a-ink)' }}>Notifications</span>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-a-ink-3)' }}>
                {NOTIFS.length ? `${NOTIFS.length} new` : 'All caught up'}
              </span>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {NOTIFS.length === 0 && (
                <div style={{ padding: '34px 18px', textAlign: 'center', color: 'var(--jb-a-ink-3)', fontSize: 13.5 }}>
                  You’re all caught up — no new notifications.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
