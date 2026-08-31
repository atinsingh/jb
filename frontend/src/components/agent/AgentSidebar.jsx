'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  dashboard: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </svg>
  ),
  candidates: (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20 a6.5 6.5 0 0 1 13 0" />
    </svg>
  ),
};

/* --------------------------------------------------------------- accent --- */
// Distinct concierge/purple tone so the agent console never reads as the
// employer (indigo) or candidate (green) surface.
const ACCENT = '#7C5CFF';
const ACCENT_INK = '#B9A8FF';
const ACCENT_SOFT = 'rgba(124,92,255,0.14)';

// Nav carries no fabricated counts/badges — the queue lives on the dashboard.
const NAV = [
  { key: 'dashboard', label: 'My queue', href: '/agent/dashboard', glyph: 'dashboard' },
  { key: 'candidates', label: 'Candidates', href: '/agent/dashboard', glyph: 'candidates' },
];

/* ----------------------------------------------------------- component --- */
export default function AgentSidebar({ active = 'dashboard' }) {
  const auth = useAuth() || {};
  const user = auth.user || null;
  const displayName = user?.name || user?.email || 'Your account';
  const initials = initialsFrom(user?.name, user?.email);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('jb_agent_sidebar_collapsed') === '1');
    } catch (e) {
      /* ignore */
    }
    const onResize = () => setMobile(window.innerWidth <= 860);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (mobile) setDrawerOpen(false);
  }, [mobile]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem('jb_agent_sidebar_collapsed', next ? '1' : '0');
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
    background: on ? ACCENT_SOFT : 'transparent',
    textDecoration: 'none',
  });

  const NavItem = ({ it }) => {
    const on = active === it.key;
    return (
      <Link href={it.href} title={it.label} className="ag-nav" style={navStyle(on)}>
        <span style={{ position: 'absolute', left: -14, top: 9, bottom: 9, width: 3, borderRadius: '0 3px 3px 0', background: on ? ACCENT : 'transparent' }} />
        <span style={{ flexShrink: 0, display: 'flex', color: on ? ACCENT_INK : '#7A7367' }}>{Glyph[it.glyph]}</span>
        {wide && <span style={{ flex: 1 }}>{it.label}</span>}
      </Link>
    );
  };

  const sectionLabel = (txt) => {
    if (!wide) return <div style={{ height: 1, background: '#221F18', margin: '14px 8px' }} />;
    return (
      <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6456', padding: '6px 10px 10px' }}>{txt}</div>
    );
  };

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
      id="agside-root"
      style={{
        width: mobile ? 0 : collapsed ? 74 : 250,
        height: mobile ? 0 : '100vh',
        position: mobile ? 'static' : 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        flexShrink: 0,
        fontFamily: 'var(--jb-font-sans)',
        zIndex: 30,
      }}
    >
      <style>{`
        #agside-root a { text-decoration:none; }
        #agside-root .ag-nav:hover { background:#221F18 !important; }
        @keyframes agfade { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* MOBILE HAMBURGER */}
      {mobile && !drawerOpen && (
        <button onClick={() => setDrawerOpen(true)} title="Menu" style={{ position: 'fixed', top: 14, left: 14, zIndex: 70, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#15140F', color: '#FBF8F1', border: '1px solid #2C2A22', borderRadius: 12, cursor: 'pointer', fontSize: 18, boxShadow: '0 8px 20px -8px rgba(0,0,0,0.4)' }}>☰</button>
      )}

      {/* MOBILE SCRIM */}
      {mobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(16,15,11,0.5)', animation: 'agfade 0.2s ease' }} />
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
            <Link href="/agent/dashboard" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9 }}>
              <Logo size={24} accent={ACCENT_INK} style={{ color: "#f2ecdb" }} />
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: ACCENT_INK, background: '#241E3B', border: '1px solid #3A2F63', borderRadius: 5, padding: '3px 6px' }}>CONCIERGE</span>
            </Link>
          )}
          {narrow && (
            <Link href="/agent/dashboard" aria-label="Jobocate home" style={{ display: 'flex' }}>
              <Logo size={26} mark accent={ACCENT_INK} style={{ color: "#f2ecdb" }} />
            </Link>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {!mobile && (
              <button onClick={toggleCollapse} title="Collapse" style={{ ...iconBtn, flexShrink: 0 }}>{collapsed ? '»' : '«'}</button>
            )}
            {mobile && (
              <button onClick={() => setDrawerOpen(false)} title="Close" style={{ ...iconBtn, flexShrink: 0, fontSize: 15 }}>✕</button>
            )}
          </div>
        </div>

        {/* NAV (scroll) */}
        <div id="agpanel" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 14px 14px', display: 'flex', flexDirection: 'column' }}>
          {sectionLabel('Concierge')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {NAV.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {wide && (
            <div style={{ marginTop: 22, padding: 16, border: '1px solid #2C2A22', borderRadius: 14, background: 'linear-gradient(160deg, #241E3B, #15140F)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ color: ACCENT_INK, fontSize: 11 }}>✦</span>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT_INK }}>Human concierge</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#D8D2C4' }}>
                You apply on behalf of your assigned candidates, track status, and file proof of every submission.
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 18 }} />

          {wide ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 10px 4px', marginTop: 8, borderTop: '1px solid #2C2A22' }}>
              <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: ACCENT, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FBF8F1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                <div style={{ fontSize: 11.5, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Career concierge</div>
              </div>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid #2C2A22', background: 'transparent', color: '#8A8378', cursor: 'pointer' }}>
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0 2px', marginTop: 8, borderTop: '1px solid #2C2A22' }}>
              <span title={displayName} style={{ width: 36, height: 36, borderRadius: '50%', background: ACCENT, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials}</span>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid #2C2A22', background: 'transparent', color: '#8A8378', cursor: 'pointer' }}>
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
