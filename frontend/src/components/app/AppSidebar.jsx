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
};

/* --------------------------------------------------------------- data --- */
const DESTINATIONS = [
  { key: 'dashboard', label: 'Dashboard', hint: 'Your daily overview', dc: 'App Dashboard.dc.html', tag: 'DB', tint: '#EAF6EE', ink: '#157A49' },
  { key: 'matches', label: 'Job Matches', hint: 'Roles ranked by fit', dc: 'App Matches.dc.html', tag: 'JM', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'job-profiles', label: 'Job Profiles', hint: 'What you\'re looking for, and where', dc: 'App Job Profiles.dc.html', tag: 'JP', tint: '#EAF6EE', ink: '#157A49' },
  { key: 'saved', label: 'Saved Jobs', hint: 'Roles you bookmarked', dc: 'App Saved.dc.html', tag: 'SV', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'tracker', label: 'Applications', hint: 'Your pipeline board', dc: 'App Tracker.dc.html', tag: 'AP', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'offers', label: 'Offers', hint: 'Compare your offers', dc: 'App Offers.dc.html', tag: 'OF', tint: '#EAF6EE', ink: '#157A49' },
  { key: 'auto', label: 'Auto-Apply', hint: 'Automation queue', dc: 'App Auto-Apply.dc.html', tag: 'AA', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'resume', label: 'Resume', hint: 'Editor & ATS score', dc: 'App Resume.dc.html', tag: 'RB', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'interview', label: 'Interview Prep', hint: 'Practice & readiness', dc: 'App Interview.dc.html', tag: 'IP', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'mock', label: 'Start mock interview', hint: 'Run a practice session', dc: 'App Mock Interview.dc.html', tag: '▶', tint: '#EAF6EE', ink: '#157A49' },
  { key: 'live', label: 'Live Interview', hint: 'In-call copilot', dc: 'App Live Interview.dc.html', tag: 'LV', tint: '#3A2723', ink: '#E89A8E' },
  { key: 'concierge', label: 'Concierge', hint: 'Your career coach', dc: 'App Concierge.dc.html', tag: 'CC', tint: '#1E2D24', ink: '#5BD08C' },
  { key: 'messages', label: 'Messages', hint: 'Chat with your concierge', dc: 'App Messages.dc.html', tag: 'MS', tint: '#1E2D24', ink: '#5BD08C' },
  { key: 'company', label: 'Company', hint: 'Company profile', dc: 'App Company.dc.html', tag: 'Co', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'settings', label: 'Settings', hint: 'Account & billing', dc: 'App Settings.dc.html', tag: 'SE', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'spec', label: 'App Spec', hint: 'Product specification', dc: 'Jobocate App Spec.dc.html', tag: 'DOC', tint: '#24221B', ink: '#B8B1A4' },
];

const NOTIFS = [
];

const WORKSPACE = [
  { key: 'dashboard', label: 'Dashboard', dc: 'App Dashboard.dc.html', glyph: 'dashboard' },
  { key: 'matches', label: 'Job Matches', dc: 'App Matches.dc.html', glyph: 'matches' },
  { key: 'job-profiles', label: 'Job Profiles', dc: 'App Job Profiles.dc.html', glyph: 'profiles' },
  { key: 'saved', label: 'Saved', dc: 'App Saved.dc.html', glyph: 'saved' },
  { key: 'tracker', label: 'Applications', dc: 'App Tracker.dc.html', glyph: 'tracker' },
  { key: 'offers', label: 'Offers', dc: 'App Offers.dc.html', glyph: 'offers' },
  { key: 'auto', label: 'Auto-Apply', dc: 'App Auto-Apply.dc.html', glyph: 'auto' },
];
const TOOLKIT = [
  { key: 'resume', label: 'Resumes', dc: 'App Resume Library.dc.html', glyph: 'resume' },
  { key: 'interview', label: 'Interview Prep', dc: 'App Interview.dc.html', glyph: 'interview' },
  { key: 'live', label: 'Live Interview', dc: 'App Live Interview.dc.html', glyph: 'live', live: true },
];
const PREMIUM = [
  { key: 'concierge', label: 'Concierge', dc: 'App Concierge.dc.html', glyph: 'concierge', premium: true },
  { key: 'messages', label: 'Messages', dc: 'App Messages.dc.html', glyph: 'messages', premium: true },
];

// Dark-surface icon button (header controls). Shared string so the notif button
// can add `relative` for its unread dot.
const ICON_BTN = 'w-7 h-7 flex items-center justify-center border border-[#2C2A22] bg-[#1E1C15] text-jb-ink-subtle rounded-lg cursor-pointer text-[13px]';

/*
 * Hoisted to module scope on purpose.
 *
 * It used to be declared inside AppSidebar, which gave it a fresh identity on
 * every render — so each setTip() unmounted and remounted every nav link, the
 * remount fired mouseleave, and the tooltip vanished the instant it appeared.
 */
function NavItem({ it, active, wide, narrow, navClass, showTip, hideTip }) {
  const on = active === it.key;
  return (
    <Link
      href={appRoute(it.dc)}
      className={navClass(on)}
      // Collapsed, the icon is the only visible content, so the label has to
      // come from somewhere for assistive tech. `title` alone was doing that
      // job and it is not enough: it never appears on keyboard focus and is
      // unreliable on touch. aria-label names the link; the styled tooltip
      // below is the visible affordance and is aria-hidden so it is not
      // announced twice.
      aria-label={narrow ? it.label : undefined}
      {...(on ? { 'aria-current': 'page' } : {})}
      {...(narrow
        ? {
            onMouseEnter: (e) => showTip(e.currentTarget, it),
            onMouseLeave: hideTip,
            onFocus: (e) => showTip(e.currentTarget, it),
            onBlur: hideTip,
          }
        : {})}
    >
      <span className={`absolute left-[-14px] top-[9px] bottom-[9px] w-[3px] rounded-[0_3px_3px_0] ${on ? 'bg-jb-green' : 'bg-transparent'}`} />
      <span className={`flex-shrink-0 flex ${on ? 'text-jb-green-on-dark' : 'text-[#7A7367]'}`}>{Glyph[it.glyph]}</span>
      {wide && <span className="flex-1">{it.label}</span>}
      {it.badge && wide && (
        <span className="flex-shrink-0 font-mono text-[11px] font-semibold text-jb-green-ink bg-jb-green rounded-full px-[7px] py-[2px]">{it.badge}</span>
      )}
      {it.badge && narrow && <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-jb-green border-[1.5px] border-jb-deep" />}
      {it.live && wide && (
        <span className="flex-shrink-0 font-mono text-[11px] font-semibold tracking-[0.06em] text-[#E1786A] border border-[#4A332E] rounded-full px-1.5 py-[2px]">LIVE</span>
      )}
      {it.live && narrow && <span className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-[#E1786A] border-[1.5px] border-jb-deep" />}
      {it.premium && wide && <span className="flex-shrink-0 text-[11px]">✦</span>}
    </Link>
  );
}

/* ----------------------------------------------------------- component --- */
export default function AppSidebar({ active = 'dashboard' }) {
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
  // Real auto-apply credits from the user record; honest placeholders otherwise.
  const credits = (() => {
    const limit =
      user?.autoApplyWeeklyLimit ?? user?.weeklyCredits ?? user?.autoApplyCreditsTotal ?? null;
    const used = user?.autoApplyUsedThisWeek ?? user?.autoApplyCreditsUsed ?? 0;
    const left =
      user?.autoApplyCreditsRemaining ??
      (limit != null ? Math.max(0, limit - used) : null);
    return {
      left: left != null ? left : '—',
      limit: limit != null ? limit : '—',
      pct: limit ? Math.min(100, Math.round(((left ?? 0) / limit) * 100)) : 0,
    };
  })();
  const [collapsed, setCollapsed] = useState(false);
  /* Collapsed-rail tooltip.
     Rendered ONCE, position:fixed, outside the scrolling nav panel. It cannot
     live inside the item: the panel scrolls vertically, and CSS forces
     overflow-x to auto whenever overflow-y is set, so any tooltip positioned
     beyond the 74px rail gets clipped. Fixed positioning from the item's rect
     sidesteps that entirely. */
  const [tip, setTip] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');

  // hydrate persisted + viewport state on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('jb_sidebar_collapsed') === '1');
    } catch (e) {
      /* ignore */
    }
    const onResize = () => setMobile(window.innerWidth <= 860);
    onResize();
    window.addEventListener('resize', onResize);

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
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (mobile) setDrawerOpen(false);
  }, [mobile]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('jb_sidebar_collapsed', next ? '1' : '0');
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  }, []);

  const wide = mobile || !collapsed;
  const narrow = !mobile && collapsed;

  // Nav-link classes. The hover (`hover:bg-[#221F18]`) intentionally overrides
  // the active tint, matching the old `.jb-nav:hover { …!important }` rule.
  const navClass = (on) =>
    [
      'jb-nav relative flex items-center gap-3 rounded-[11px] text-[14.5px] no-underline transition-colors hover:bg-[#221F18]',
      wide ? 'justify-start w-auto h-auto m-0 px-3 py-2.5' : 'justify-center w-[46px] h-[46px] mx-auto p-0',
      on ? 'font-bold text-[#FBF8F1] bg-[rgba(31,164,99,0.13)]' : 'font-medium text-[#B8B1A4] bg-transparent',
    ].join(' ');

  const showTip = (el, it) => {
    const r = el.getBoundingClientRect();
    setTip({ label: it.label, badge: it.badge, top: r.top + r.height / 2, left: r.right + 14 });
  };
  const hideTip = () => setTip(null);

  const sectionLabel = (txt, mtClass = 'pt-1.5') =>
    wide ? (
      <div className={`font-mono text-[11px] tracking-[0.14em] uppercase text-[#6B6456] px-2.5 pb-2.5 ${mtClass}`}>{txt}</div>
    ) : (
      <div className="h-px bg-[#221F18] mx-2 my-3.5" />
    );

  const q = query.trim().toLowerCase();
  const filtered = q ? DESTINATIONS.filter((d) => (d.label + ' ' + d.hint).toLowerCase().includes(q)) : DESTINATIONS;
  const settingsOn = active === 'settings';

  const rootWidthClass = mobile ? 'w-0 h-0 static' : collapsed ? 'w-[74px] h-screen sticky top-0' : 'w-[250px] h-screen sticky top-0';
  const panelClass = mobile
    ? `fixed w-[276px] z-[80] transition-transform duration-[250ms] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ${drawerOpen ? 'translate-x-0' : '-translate-x-[110%]'}`
    : 'static w-full z-[1]';

  return (
    <div id="jbside-root" className={`${rootWidthClass} self-start flex-shrink-0 font-sans z-30`}>
      {/* Portalled to <body>. Inside the sidebar it laid out at the right
          viewport coordinates but never painted: the rail establishes its own
          stacking context, so the tooltip's z-index was scoped beneath the
          stage. A portal escapes both that and any ancestor clipping.
          top/left are runtime coordinates from getBoundingClientRect, so they
          stay as inline positioning data. */}
      {tip &&
        mounted &&
        createPortal(
          <div
            role="presentation"
            className="fixed z-[200] -translate-y-1/2 whitespace-nowrap pointer-events-none bg-[#221F18] text-[#F2ECDB] border border-[#34322A] rounded-lg px-[11px] py-[7px] font-sans text-[12.5px] font-semibold leading-none shadow-[0_10px_24px_-10px_rgba(0,0,0,0.7)] before:content-[''] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-[#34322A]"
            style={{ top: tip.top, left: tip.left }}
          >
            {tip.label}
            {tip.badge ? ` · ${tip.badge}` : ''}
          </div>,
          document.body,
        )}

      {/* MOBILE HAMBURGER */}
      {mobile && !drawerOpen && (
        <button onClick={() => setDrawerOpen(true)} title="Menu" aria-label="Open menu" className="fixed top-3.5 left-3.5 z-[70] w-11 h-11 flex items-center justify-center bg-jb-deep text-[#FBF8F1] border border-[#2C2A22] rounded-xl cursor-pointer text-[18px] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)]">☰</button>
      )}

      {/* MOBILE SCRIM */}
      {mobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-[75] bg-[rgba(16,15,11,0.5)] animate-jb-fade" />
      )}

      {/* PANEL */}
      <div className={`${panelClass} top-0 left-0 h-screen bg-jb-deep text-[#B8B1A4] flex flex-col`}>
        {/* HEADER */}
        <div className={`flex items-center gap-2 pt-[18px] px-3.5 pb-4 ${narrow ? 'justify-center' : 'justify-between'}`}>
          {wide && (
            <Link href="/" className="flex-1 flex items-center no-underline" aria-label="Jobocate home">
              <Logo theme="dark" size={24} />
            </Link>
          )}
          {narrow && (
            <Link href="/" aria-label="Jobocate home" className="flex no-underline">
              <Logo theme="dark" size={26} mark />
            </Link>
          )}
          <div className="flex gap-1.5">
            {wide && (
              <button onClick={() => setNotifOpen((n) => !n)} title="Notifications" aria-label="Notifications" className={`${ICON_BTN} relative`}>
                ◔
                <span className="absolute top-[5px] right-[5px] w-1.5 h-1.5 rounded-full bg-jb-green border-[1.5px] border-[#1E1C15]" />
              </button>
            )}
            {!mobile && (
              <button onClick={toggleCollapse} title="Collapse" aria-label="Collapse sidebar" className={`${ICON_BTN} flex-shrink-0`}>{collapsed ? '»' : '«'}</button>
            )}
            {mobile && (
              <button onClick={() => setDrawerOpen(false)} title="Close" aria-label="Close menu" className={`${ICON_BTN} flex-shrink-0 text-[15px]`}>✕</button>
            )}
          </div>
        </div>

        {/* SEARCH TRIGGER */}
        {wide ? (
          <button onClick={() => { setPaletteOpen(true); setQuery(''); setNotifOpen(false); }} className="flex items-center gap-[9px] mx-3.5 mb-3 px-3 py-[9px] bg-[#1E1C15] border border-[#2C2A22] rounded-[10px] cursor-pointer font-sans">
            <span className="text-[#6B6456] text-[13px]">⌕</span>
            <span className="flex-1 text-left text-[13px] text-[#6B6456]">Search &amp; jump…</span>
            <span className="font-mono text-[11px] text-[#6B6456] border border-[#2C2A22] rounded-[5px] px-[5px] py-px">⌘K</span>
          </button>
        ) : (
          <button onClick={() => { setPaletteOpen(true); setQuery(''); }} title="Search" aria-label="Search" className="w-[46px] h-[42px] mx-auto mb-3 flex items-center justify-center bg-[#1E1C15] border border-[#2C2A22] rounded-[10px] cursor-pointer text-jb-ink-subtle text-[15px]">⌕</button>
        )}

        {/* NAV (scroll) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 pb-3.5 flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-[#34322A] [&::-webkit-scrollbar-thumb]:rounded-lg">
          {sectionLabel('Workspace')}
          <div className="flex flex-col gap-[3px]">
            {WORKSPACE.map((it) => <NavItem key={it.key} it={it} active={active} wide={wide} narrow={narrow} navClass={navClass} showTip={showTip} hideTip={hideTip} />)}
          </div>

          {sectionLabel('Toolkit', 'pt-[22px]')}
          <div className="flex flex-col gap-[3px]">
            {TOOLKIT.map((it) => <NavItem key={it.key} it={it} active={active} wide={wide} narrow={narrow} navClass={navClass} showTip={showTip} hideTip={hideTip} />)}
          </div>

          {sectionLabel('Premium', 'pt-[22px]')}
          <div className="flex flex-col gap-[3px]">
            {PREMIUM.map((it) => <NavItem key={it.key} it={it} active={active} wide={wide} narrow={narrow} navClass={navClass} showTip={showTip} hideTip={hideTip} />)}
          </div>

          {wide && (
            <Link href={appRoute('App Auto-Apply.dc.html')} className="mt-[22px] p-4 border border-[#2C2A22] rounded-[14px] bg-[linear-gradient(160deg,#1E1C15,#15140F)] block no-underline">
              <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-jb-green-on-dark mb-[7px]">Auto-apply</div>

              {/* A meter with no data is not a meter. The user record carries no
                  autoApply* credit fields, so this rendered "— / — this week"
                  above an empty 0% bar on every page — which reads as broken
                  rather than as "not set up". When there are no numbers, show
                  the invitation instead of the gauge. */}
              {credits.limit === '—' ? (
                <div className="text-[13px] text-[#CFC8B8] leading-snug">
                  Let Jobocate prepare applications for your best matches.
                  <span className="block mt-1.5 text-jb-green-on-dark font-semibold">Set it up →</span>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5 mb-2.5">
                    <span className="font-mono text-[22px] font-semibold text-[#FBF8F1]">{credits.left}</span>
                    <span className="text-xs text-jb-ink-subtle">/ {credits.limit} this week</span>
                  </div>
                  <div className="h-[5px] rounded-full bg-[#2C2A22] overflow-hidden">
                    {/* width is data-driven (percent) → inline */}
                    <div className="h-full bg-jb-green transition-[width] duration-[400ms]" style={{ width: `${credits.pct}%` }} />
                  </div>
                </>
              )}
            </Link>
          )}

          <div className="flex-1 min-h-[18px]" />

          <Link href={appRoute('App Settings.dc.html')} title="Settings" className={navClass(settingsOn)}>
            <span className={`absolute left-[-14px] top-[9px] bottom-[9px] w-[3px] rounded-[0_3px_3px_0] ${settingsOn ? 'bg-jb-green' : 'bg-transparent'}`} />
            <span className={`flex-shrink-0 flex ${settingsOn ? 'text-jb-green-on-dark' : 'text-[#7A7367]'}`}>{Glyph.settings}</span>
            {wide && <span>Settings</span>}
          </Link>

          {wide ? (
            <div className="flex items-center gap-[11px] px-2.5 pt-3 pb-1 mt-2 border-t border-[#2C2A22]">
              <Link href={appRoute('App Settings.dc.html')} className="flex items-center gap-[11px] flex-1 min-w-0 no-underline">
                <span className="w-9 h-9 flex-shrink-0 rounded-full bg-jb-green text-jb-green-ink flex items-center justify-center font-bold text-[13px]">{initials}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#FBF8F1] whitespace-nowrap overflow-hidden text-ellipsis">{displayName}</div>
                  <div className="text-[11.5px] text-jb-ink-subtle whitespace-nowrap overflow-hidden text-ellipsis">{planLabel}</div>
                </div>
              </Link>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#2C2A22] bg-transparent text-jb-ink-subtle cursor-pointer">
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-3 pb-0.5 mt-2 border-t border-[#2C2A22]">
              <Link href={appRoute('App Settings.dc.html')} title={`${displayName} · ${planLabel}`} className="w-9 h-9 rounded-full bg-jb-green text-jb-green-ink flex items-center justify-center font-bold text-[13px] no-underline">{initials}</Link>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#2C2A22] bg-transparent text-jb-ink-subtle cursor-pointer">
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* COMMAND PALETTE */}
      {paletteOpen && (
        <div onClick={() => setPaletteOpen(false)} className="fixed inset-0 z-[90] bg-[rgba(16,15,11,0.55)] flex items-start justify-center pt-[12vh] animate-jb-fade">
          <div onClick={(e) => e.stopPropagation()} className="w-[min(92vw,560px)] bg-[#1A1813] border border-[#2C2A22] rounded-2xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] overflow-hidden animate-jb-pop">
            <div className="flex items-center gap-[11px] px-[18px] py-4 border-b border-[#2C2A22]">
              <span className="text-[#6B6456] text-base">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search screens & actions…" className="flex-1 bg-transparent border-none font-sans text-base text-[#FBF8F1] placeholder:text-[#6B6456] focus:outline-none" />
              <span className="font-mono text-[11px] text-[#6B6456] border border-[#2C2A22] rounded-[5px] px-1.5 py-0.5">ESC</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filtered.map((r) => (
                <Link key={r.key} href={appRoute(r.dc)} className="flex items-center gap-[13px] px-3 py-[11px] rounded-[10px] text-[#E4DECF] no-underline hover:bg-[#24221B]">
                  <span className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center font-mono font-semibold text-[11px]" style={{ background: r.tint, color: r.ink }}>{r.tag}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-[#FBF8F1]">{r.label}</span>
                    <span className="block text-xs text-jb-ink-subtle">{r.hint}</span>
                  </span>
                  <span className="text-[#6B6456] text-sm">↵</span>
                </Link>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 text-center text-[13.5px] text-[#6B6456]">No matches for “{query}”.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {notifOpen && (
        <div onClick={() => setNotifOpen(false)} className="fixed inset-0 z-[88] animate-jb-fade">
          <div onClick={(e) => e.stopPropagation()} className={`fixed top-[84px] w-[340px] max-w-[88vw] bg-[#1A1813] border border-[#2C2A22] rounded-2xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] overflow-hidden animate-jb-pop ${mobile ? 'left-3.5' : collapsed ? 'left-[84px]' : 'left-[260px]'}`}>
            <div className="flex items-center justify-between px-[18px] py-[15px] border-b border-[#2C2A22]">
              <span className="text-[15px] font-bold text-[#FBF8F1]">Notifications</span>
              <span className="font-mono text-[11px] text-jb-green-on-dark">
                {NOTIFS.length ? `${NOTIFS.length} new` : 'All caught up'}
              </span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {NOTIFS.length === 0 && (
                <div className="px-[18px] py-[34px] text-center text-jb-ink-subtle text-[13px]">
                  <div className="text-[22px] opacity-50 mb-2">🔔</div>
                  You’re all caught up — no new notifications.
                </div>
              )}
              {NOTIFS.map((n, i) => (
                <Link key={i} href={appRoute(n.dc)} className="flex gap-3 px-[18px] py-[13px] border-b border-[#221F18] no-underline hover:bg-[#221F18]">
                  <span className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center font-mono font-semibold text-[11px]" style={{ background: n.tint, color: n.ink }}>{n.tag}</span>
                  <span className="flex-1">
                    <span className="block text-[13.5px] leading-[1.45] text-[#E4DECF]">{n.text}</span>
                    <span className="block font-mono text-[11px] text-jb-ink-subtle mt-[3px]">{n.time}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
