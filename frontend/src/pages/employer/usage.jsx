'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { employerBillingApi, employerTeamApi } from '@/services/employerApi';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  InlineError,
} from '@/components/employer/EmployerStates';

const MONO = 'var(--jb-font-mono)';

// Meter definitions map real usage fields to labels — no seeded numbers.
const METER_DEFS = [
  { label: 'Active jobs', usedKey: 'jobSlotsUsed', limitKey: 'jobSlotsLimit', unit: 'slots' },
  { label: 'Team seats', usedKey: 'seatsUsed', limitKey: 'seatsLimit', unit: 'seats' },
  { label: 'AI actions', usedKey: 'aiActionsUsed', limitKey: 'aiActionsLimit', unit: 'this month' },
  { label: 'Sourcing credits', usedKey: 'sourcingCreditsUsed', limitKey: 'sourcingCreditsLimit', unit: 'credits' },
];

const buildMeters = (u) =>
  METER_DEFS.map((d) => {
    const used = typeof u?.[d.usedKey] === 'number' ? u[d.usedKey] : 0;
    const limit = typeof u?.[d.limitKey] === 'number' ? u[d.limitKey] : 0;
    const ratio = limit ? used / limit : 0;
    const near = ratio >= 0.6;
    const danger = ratio >= 0.8;
    const remaining = Math.max(limit - used, 0);
    return {
      label: d.label,
      used,
      limit,
      unit: d.unit,
      remaining,
      near,
      danger,
      pct: Math.min(Math.round(ratio * 100), 100) + '%',
      note: `${remaining} of ${limit} remaining`,
      barColor: danger ? '#C9622E' : near ? '#4263EB' : '#1FA463',
      cardBorder: danger ? '#EAD0C4' : '#E6DECF',
      tag: danger ? 'NEAR LIMIT' : near ? 'IN USE' : 'HEALTHY',
      tagColor: danger ? '#C9622E' : near ? '#4263EB' : '#157A49',
      tagBg: danger ? '#FBEDE4' : near ? '#EDF0FE' : '#EAF6EE',
      tagBorder: danger ? '#EAD0C4' : near ? '#C7D2FB' : '#CDE9D6',
    };
  });

const initials = (name, email) => {
  const src = (name || email || '?').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : src.slice(0, 2).toUpperCase();
};

const fmtRel = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString();
};

export default function EmployerUsage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usage, setUsage] = useState(null);
  const [members, setMembers] = useState([]);
  const [seatsLimit, setSeatsLimit] = useState(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usageRes, teamRes] = await Promise.all([
        employerBillingApi.usage(),
        employerTeamApi.get(),
      ]);
      const u = usageRes?.usage || null;
      setUsage(u);
      setSeatsLimit(typeof u?.seatsLimit === 'number' ? u.seatsLimit : null);
      setMembers(Array.isArray(teamRes?.org?.members) ? teamRes.org.members : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meters = useMemo(() => (usage ? buildMeters(usage) : []), [usage]);
  const warnMeters = meters.filter((m) => m.near);
  const seatsRemaining =
    seatsLimit != null ? Math.max(seatsLimit - members.length, 0) : null;

  const sendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteError(null);
    try {
      await employerTeamApi.invite({ email, role: 'recruiter' });
      setInviteEmail('');
      setInviteOpen(false);
      await load();
    } catch (err) {
      setInviteError(err);
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Usage &amp; limits — Jobocate</title>
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp input:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Plans.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: '#9A9286' }}>Usage this billing period</span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
            {/* TITLE */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 6px' }}>Usage &amp; limits</h1>
              <p style={{ fontSize: 14.5, color: '#5A544A', margin: 0 }}>Where you stand against your plan quotas this billing period.</p>
            </div>

            {loading ? (
              <LoadingState label="Loading usage…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                {/* WARNING STRIP — only when a meter is actually near its limit */}
                {warnMeters.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: '#FBEDE4', border: '1px solid #EAD0C4', borderRadius: 14, padding: '14px 18px', marginBottom: 18 }}>
                    <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', background: '#C9622E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>!</span>
                    <span style={{ flex: 1, fontSize: 13.5, color: '#7A4326' }}>
                      <b>You&rsquo;re approaching a limit.</b>{' '}
                      {warnMeters.map((m) => `${m.label} (${m.used}/${m.limit})`).join(', ')}.
                    </span>
                    <Link href={appRoute('Employer Plans.dc.html')} style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', borderRadius: 999, padding: '8px 15px', textDecoration: 'none' }}>Upgrade</Link>
                  </div>
                )}

                {/* METER CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, marginBottom: 18 }}>
                  {meters.map((m) => (
                    <div key={m.label} style={{ background: '#FFFEFB', border: `1px solid ${m.cardBorder}`, borderRadius: 16, padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{m.label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: m.tagColor, background: m.tagBg, border: `1px solid ${m.tagBorder}`, padding: '3px 8px', borderRadius: 999 }}>{m.tag}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 11 }}>
                        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: '#1B1A16' }}>{m.used}</span>
                        <span style={{ fontSize: 13, color: '#8A8378' }}>/ {m.limit} {m.unit}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: '#EFE8DA', overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: m.pct, height: '100%', background: m.barColor }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#8A8378' }}>{m.note}</span>
                        <Link href={appRoute('Employer Plans.dc.html')} style={{ fontSize: 12, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}>Upgrade →</Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SEATS IN USE */}
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px', borderBottom: '1px solid #F2ECE0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Seats in use</h2>
                  </div>

                  {members.length === 0 ? (
                    <EmptyState icon="○" title="No teammates yet" hint="Invite recruiters and hiring managers to collaborate." />
                  ) : (
                    members.map((s, i) => (
                      <div key={s._id || s.email || i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 22px', borderBottom: `1px solid ${i < members.length - 1 ? '#F2ECE0' : 'transparent'}` }}>
                        <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: '#EDE7DA', color: '#5A544A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{initials(s.name, s.email)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{s.name || s.email || 'Teammate'}</div>
                          <div style={{ fontSize: 11.5, color: '#8A8378' }}>{(s.role || '—').replace(/_/g, ' ')}{s.email && s.name ? ` · ${s.email}` : ''}</div>
                        </div>
                        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: s.status === 'invited' ? '#9A6A2E' : '#157A49', background: s.status === 'invited' ? '#FBF1E2' : '#EAF6EE', border: `1px solid ${s.status === 'invited' ? '#EAD9BE' : '#CDE9D6'}`, padding: '3px 8px', borderRadius: 999 }}>{(s.status || 'active').toUpperCase()}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11, color: '#A79E8F', width: 80, textAlign: 'right' }}>{fmtRel(s.lastActiveAt)}</span>
                      </div>
                    ))
                  )}

                  {/* INVITE ROW */}
                  <div style={{ padding: '13px 22px', background: '#FBF9F4' }}>
                    {inviteOpen ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <InlineError error={inviteError} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="teammate@company.com"
                            style={{ flex: 1, fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 10, padding: '9px 13px' }}
                          />
                          <button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#4263EB', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting || !inviteEmail.trim() ? 0.6 : 1 }}>{inviting ? 'Sending…' : 'Send invite'}</button>
                          <button onClick={() => { setInviteOpen(false); setInviteError(null); }} disabled={inviting} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', border: '1.5px dashed #C9BFAC', color: '#A79E8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>＋</span>
                        <span style={{ flex: 1, fontSize: 13, color: '#8A8378' }}>
                          {seatsRemaining != null ? `${seatsRemaining} seat${seatsRemaining === 1 ? '' : 's'} remaining` : 'Invite a teammate'}
                        </span>
                        <button onClick={() => setInviteOpen(true)} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>Invite →</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
