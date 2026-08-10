'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { T, SIDEBAR_W } from './tokens';
import { KitStyles, Avatar } from './kit';
import { employerCompanyApi, employerProfileApi } from '@/services/employerApi';

/* ------------------------------------------------------------------ icons --- */
const I = (p) => ({ width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', ...p });
const Icons = {
  dashboard: <svg {...I()}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  jobs: <svg {...I()}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  candidates: <svg {...I()}><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /></svg>,
  interviews: <svg {...I()}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  sparkle: <svg {...I()}><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" /></svg>,
  screening: <svg {...I()}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
  talent: <svg {...I()}><path d="M20 21v-2a4 4 0 00-3-3.87M9 21H4v-2a4 4 0 013-3.87" /><circle cx="12" cy="7" r="3" /><path d="M12 14a5 5 0 00-4 2" /></svg>,
  messages: <svg {...I()}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  distribution: <svg {...I()}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>,
  company: <svg {...I()}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h2M9 11h2M9 15h2M13 7h2M13 11h2M13 15h2" /></svg>,
  approvals: <svg {...I()}><path d="M9 11l3 3L22 4" /><path d="M20 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" /></svg>,
  notifications: <svg {...I()}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>,
  billing: <svg {...I()}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  usage: <svg {...I()}><path d="M3 3v18h18" /><path d="M18 9l-5 5-3-3-3 3" /></svg>,
  integrations: <svg {...I()}><path d="M6 3v6a3 3 0 003 3h6a3 3 0 003-3V3" /><path d="M9 12v9M15 12v9M12 3v3" /></svg>,
  developer: <svg {...I()}><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>,
  security: <svg {...I()}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>,
  audit: <svg {...I()}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></svg>,
  compliance: <svg {...I()}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>,
  profile: <svg {...I()}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" /></svg>,
  plus: <svg {...I({ strokeWidth: 2 })}><path d="M12 5v14M5 12h14" /></svg>,
  search: <svg {...I()}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>,
  logout: <svg {...I()}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>,
};

const GROUPS = [
  { title: null, items: [
    { key: 'dashboard', label: 'Dashboard', href: '/employer/dashboard', icon: 'dashboard' },
    { key: 'jobs', label: 'Jobs', href: '/employer/jobs', icon: 'jobs' },
    { key: 'candidates', label: 'Candidates', href: '/employer/candidates', icon: 'candidates' },
    { key: 'interviews', label: 'Interviews', href: '/employer/interviews', icon: 'interviews' },
  ] },
  { title: 'AI Recruiter', items: [
    { key: 'autopilot', label: 'Autopilot', href: '/employer/autopilot', icon: 'sparkle', ai: true },
    { key: 'copilot', label: 'Copilot', href: '/employer/copilot', icon: 'sparkle', ai: true },
    { key: 'sourcing', label: 'Sourcing', href: '/employer/sourcing', icon: 'sparkle', ai: true },
    { key: 'screening', label: 'Screening', href: '/employer/screening', icon: 'screening', ai: true },
    { key: 'ai-interview', label: 'AI Interview', href: '/employer/ai-interview', icon: 'sparkle', ai: true },
  ] },
  { title: 'Engage', items: [
    { key: 'talent-pool', label: 'Talent Pool', href: '/employer/talent-pool', icon: 'talent' },
    { key: 'messages', label: 'Messages', href: '/employer/messages', icon: 'messages' },
    { key: 'distribution', label: 'Distribution', href: '/employer/distribution', icon: 'distribution' },
    { key: 'approvals', label: 'Approvals', href: '/employer/approvals', icon: 'approvals' },
    { key: 'notifications', label: 'Notifications', href: '/employer/notifications', icon: 'notifications' },
  ] },
  { title: 'Company', items: [
    { key: 'company', label: 'Company Profile', href: '/employer/company', icon: 'company' },
    { key: 'profile', label: 'My Profile', href: '/employer/profile', icon: 'profile' },
  ] },
  { title: 'Account & Settings', items: [
    { key: 'billing', label: 'Billing', href: '/employer/billing', icon: 'billing' },
    { key: 'plans', label: 'Plans', href: '/employer/plans', icon: 'billing' },
    { key: 'usage', label: 'Usage', href: '/employer/usage', icon: 'usage' },
    { key: 'integrations', label: 'Integrations', href: '/employer/integrations', icon: 'integrations' },
    { key: 'developer', label: 'Developer', href: '/employer/developer', icon: 'developer' },
    { key: 'security', label: 'Security', href: '/employer/security', icon: 'security' },
    { key: 'audit', label: 'Audit Log', href: '/employer/audit', icon: 'audit' },
    { key: 'compliance', label: 'Compliance', href: '/employer/compliance', icon: 'compliance' },
  ] },
];

function NavItem({ item, active }) {
  return (
    <Link
      href={item.href}
      className="emx-nav"
      style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 11,
        padding: '8px 12px', margin: '1px 8px', borderRadius: 6, textDecoration: 'none',
        fontSize: 13.5, fontWeight: active ? 600 : 400,
        color: active ? T.color.railActiveInk : T.color.railText,
        background: active ? T.color.railActiveBg : 'transparent',
      }}
    >
      {active && <span style={{ position: 'absolute', left: -8, top: 9, bottom: 9, width: 3, borderRadius: 3, background: T.color.railActiveBar }} />}
      <span style={{ display: 'flex', color: active ? T.color.railActiveInk : (item.ai ? T.color.accent : T.color.railTextDim) }}>{Icons[item.icon]}</span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
    </Link>
  );
}

export default function Shell({ active, children }) {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [me, setMe] = useState({ name: '', role: '' });

  useEffect(() => {
    employerCompanyApi.get().then((r) => setCompany(r?.company?.name || '')).catch(() => {});
    employerProfileApi.get().then((r) => setMe({ name: r?.user?.name || '', role: r?.user?.role || '' })).catch(() => {});
  }, []);

  const isActive = (item) => active ? active === item.key : router.pathname === item.href || router.pathname.startsWith(item.href + '/');

  const logout = () => {
    if (typeof window !== 'undefined') { localStorage.removeItem('authToken'); localStorage.removeItem('token'); localStorage.removeItem('user'); }
    router.push('/login');
  };

  const roleLabel = me.role === 'ROLE_EMPLOYER' ? 'Employer' : (me.role ? me.role.replace('ROLE_', '').toLowerCase() : 'Recruiter');

  return (
    <div className="emx" style={{ display: 'flex', minHeight: '100vh', background: T.color.bg, fontFamily: T.font.sans, color: T.color.text }}>
      <KitStyles />
      <style jsx global>{`
        .emx-nav:hover { background: rgba(0,0,0,0.04) !important; }
        .emx-postjob:hover { background: ${T.color.accentHover} !important; }
        .emx-topbtn:hover { background: ${T.color.surfaceSunken} !important; }
      `}</style>

      {/* SIDEBAR — Fluent light NavView */}
      <aside style={{ width: SIDEBAR_W, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column', background: T.color.railBg, borderRight: `1px solid ${T.color.railBorder}` }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 12px' }}>
          <span style={{ width: 30, height: 30, borderRadius: 7, background: T.color.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>J</span>
          <div style={{ lineHeight: 1.15, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.color.text }}>Jobocate</div>
            <div style={{ fontSize: 11.5, color: T.color.railTextDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company || 'Employer'}</div>
          </div>
        </div>

        {/* Post a job */}
        <Link href="/employer/jobs/post" className="emx-postjob" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 12px 8px', padding: '9px 12px', background: T.color.accent, borderRadius: 6, color: '#fff', fontSize: 13.5, fontWeight: 600, textDecoration: 'none', boxShadow: T.shadow.xs, transition: `background ${T.motion.fast}` }}>
          {Icons.plus} Post a job
        </Link>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 0 12px' }}>
          {GROUPS.map((g, gi) => (
            <div key={gi} style={{ marginTop: g.title ? 14 : 2 }}>
              {g.title && <div style={{ padding: '4px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: T.color.railTextDim }}>{g.title}</div>}
              {g.items.map((it) => <NavItem key={it.key} item={it} active={isActive(it)} />)}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: `1px solid ${T.color.railBorder}`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={me.name} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.color.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name || 'Your account'}</div>
            <div style={{ fontSize: 11.5, color: T.color.railTextDim, textTransform: 'capitalize' }}>{roleLabel}</div>
          </div>
          <button onClick={logout} title="Sign out" className="emx-topbtn" style={{ display: 'flex', padding: 7, borderRadius: 6, background: 'transparent', border: 'none', color: T.color.railTextDim, cursor: 'pointer' }}>{Icons.logout}</button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar — acrylic */}
        <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 14, height: 56, padding: '0 28px', background: T.color.acrylic, backdropFilter: 'blur(20px) saturate(140%)', WebkitBackdropFilter: 'blur(20px) saturate(140%)', borderBottom: `1px solid ${T.color.border}` }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: 440 }}>
            <span style={{ position: 'absolute', left: 12, display: 'flex', color: T.color.text3 }}>{Icons.search}</span>
            <input placeholder="Search candidates, jobs…" className="emx-input" style={{ width: '100%', height: 36, padding: '0 12px 0 38px', fontFamily: T.font.sans, fontSize: 13.5, color: T.color.text, background: T.color.surface, border: `1px solid ${T.color.border}`, borderRadius: 6 }} />
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/employer/notifications" className="emx-topbtn" title="Notifications" style={{ display: 'flex', padding: 8, borderRadius: 6, color: T.color.text2, background: T.color.surface, border: `1px solid ${T.color.border}`, textDecoration: 'none' }}>{Icons.notifications}</Link>
          <Link href="/employer/profile" style={{ textDecoration: 'none' }}><Avatar name={me.name} size={36} /></Link>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, minWidth: 0, padding: '28px 28px 64px', maxWidth: 1280, width: '100%', margin: '0 auto' }} className="emx-fade">
          {children}
        </main>
      </div>
    </div>
  );
}
