'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/brand/Logo';

/*
 * Admin operator-console sidebar.
 *
 * Cloned from EmployerSidebar but with a distinct slate/amber "operator" accent
 * and an ADMIN badge, so the admin surface is never mistaken for the recruiter
 * or candidate app. Routes are plain `/admin/*` hrefs (the admin console is not
 * part of the Claude-Design appRoutes MAP).
 */

const ACCENT = '#F59E0B'; // amber — admin/operator accent
const ACCENT_INK = '#FBBF57';

/* Build display initials from a name/email. */
const initialsFrom = (name = '', email = '') => {
  const src = (name || email || '').trim();
  if (!src) return 'AD';
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
  overview: (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </svg>
  ),
  users: (
    <svg {...svgProps}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19 a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="7.5" r="2.3" />
      <path d="M15 13 a4.6 4.6 0 0 1 5.5 4.4" />
    </svg>
  ),
  moderation: (
    <svg {...svgProps}>
      <path d="M12 3 l7 3 v5 c0 4.4 -3 7.6 -7 9 c-4 -1.4 -7 -4.6 -7 -9 V6 Z" />
      <path d="M9 12 l2 2 l4 -4" />
    </svg>
  ),
  ingestion: (
    <svg {...svgProps}>
      <path d="M12 3 v10" />
      <path d="M8 9 l4 4 l4 -4" />
      <rect x="4" y="16" width="16" height="5" rx="1.5" />
    </svg>
  ),
};

/* Nav groups — plain /admin/* hrefs. */
const NAV = [
  {
    section: 'Overview',
    items: [{ key: 'dashboard', label: 'Metrics', href: '/admin/dashboard', glyph: 'overview' }],
  },
  {
    section: 'Users',
    items: [{ key: 'users', label: 'Users', href: '/admin/users', glyph: 'users' }],
  },
  {
    section: 'Moderation',
    items: [{ key: 'jobs', label: 'Jobs', href: '/admin/jobs', glyph: 'moderation' }],
  },
  {
    section: 'Ingestion',
    items: [{ key: 'ingestion', label: 'Sources & Runs', href: '/admin/ingestion', glyph: 'ingestion' }],
  },
];

/* ----------------------------------------------------------- component --- */
export default function AdminSidebar({ active = 'dashboard' }) {
  const auth = useAuth() || {};
  const user = auth.user || null;
  const displayName = user?.name || user?.email || 'Operator';
  const roleLabel = user?.role === 'ROLE_ADMIN' ? 'Administrator' : 'Operator';
  const initials = initialsFrom(user?.name, user?.email);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // hydrate persisted + viewport state on mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('jb_admin_sidebar_collapsed') === '1');
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
        localStorage.setItem('jb_admin_sidebar_collapsed', next ? '1' : '0');
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
    color: on ? '#F8FAFC' : '#94A3B8',
    background: on ? 'rgba(245,158,11,0.14)' : 'transparent',
    textDecoration: 'none',
  });

  const NavItem = ({ it }) => {
    const on = active === it.key;
    return (
      <Link href={it.href} title={it.label} className="ad-nav" style={navStyle(on)}>
        <span
          style={{
            position: 'absolute',
            left: -14,
            top: 9,
            bottom: 9,
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: on ? ACCENT : 'transparent',
          }}
        />
        <span style={{ flexShrink: 0, display: 'flex', color: on ? ACCENT_INK : '#64748B' }}>
          {Glyph[it.glyph]}
        </span>
        {wide && <span style={{ flex: 1 }}>{it.label}</span>}
      </Link>
    );
  };

  const sectionLabel = (txt) => {
    if (!wide) return <div style={{ height: 1, background: '#1E293B', margin: '14px 8px' }} />;
    return (
      <div
        style={{
          fontFamily: 'var(--jb-font-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#64748B',
          padding: '18px 10px 8px',
        }}
      >
        {txt}
      </div>
    );
  };

  const iconBtn = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #334155',
    background: '#1E293B',
    color: '#94A3B8',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
  };

  return (
    <div
      id="adside-root"
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
        #adside-root a { text-decoration:none; }
        #adside-root .ad-nav:hover { background:#1E293B !important; }
        #adpanel::-webkit-scrollbar { width:8px; }
        #adpanel::-webkit-scrollbar-thumb { background:#334155; border-radius:8px; }
        @keyframes adfade { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* MOBILE HAMBURGER */}
      {mobile && !drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          title="Menu"
          style={{
            position: 'fixed',
            top: 14,
            left: 14,
            zIndex: 70,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0F172A',
            color: '#F8FAFC',
            border: '1px solid #334155',
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 18,
            boxShadow: '0 8px 20px -8px rgba(0,0,0,0.5)',
          }}
        >
          ☰
        </button>
      )}

      {/* MOBILE SCRIM */}
      {mobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 75,
            background: 'rgba(2,6,23,0.6)',
            animation: 'adfade 0.2s ease',
          }}
        />
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
          boxShadow: mobile ? '0 30px 60px -20px rgba(0,0,0,0.7)' : 'none',
          background: '#0F172A',
          color: '#94A3B8',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: narrow ? 'center' : 'space-between',
            gap: 8,
            padding: '18px 14px 16px',
          }}
        >
          {wide && (
            <Link href="/admin/dashboard" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9 }}>
              <Logo theme="dark" size={24} accent={ACCENT} />
              <span
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: ACCENT_INK,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  borderRadius: 5,
                  padding: '3px 6px',
                }}
              >
                ADMIN
              </span>
            </Link>
          )}
          {narrow && (
            <Link href="/admin/dashboard" aria-label="Admin home" style={{ display: 'flex' }}>
              <Logo theme="dark" size={26} mark accent={ACCENT} />
            </Link>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {!mobile && (
              <button onClick={toggleCollapse} title="Collapse" style={{ ...iconBtn, flexShrink: 0 }}>
                {collapsed ? '»' : '«'}
              </button>
            )}
            {mobile && (
              <button
                onClick={() => setDrawerOpen(false)}
                title="Close"
                style={{ ...iconBtn, flexShrink: 0, fontSize: 15 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* NAV (scroll) */}
        <div
          id="adpanel"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '0 14px 14px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {NAV.map((group) => (
            <div key={group.section}>
              {sectionLabel(group.section)}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {group.items.map((it) => (
                  <NavItem key={it.key} it={it} />
                ))}
              </div>
            </div>
          ))}

          <div style={{ flex: 1, minHeight: 18 }} />

          {/* FOOTER: account + logout */}
          {wide ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '12px 10px 4px',
                marginTop: 8,
                borderTop: '1px solid #1E293B',
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: ACCENT,
                  color: '#1E1300',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {initials}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#F8FAFC',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {displayName}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {roleLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => auth.logout && auth.logout()}
                title="Log out"
                aria-label="Log out"
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <svg {...svgProps}>
                  <path d="M15 12H4" />
                  <path d="M8 8l-4 4 4 4" />
                  <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '12px 0 2px',
                marginTop: 8,
                borderTop: '1px solid #1E293B',
              }}
            >
              <span
                title={`${displayName} · ${roleLabel}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: ACCENT,
                  color: '#1E1300',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {initials}
              </span>
              <button
                type="button"
                onClick={() => auth.logout && auth.logout()}
                title="Log out"
                aria-label="Log out"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: 'transparent',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <svg {...svgProps}>
                  <path d="M15 12H4" />
                  <path d="M8 8l-4 4 4 4" />
                  <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
