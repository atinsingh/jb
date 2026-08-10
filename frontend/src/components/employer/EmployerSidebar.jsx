'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';
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
  jobs: (
    <svg {...svgProps}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7 V5 a2 2 0 0 1 2 -2 h4 a2 2 0 0 1 2 2 v2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  ),
  candidates: (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20 a6.5 6.5 0 0 1 13 0" />
    </svg>
  ),
  interviews: (
    <svg {...svgProps}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
      <path d="M9 13.5 l2 2 l4 -4" />
    </svg>
  ),
  offers: (
    <svg {...svgProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <line x1="8.5" y1="7" x2="15.5" y2="7" />
      <path d="M9 13 l2 2 l4 -4" />
    </svg>
  ),
  search: (
    <svg {...svgProps}>
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="15.5" y1="15.5" x2="20.5" y2="20.5" />
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
  analytics: (
    <svg {...svgProps}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3" height="8" rx="0.6" />
      <rect x="11" y="8" width="3" height="12" rx="0.6" />
      <rect x="16" y="14" width="3" height="6" rx="0.6" />
    </svg>
  ),
  company: (
    <svg {...svgProps}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <rect x="8" y="7" width="2" height="2" rx="0.4" />
      <rect x="14" y="7" width="2" height="2" rx="0.4" />
      <rect x="8" y="11" width="2" height="2" rx="0.4" />
      <rect x="14" y="11" width="2" height="2" rx="0.4" />
      <rect x="10.5" y="16" width="3" height="5" rx="0.4" />
    </svg>
  ),
  team: (
    <svg {...svgProps}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19 a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="7.5" r="2.3" />
      <path d="M15 13 a4.6 4.6 0 0 1 5.5 4.4" />
    </svg>
  ),
  settings: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
  sparkle: (
    <svg {...svgProps}>
      <path d="M12 3 l1.8 5.2 l5.2 1.8 l-5.2 1.8 l-1.8 5.2 l-1.8 -5.2 l-5.2 -1.8 l5.2 -1.8 Z" />
      <path d="M18.5 16 l0.7 2 l2 0.7 l-2 0.7 l-0.7 2 l-0.7 -2 l-2 -0.7 l2 -0.7 Z" />
    </svg>
  ),
};

/* --------------------------------------------------------------- data --- */
// command palette destinations (mirrors the dc Component.destinations())
const I_TINT = '#1E2438', I_INK = '#8DA2F5';
const N_TINT = '#24221B', N_INK = '#B8B1A4';
const G_TINT = '#1E2D24', G_INK = '#5BD08C';

const DESTINATIONS = [
  { key: 'post', label: 'Post a job', hint: 'Create a new req', dc: 'Employer Post Job.dc.html', tag: '+', tint: I_TINT, ink: I_INK },
  { key: 'dashboard', label: 'Dashboard', hint: 'Hiring at a glance', dc: 'Employer Dashboard.dc.html', tag: 'DB', tint: I_TINT, ink: I_INK },
  { key: 'jobs', label: 'Jobs', hint: 'Your open reqs', dc: 'Employer Jobs.dc.html', tag: 'JB', tint: N_TINT, ink: N_INK },
  { key: 'candidates', label: 'Candidates', hint: 'Applicant pipeline', dc: 'Employer Candidates.dc.html', tag: 'CN', tint: I_TINT, ink: I_INK },
  { key: 'interviews', label: 'Interviews', hint: 'Schedule & feedback', dc: 'Employer Interviews.dc.html', tag: 'IV', tint: N_TINT, ink: N_INK },
  { key: 'offers', label: 'Offers', hint: 'Drafts & accepted', dc: 'Employer Offers.dc.html', tag: 'OF', tint: G_TINT, ink: G_INK },
  { key: 'search', label: 'Talent Search', hint: 'Source new candidates', dc: 'Employer Talent Search.dc.html', tag: 'TS', tint: N_TINT, ink: N_INK },
  { key: 'messages', label: 'Messages', hint: 'Candidate conversations', dc: 'Employer Messages.dc.html', tag: 'MS', tint: I_TINT, ink: I_INK },
  { key: 'analytics', label: 'Analytics', hint: 'Funnel & time-to-hire', dc: 'Employer Analytics.dc.html', tag: 'AN', tint: N_TINT, ink: N_INK },
  { key: 'company', label: 'Company Profile', hint: 'Your careers page', dc: 'Employer Company Profile.dc.html', tag: 'CO', tint: N_TINT, ink: N_INK },
  { key: 'team', label: 'Team', hint: 'Recruiters & hiring mgrs', dc: 'Employer Team.dc.html', tag: 'TM', tint: N_TINT, ink: N_INK },
  { key: 'settings', label: 'Settings', hint: 'Account & billing', dc: 'Employer Settings.dc.html', tag: 'SE', tint: N_TINT, ink: N_INK },
];

// Notifications come from a real feed once wired; no fabricated entries.
const NOTIFS = [];

// Nav items carry no fabricated counts/dots — badges are added only when wired
// to a real API (none yet), never hardcoded.
const HIRING = [
  { key: 'dashboard', label: 'Dashboard', dc: 'Employer Dashboard.dc.html', glyph: 'dashboard' },
  { key: 'jobs', label: 'Jobs', dc: 'Employer Jobs.dc.html', glyph: 'jobs' },
  { key: 'candidates', label: 'Candidates', dc: 'Employer Candidates.dc.html', glyph: 'candidates' },
  { key: 'interviews', label: 'Interviews', dc: 'Employer Interviews.dc.html', glyph: 'interviews' },
  { key: 'offers', label: 'Offers', dc: 'Employer Offers.dc.html', glyph: 'offers' },
];
const AI = [
  { key: 'autopilot', label: 'Autopilot', dc: 'Employer Autopilot.dc.html', glyph: 'sparkle', ai: true },
  { key: 'copilot', label: 'Copilot', dc: 'Employer Copilot.dc.html', glyph: 'sparkle', ai: true },
  { key: 'sourcing', label: 'Sourcing Agent', dc: 'Employer Sourcing Agent.dc.html', glyph: 'sparkle', ai: true },
];
const ENGAGE = [
  { key: 'search', label: 'Talent Search', dc: 'Employer Talent Search.dc.html', glyph: 'search' },
  { key: 'messages', label: 'Messages', dc: 'Employer Messages.dc.html', glyph: 'messages' },
  { key: 'analytics', label: 'Analytics', dc: 'Employer Analytics.dc.html', glyph: 'analytics' },
];
const COMPANY = [
  { key: 'company', label: 'Company Profile', dc: 'Employer Company Profile.dc.html', glyph: 'company' },
  { key: 'team', label: 'Team', dc: 'Employer Team.dc.html', glyph: 'team' },
  { key: 'settings', label: 'Settings', dc: 'Employer Settings.dc.html', glyph: 'settings' },
];

/* ----------------------------------------------------------- component --- */
export default function EmployerSidebar({ active = 'dashboard' }) {
  const auth = useAuth() || {};
  const user = auth.user || null;
  const displayName = user?.name || user?.email || 'Your account';
  const companyName = user?.companyName || user?.company || '';
  // Don't claim a paid plan we can't verify — only show a plan label if the
  // user record actually carries one.
  const planLabel = user?.plan || user?.subscriptionPlan || '';
  const subLabel = companyName
    ? (planLabel ? `${companyName} · ${planLabel}` : companyName)
    : (planLabel || 'Recruiter workspace');
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
      setCollapsed(localStorage.getItem('jb_employer_sidebar_collapsed') === '1');
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
        localStorage.setItem('jb_employer_sidebar_collapsed', next ? '1' : '0');
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  }, []);

  const wide = mobile || !collapsed;
  const narrow = !mobile && collapsed;

  const navStyle = (on, ai) => ({
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
    background: on ? (ai ? 'rgba(31,164,99,0.14)' : 'rgba(66,99,235,0.14)') : 'transparent',
    textDecoration: 'none',
  });

  const NavItem = ({ it }) => {
    const on = active === it.key;
    const ai = !!it.ai;
    const accent = ai ? '#1FA463' : '#4263EB';
    const showDot = (!!it.dot && narrow) || (!!it.badge && narrow);
    return (
      <Link href={appRoute(it.dc)} title={it.label} className="em-nav" style={navStyle(on, ai)}>
        <span style={{ position: 'absolute', left: -14, top: 9, bottom: 9, width: 3, borderRadius: '0 3px 3px 0', background: on ? accent : 'transparent' }} />
        <span style={{ flexShrink: 0, display: 'flex', color: on ? (ai ? '#5BD08C' : '#8DA2F5') : (ai ? '#5A8A6E' : '#7A7367') }}>{Glyph[it.glyph]}</span>
        {wide && <span style={{ flex: 1 }}>{it.label}</span>}
        {it.badge && wide && (
          <span style={{ flexShrink: 0, fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: '#FFFFFF', background: accent, borderRadius: 999, padding: '2px 7px' }}>{it.badge}</span>
        )}
        {showDot && (
          <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: accent, border: '1.5px solid #15140F' }} />
        )}
        {it.dot && wide && (
          <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', background: accent }} />
        )}
      </Link>
    );
  };

  const sectionLabel = (txt, opts = {}) => {
    const { mt = 6, ai = false } = opts;
    if (!wide) return <div style={{ height: 1, background: '#221F18', margin: '14px 8px' }} />;
    if (ai) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: `${mt}px 10px 10px` }}>
          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6456' }}>{txt}</span>
          <span style={{ color: '#5BD08C', fontSize: 11 }}>✦</span>
        </div>
      );
    }
    return (
      <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B6456', padding: `${mt}px 10px 10px` }}>{txt}</div>
    );
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? DESTINATIONS.filter((d) => (d.label + ' ' + d.hint).toLowerCase().includes(q)) : DESTINATIONS;

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
      id="emside-root"
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
        #emside-root a { text-decoration:none; }
        #emside-root .em-nav:hover { background:#221F18 !important; }
        #empanel::-webkit-scrollbar { width:8px; }
        #empanel::-webkit-scrollbar-thumb { background:#34322A; border-radius:8px; }
        #empalette input::placeholder { color:#6B6456; }
        #empalette input:focus { outline:none; }
        .em-pal-row:hover { background:#24221B; }
        .em-notif-row:hover { background:#221F18; }
        .em-postjob:hover { background:#364FC7 !important; }
        @keyframes empop { from { opacity:0; transform:translateY(8px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes emfade { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* MOBILE HAMBURGER */}
      {mobile && !drawerOpen && (
        <button onClick={() => setDrawerOpen(true)} title="Menu" style={{ position: 'fixed', top: 14, left: 14, zIndex: 70, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#15140F', color: '#FBF8F1', border: '1px solid #2C2A22', borderRadius: 12, cursor: 'pointer', fontSize: 18, boxShadow: '0 8px 20px -8px rgba(0,0,0,0.4)' }}>☰</button>
      )}

      {/* MOBILE SCRIM */}
      {mobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(16,15,11,0.5)', animation: 'emfade 0.2s ease' }} />
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
            <Link href={appRoute('Employer Dashboard.dc.html')} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9 }}>
              <Logo theme="dark" size={24} accent="#8DA2F5" />
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: '#8DA2F5', background: '#1E2438', border: '1px solid #2E3A63', borderRadius: 5, padding: '3px 6px' }}>RECRUITER</span>
            </Link>
          )}
          {narrow && (
            <Link href={appRoute('Employer Dashboard.dc.html')} aria-label="Jobocate home" style={{ display: 'flex' }}>
              <Logo theme="dark" size={26} mark accent="#8DA2F5" />
            </Link>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {wide && (
              <button onClick={() => { setPaletteOpen(true); setQuery(''); setNotifOpen(false); }} title="Search ⌘K" style={{ ...iconBtn, fontSize: 14 }}>⌕</button>
            )}
            {wide && (
              <button onClick={() => setNotifOpen((n) => !n)} title="Notifications" style={{ ...iconBtn, position: 'relative' }}>
                ◔
                {NOTIFS.length > 0 && (
                  <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: '#4263EB', border: '1.5px solid #1E1C15' }} />
                )}
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

        {/* POST A JOB (primary CTA) */}
        {wide && (
          <Link href={appRoute('Employer Post Job.dc.html')} className="em-postjob" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, margin: '0 14px 14px', padding: 12, background: '#4263EB', borderRadius: 11, fontSize: 14.5, fontWeight: 700, color: '#FFFFFF' }}>
            <span style={{ fontSize: 17, lineHeight: 1, fontWeight: 400 }}>＋</span> Post a job
          </Link>
        )}
        {narrow && (
          <>
            <Link href={appRoute('Employer Post Job.dc.html')} className="em-postjob" title="Post a job" style={{ width: 46, height: 44, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4263EB', borderRadius: 11, color: '#FFFFFF', fontSize: 20, fontWeight: 400 }}>＋</Link>
            <button onClick={() => { setPaletteOpen(true); setQuery(''); }} title="Search" style={{ width: 46, height: 42, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 10, cursor: 'pointer', color: '#8A8378', fontSize: 15 }}>⌕</button>
          </>
        )}

        {/* NAV (scroll) */}
        <div id="empanel" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 14px 14px', display: 'flex', flexDirection: 'column' }}>
          {sectionLabel('Hiring')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {HIRING.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {sectionLabel('AI', { mt: 22, ai: true })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {AI.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {sectionLabel('Engage', { mt: 22 })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {ENGAGE.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {sectionLabel('Company', { mt: 22 })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {COMPANY.map((it) => <NavItem key={it.key} it={it} />)}
          </div>

          {wide && (
            <Link href={appRoute('Employer Upgrade.dc.html')} style={{ marginTop: 22, padding: 16, border: '1px solid #2C2A22', borderRadius: 14, background: 'linear-gradient(160deg, #1E2A22, #15140F)', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ color: '#5BD08C', fontSize: 11 }}>✦</span>
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5BD08C' }}>AI hiring</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#D8D2C4', marginBottom: 12 }}>
                Autopilot, Copilot, and the Sourcing Agent help you screen and reach candidates faster.
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#8DA2F5' }}>See plans <span>→</span></span>
            </Link>
          )}

          <div style={{ flex: 1, minHeight: 18 }} />

          {wide ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 10px 4px', marginTop: 8, borderTop: '1px solid #2C2A22' }}>
              <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: '50%', background: '#4263EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#FBF8F1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                  <div style={{ fontSize: 11.5, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subLabel}</div>
                </div>
              </Link>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid #2C2A22', background: 'transparent', color: '#8A8378', cursor: 'pointer' }}>
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0 2px', marginTop: 8, borderTop: '1px solid #2C2A22' }}>
              <Link href={appRoute('Employer Settings.dc.html')} title={`${displayName} · ${subLabel}`} style={{ width: 36, height: 36, borderRadius: '50%', background: '#4263EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>{initials}</Link>
              <button type="button" onClick={() => auth.logout && auth.logout()} title="Log out" aria-label="Log out" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid #2C2A22', background: 'transparent', color: '#8A8378', cursor: 'pointer' }}>
                <svg {...svgProps}><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* COMMAND PALETTE */}
      {paletteOpen && (
        <div onClick={() => setPaletteOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(16,15,11,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', animation: 'emfade 0.15s ease' }}>
          <div id="empalette" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw,560px)', background: '#1A1813', border: '1px solid #2C2A22', borderRadius: 16, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.7)', overflow: 'hidden', animation: 'empop 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px', borderBottom: '1px solid #2C2A22' }}>
              <span style={{ color: '#6B6456', fontSize: 16 }}>⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search screens & actions…" style={{ flex: 1, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 16, color: '#FBF8F1' }} />
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#6B6456', border: '1px solid #2C2A22', borderRadius: 5, padding: '2px 6px' }}>ESC</span>
            </div>
            <div style={{ maxHeight: '50vh', overflowY: 'auto', padding: 8 }}>
              {filtered.map((r) => (
                <Link key={r.key} href={appRoute(r.dc)} className="em-pal-row" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 10, color: '#E4DECF' }}>
                  <span style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, background: r.tint, color: r.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-font-mono)', fontWeight: 600, fontSize: 11 }}>{r.tag}</span>
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
        <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 88, animation: 'emfade 0.12s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: mobile ? 14 : collapsed ? 84 : 260, top: 84, width: 340, maxWidth: '88vw', background: '#1A1813', border: '1px solid #2C2A22', borderRadius: 16, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.7)', overflow: 'hidden', animation: 'empop 0.18s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid #2C2A22' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#FBF8F1' }}>Notifications</span>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8DA2F5' }}>{NOTIFS.length} new</span>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {NOTIFS.map((n, i) => (
                <Link key={i} href={appRoute(n.dc)} className="em-notif-row" style={{ display: 'flex', gap: 12, padding: '13px 18px', borderBottom: '1px solid #221F18' }}>
                  <span style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, background: n.tint, color: n.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-font-mono)', fontWeight: 600, fontSize: 11 }}>{n.tag}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.45, color: '#E4DECF' }}>{n.text}</span>
                    <span style={{ display: 'block', fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378', marginTop: 3 }}>{n.time}</span>
                  </span>
                </Link>
              ))}
              {NOTIFS.length === 0 && (
                <div style={{ padding: '28px 18px', textAlign: 'center', fontSize: 13.5, color: '#8A8378' }}>You’re all caught up — no notifications yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
