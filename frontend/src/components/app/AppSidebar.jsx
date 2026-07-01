'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { appRoute } from './appRoutes';
import { useAuth } from '@/context/AuthContext';

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
  { key: 'saved', label: 'Saved Jobs', hint: 'Roles you bookmarked', dc: 'App Saved.dc.html', tag: 'SV', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'tracker', label: 'Applications', hint: 'Your pipeline board', dc: 'App Tracker.dc.html', tag: 'AP', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'offers', label: 'Offers', hint: 'Compare your offers', dc: 'App Offers.dc.html', tag: 'OF', tint: '#EAF6EE', ink: '#157A49' },
  { key: 'auto', label: 'Auto-Apply', hint: 'Automation queue', dc: 'App Auto-Apply.dc.html', tag: 'AA', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'resume', label: 'Resume', hint: 'Editor & ATS score', dc: 'App Resume.dc.html', tag: 'RB', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'interview', label: 'Interview Prep', hint: 'Practice & readiness', dc: 'App Interview.dc.html', tag: 'IP', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'mock', label: 'Start mock interview', hint: 'Run a practice session', dc: 'App Mock Interview.dc.html', tag: '▶', tint: '#EAF6EE', ink: '#157A49' },
  { key: 'live', label: 'Live Interview', hint: 'In-call copilot', dc: 'App Live Interview.dc.html', tag: 'LV', tint: '#3A2723', ink: '#E89A8E' },
  { key: 'concierge', label: 'Concierge', hint: 'Your career coach', dc: 'App Concierge.dc.html', tag: 'CC', tint: '#1E2D24', ink: '#5BD08C' },
  { key: 'messages', label: 'Messages', hint: 'Chat with Marcus', dc: 'App Messages.dc.html', tag: 'MS', tint: '#1E2D24', ink: '#5BD08C' },
  { key: 'company', label: 'Stripe', hint: 'Company profile', dc: 'App Company.dc.html', tag: 'St', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'settings', label: 'Settings', hint: 'Account & billing', dc: 'App Settings.dc.html', tag: 'SE', tint: '#24221B', ink: '#B8B1A4' },
  { key: 'spec', label: 'App Spec', hint: 'Product specification', dc: 'Jobocate App Spec.dc.html', tag: 'DOC', tint: '#24221B', ink: '#B8B1A4' },
];

const NOTIFS = [
  { tag: 'St', tint: '#EAF6EE', ink: '#157A49', text: 'Stripe moved you to the final round — Mon, Jun 29.', time: '12m ago', dc: 'App Application Detail.dc.html' },
  { tag: 'MB', tint: '#3A2723', ink: '#E89A8E', text: 'Marcus applied to Airbnb on your behalf.', time: '1h ago', dc: 'App Concierge.dc.html' },
  { tag: 'JM', tint: '#24221B', ink: '#B8B1A4', text: '12 new matches above 90% are waiting for you.', time: '3h ago', dc: 'App Matches.dc.html' },
  { tag: 'AA', tint: '#1E2D24', ink: '#5BD08C', text: 'Auto-Apply sent 6 applications overnight.', time: '8h ago', dc: 'App Auto-Apply.dc.html' },
  { tag: 'MS', tint: '#1E2D24', ink: '#5BD08C', text: 'New message from Marcus Bell about your search.', time: 'Yesterday', dc: 'App Messages.dc.html' },
];

const WORKSPACE = [
  { key: 'dashboard', label: 'Dashboard', dc: 'App Dashboard.dc.html', glyph: 'dashboard' },
  { key: 'matches', label: 'Job Matches', dc: 'App Matches.dc.html', glyph: 'matches', badge: '12' },
  { key: 'saved', label: 'Saved', dc: 'App Saved.dc.html', glyph: 'saved' },
  { key: 'tracker', label: 'Applications', dc: 'App Tracker.dc.html', glyph: 'tracker' },
  { key: 'offers', label: 'Offers', dc: 'App Offers.dc.html', glyph: 'offers', badge: '3' },
  { key: 'auto', label: 'Auto-Apply', dc: 'App Auto-Apply.dc.html', glyph: 'auto', badge: '6' },
];
const TOOLKIT = [
  { key: 'resume', label: 'Resume', dc: 'App Resume.dc.html', glyph: 'resume' },
  { key: 'interview', label: 'Interview Prep', dc: 'App Interview.dc.html', glyph: 'interview' },
  { key: 'live', label: 'Live Interview', dc: 'App Live Interview.dc.html', glyph: 'live', live: true },
];
const PREMIUM = [
  { key: 'concierge', label: 'Concierge', dc: 'App Concierge.dc.html', glyph: 'concierge', premium: true },
  { key: 'messages', label: 'Messages', dc: 'App Messages.dc.html', glyph: 'messages', premium: true },
];

/* ----------------------------------------------------------- component --- */
export default function AppSidebar({ active = 'dashboard' }) {
  const auth = useAuth() || {};
  const user = auth.user || null;
  const displayName = user?.name || user?.email || 'Your account';
  const planLabel = user?.plan || user?.subscriptionPlan || 'Free plan';
  const initials = initialsFrom(user?.name, user?.email);
  const [collapsed, setCollapsed] = useState(false);
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

  const navStyle = (on) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: wide ? 'flex-start' : 'center',
    gap: 12,
    width: wide ? 'auto' : 46,
    height: wide ? 'auto' : 46,
    margin: wide ? 0 : '0 auto',
    padding: wide ? '10px 12px' : 0,
    borderRadius: 11,
    fontSize: 14.5,
    fontWeight: on ? 700 : 500,
    color: on ? '#FBF8F1' : '#B8B1A4',
    background: on ? 'rgba(31,164,99,0.13)' : 'transparent',
    textDecoration: 'none',
  });

  const NavItem = ({ it }) => {
    const on = active === it.key;
    return (
      <Link href={appRoute(it.dc)} title={it.label} className="jb-nav" style={navStyle(on)}>
        <span style={{ position: 'absolute', left: -14, top: 9, bottom: 9, width: 3, borderRadius: '0 3px 3px 0', background: on ? '#1FA463' : 'transparent' }} />
        <span style={{ flexShrink: 0, display: 'flex', color: on ? '#5BD08C' : '#7A7367' }}>{Glyph[it.glyph]}</span>
        {wide && <span style={{ flex: 1 }}>{it.label}</span>}
        {it.badge && wide && (
          <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, color: '#0C2C1C', background: '#1FA463', borderRadius: 999, padding: '2px 7px' }}>{it.badge}</span>
        )}
        {it.badge && narrow && <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#1FA463', border: '1.5px solid #15140F' }} />}
        {it.live && wide && (
          <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', color: '#E1786A', border: '1px solid #4A332E', borderRadius: 999, padding: '2px 6px' }}>LIVE</span>
        )}
        {it.live && narrow && <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#E1786A', border: '1.5px solid #15140F' }} />}
        {it.premium && wide && <span style={{ flexShrink: 0, fontSize: 11 }}>✦</span>}
      </Link>
    );
  };

  const sectionLabel = (txt, mt = 6) =>
    wide ? (
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6456', padding: `${mt}px 10px 10px` }}>{txt}</div>
    ) : (
      <div style={{ height: 1, background: '#221F18', margin: '14px 8px' }} />
    );

  const q = query.trim().toLowerCase();
  const filtered = q ? DESTINATIONS.filter((d) => (d.label + ' ' + d.hint).toLowerCase().includes(q)) : DESTINATIONS;
  const settingsOn = active === 'settings';

  const iconBtn = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #2C2A22',
    background: '#1E1C15',
    color: '#8A8378',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
  };

  return (
    <div
      id="jbside-root"
      style={{
        width: mobile ? 0 : collapsed ? 74 : 250,
        height: mobile ? 0 : '100vh',
        position: mobile ? 'static' : 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        flexShrink: 0,
        fontFamily: "'Hanken Grotesk',sans-serif",
        zIndex: 30,
      }}
    >
      <style>{`
        #jbside-root a { text-decoration:none; }
        #jbside-root .jb-nav:hover { background:#221F18 !important; }
        #jbpanel::-webkit-scrollbar { width:8px; }
        #jbpanel::-webkit-scrollbar-thumb { background:#34322A; border-radius:8px; }
        #jbpalette input::placeholder { color:#6B6456; }
        #jbpalette input:focus { outline:none; }
        .jb-pal-row:hover { background:#24221B; }
        .jb-notif-row:hover { background:#221F18; }
        @keyframes jbpop { from { opacity:0; transform:translateY(8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes jbfade { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* MOBILE HAMBURGER */}
      {mobile && !drawerOpen && (
        <button onClick={() => setDrawerOpen(true)} title="Menu" style={{ position: 'fixed', top: 14, left: 14, zIndex: 70, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#15140F', color: '#FBF8F1', border: '1px solid #2C2A22', borderRadius: 12, cursor: 'pointer', fontSize: 18, boxShadow: '0 8px 20px -8px rgba(0,0,0,0.4)' }}>☰</button>
      )}

      {/* MOBILE SCRIM */}
      {mobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(16,15,11,0.5)', animation: 'jbfade 0.2s ease' }} />
      )}

      {/* PANEL */}
      <div
        style={{
          position: mobile ? 'fixed' : 'static',
          top: 0,
          left: 0,
          width: mobile ? 276 : '100%',
          height: '100vh',
          zIndex: mobile ? 80 : 1,
          transform: mobile ? (drawerOpen ? 'translateX(0)' : 'translateX(-110%)') : 'none',
          transition: 'transform 0.25s ease',
          boxShadow: mobile ? '0 30px 60px -20px rgba(0,0,0,0.6)' : 'none',
          background: '#15140F',
          color: '#B8B1A4',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: narrow ? 'center' : 'space-between', gap: 8, padding: '18px 14px 16px' }}>
          {wide && (
            <Link href="/" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', fontSize: 23, lineHeight: 1, color: '#FBF8F1' }}>
                Jobocate<span style={{ color: '#1FA463' }}>.</span>
              </span>
            </Link>
          )}
          {narrow && (
            <Link href="/" style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 22, lineHeight: 1, color: '#FBF8F1' }}>
              J<span style={{ color: '#1FA463' }}>.</span>
            </Link>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {wide && (
              <button onClick={() => setNotifOpen((n) => !n)} title="Notifications" style={{ ...iconBtn, position: 'relative' }}>
                ◔
                <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: '#1FA463', border: '1.5px solid #1E1C15' }} />
              </button>
            )}
            {!mobile && (
              <button onClick={toggleCollapse} title="Collapse" style={{ ...iconBtn, flexShrink: 0 }}>{collapsed ? '»' : '«'}</button>
            )}
            {mobile && (
              <button onClick={() => setDrawerOpen(false)} title="Close" style={{ ...iconBtn, flexShrink: 0, fontSize: 15 }}>✕</button>
            )}
          </div>
        </div>

        {/* SEARCH TRIGGER */}
        {wide ? (
          <button onClick={() => { setPaletteOpen(true); setQuery(''); setNotifOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 14px 12px', padding: '9px 12px', background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ color: '#6B6456', fontSize: 13 }}>⌕</span>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 13, color: '#6B6456' }}>Search &amp; jump…</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#6B6456', border: '1px solid #2C2A22', borderRadius: 5, padding: '1px 5px' }}>⌘K</span>
          </button>
        ) : (
          <button onClick={() => { setPaletteOpen(true); setQuery(''); }} title="Search" style={{ width: 46, height: 42, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 10, cursor: 'pointer', color: '#8A8378', fontSize: 15 }}>⌕</button>
        )}

        {/* NAV (scroll) */}
        <div id="jbpanel" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 14px 14px', display: 'flex', flexDirection: 'column' }}>
          {sectionLabel('Workspace')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {WORKSPACE.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {sectionLabel('Toolkit', 22)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {TOOLKIT.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {sectionLabel('Premium', 22)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {PREMIUM.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {wide && (
            <Link href={appRoute('App Auto-Apply.dc.html')} style={{ marginTop: 22, padding: 16, border: '1px solid #2C2A22', borderRadius: 14, background: 'linear-gradient(160deg, #1E1C15, #15140F)', display: 'block' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 7 }}>Auto-apply credits</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: '#FBF8F1' }}>38</span>
                <span style={{ fontSize: 12, color: '#8A8378' }}>/ 50 this week</span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: '#2C2A22', overflow: 'hidden' }}>
                <div style={{ width: '76%', height: '100%', background: '#1FA463' }} />
              </div>
            </Link>
          )}

          <div style={{ flex: 1, minHeight: 18 }} />

          <Link href={appRoute('App Settings.dc.html')} title="Settings" className="jb-nav" style={navStyle(settingsOn)}>
            <span style={{ position: 'absolute', left: -14, top: 9, bottom: 9, width: 3, borderRadius: '0 3px 3px 0', background: settingsOn ? '#1FA463' : 'transparent' }} />
            <span style={{ flexShrink: 0, display: 'flex', color: settingsOn ? '#5BD08C' : '#7A7367' }}>{Glyph.settings}</span>
            {wide && <span>Settings</span>}
          </Link>

          {wide ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 10px 4px', marginTop: 8, borderTop: '1px solid #2C2A22' }}>
              <Link href={appRoute('App Settings.dc.html')} style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#FBF8F1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                  <div style={{ fontSize: 11.5, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{planLabel}</div>
                </div>
              </Link>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid #2C2A22', background: 'transparent', color: '#8A8378', cursor: 'pointer' }}>
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0 2px', marginTop: 8, borderTop: '1px solid #2C2A22' }}>
              <Link href={appRoute('App Settings.dc.html')} title={`${displayName} · ${planLabel}`} style={{ width: 36, height: 36, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>{initials}</Link>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid #2C2A22', background: 'transparent', color: '#8A8378', cursor: 'pointer' }}>
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* COMMAND PALETTE */}
      {paletteOpen && (
        <div onClick={() => setPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(16,15,11,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', animation: 'jbfade 0.15s ease' }}>
          <div id="jbpalette" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw,560px)', background: '#1A1813', border: '1px solid #2C2A22', borderRadius: 16, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.7)', overflow: 'hidden', animation: 'jbpop 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px', borderBottom: '1px solid #2C2A22' }}>
              <span style={{ color: '#6B6456', fontSize: 16 }}>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search screens & actions…" style={{ flex: 1, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 16, color: '#FBF8F1' }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#6B6456', border: '1px solid #2C2A22', borderRadius: 5, padding: '2px 6px' }}>ESC</span>
            </div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 8 }}>
              {filtered.map((r) => (
                <Link key={r.key} href={appRoute(r.dc)} className="jb-pal-row" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 10, color: '#E4DECF' }}>
                  <span style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, background: r.tint, color: r.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 11 }}>{r.tag}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#FBF8F1' }}>{r.label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#8A8378' }}>{r.hint}</span>
                  </span>
                  <span style={{ color: '#6B6456', fontSize: 14 }}>↵</span>
                </Link>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13.5, color: '#6B6456' }}>No matches for “{query}”.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {notifOpen && (
        <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 88, animation: 'jbfade 0.12s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: mobile ? 14 : collapsed ? 84 : 260, top: 84, width: 340, maxWidth: '88vw', background: '#1A1813', border: '1px solid #2C2A22', borderRadius: 16, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.7)', overflow: 'hidden', animation: 'jbpop 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid #2C2A22' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#FBF8F1' }}>Notifications</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#5BD08C' }}>5 new</span>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {NOTIFS.map((n, i) => (
                <Link key={i} href={appRoute(n.dc)} className="jb-notif-row" style={{ display: 'flex', gap: 12, padding: '13px 18px', borderBottom: '1px solid #221F18' }}>
                  <span style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, background: n.tint, color: n.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 11 }}>{n.tag}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.45, color: '#E4DECF' }}>{n.text}</span>
                    <span style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#8A8378', marginTop: 3 }}>{n.time}</span>
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
