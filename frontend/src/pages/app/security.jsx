'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { changePassword } from '@/services/securityApi';
import { EmptyState } from '@/components/app/AppStates';

const inputStyle = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 14,
  color: 'var(--jb-v3-fg)',
  background: 'var(--jb-v3-panel)',
  border: '1px solid var(--jb-v3-line)',
  borderRadius: 2,
  padding: '12px 14px',
};

const cardStyle = {
  background: 'var(--jb-v3-panel)',
  border: '1px solid var(--jb-v3-line)',
  borderRadius: 2,
  padding: 24,
};

const h2Style = { fontSize: 17, fontWeight: 700, margin: '0 0 4px' };

export default function AppSecurity() {
  // --- Change password ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwDone, setPwDone] = useState(false);

  // --- Two-factor ---
  const [twofa, setTwofa] = useState(false);

  // --- Connected accounts (no fabricated "connected" state) ---
  const [google, setGoogle] = useState(false);
  const [linkedin, setLinkedin] = useState(false);

  // --- Sessions (no session endpoint yet → genuine empty state) ---
  const [sessions, setSessions] = useState([]);

  // --- Data & privacy ---
  const [exported, setExported] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const handleUpdatePassword = async () => {
    setPwError('');
    setPwDone(false);
    if (!currentPassword || !newPassword) {
      setPwError('Enter your current and new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Use at least 8 characters with a number and a symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPwDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      // Graceful fallback: faithful UI even when unauthenticated / request fails.
      setPwError(err?.message || 'Could not update password right now.');
    } finally {
      setPwSaving(false);
    }
  };

  // ----- Two-factor derived values (from renderVals) -----
  const twofaSub = twofa
    ? 'On — finish setup by scanning the code below.'
    : 'Add a second step at login using an authenticator app.';
  const twofaTrack = twofa ? 'var(--jb-v3-accent)' : 'var(--jb-v3-line-2)';
  const twofaKnob = twofa ? 22 : 2;

  // ----- Connected accounts derived values (from renderVals) -----
  const providers = [
    { key: 'google', name: 'Google', glyph: 'G', iconBg: 'var(--jb-v3-control)', iconColor: 'var(--jb-v3-fg)', linked: google, set: setGoogle },
    // LinkedIn's own brand blue, deliberately NOT tokenised: a provider mark
    // has to stay the provider's colour to be recognisable as one.
    { key: 'linkedin', name: 'LinkedIn', glyph: 'in', iconBg: '#EAF1F8', iconColor: '#0A66C2', linked: linkedin, set: setLinkedin },
  ].map((p) => ({
    name: p.name,
    glyph: p.glyph,
    iconBg: p.iconBg,
    iconColor: p.iconColor,
    status: p.linked ? 'Connected' : 'Not connected',
    statusColor: p.linked ? 'var(--jb-v3-accent)' : 'var(--jb-v3-fg-3)',
    btnLabel: p.linked ? 'Disconnect' : 'Connect',
    btnColor: p.linked ? 'var(--jb-v3-danger)' : 'var(--jb-v3-accent-ink)',
    btnBg: p.linked ? 'var(--jb-v3-panel)' : 'var(--jb-v3-accent)',
    btnBorder: p.linked ? 'var(--jb-v3-danger-line)' : 'var(--jb-v3-accent)',
    toggle: () => p.set((v) => !v),
  }));

  // ----- Sessions derived values (from renderVals) -----
  const sessionRows = sessions.map((s, i, arr) => ({
    ...s,
    divider: i < arr.length - 1 ? 'var(--jb-v3-control)' : 'transparent',
    canSignOut: !s.current,
    signOut: () => setSessions((prev) => prev.filter((x) => x.id !== s.id)),
  }));
  const hasOthers = sessions.some((s) => !s.current);
  const signOutAll = () => setSessions((prev) => prev.filter((x) => x.current));

  // ----- Data & privacy derived values (from renderVals) -----
  const exportLabel = exported ? '✓ Export emailed to you' : '↧ Export my data';
  const canDelete = deleteText.trim().toUpperCase() === 'DELETE';
  const delColor = canDelete ? '#fff' : 'var(--jb-v3-fg-3)';
  const delBg = canDelete ? 'var(--jb-v3-danger)' : 'var(--jb-v3-danger-soft)';
  const delCursor = canDelete ? 'pointer' : 'default';

  return (
    <>
      <Head>
        <title>Security &amp; data — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp input:focus {
          outline: none;
          border-color: var(--jb-v3-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--jb-v3-accent) 15%, transparent);
        }
        #jbapp input::placeholder {
          color: var(--jb-v3-fg-3);
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', fontFamily: 'var(--jb-v3-font-display)', color: 'var(--jb-v3-fg)' }}>
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'relative',   display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--jb-v3-line)' }}>
            <Link href={appRoute('App Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg-2)', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-fg-3)' }}>Security &amp; data</span>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 38, lineHeight: 1, margin: '0 0 24px' }}>Security &amp; data</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* CHANGE PASSWORD */}
              <div style={cardStyle}>
                <h2 style={h2Style}>Change password</h2>
                <p style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-3)', margin: '0 0 18px' }}>Use at least 8 characters with a number and a symbol.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13, maxWidth: 380 }}>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                {pwError && <div style={{ fontSize: 13, color: 'var(--jb-v3-danger)', marginTop: 12 }}>{pwError}</div>}
                {pwDone && <div style={{ fontSize: 13, color: 'var(--jb-v3-accent)', marginTop: 12 }}>✓ Password updated.</div>}
                <button
                  onClick={handleUpdatePassword}
                  disabled={pwSaving}
                  style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', border: 'none', borderRadius: 2, padding: '11px 20px', cursor: pwSaving ? 'default' : 'pointer', marginTop: 16, opacity: pwSaving ? 0.7 : 1 }}
                >
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
              </div>

              {/* TWO-FACTOR */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={h2Style}>Two-factor authentication</h2>
                    <p style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-3)', margin: 0 }}>{twofaSub}</p>
                  </div>
                  <button onClick={() => setTwofa((v) => !v)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ width: 46, height: 26, borderRadius: 2, background: twofaTrack, position: 'relative', display: 'block', transition: 'background 0.2s' }}>
                      <span style={{ position: 'absolute', top: 2, left: twofaKnob, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                    </span>
                  </button>
                </div>
                {twofa && (
                  <div style={{ display: 'flex', gap: 20, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--jb-v3-control)', flexWrap: 'wrap', animation: 'rbpop 0.2s ease' }}>
                    <div style={{ width: 118, height: 118, flexShrink: 0, borderRadius: 2, border: '1px solid var(--jb-v3-line)', background: 'repeating-conic-gradient(var(--jb-v3-fg) 0% 25%, var(--jb-v3-panel) 0% 50%) 0 0 / 16px 16px', opacity: 0.9 }} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg)', marginBottom: 6 }}>Scan with your authenticator app</div>
                      <p style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)', margin: '0 0 12px' }}>Or enter this key manually:</p>
                      <div style={{ display: 'inline-block', fontFamily: 'var(--jb-v3-font-mono)', fontSize: 13, letterSpacing: '0.08em', color: 'var(--jb-v3-fg)', background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: '7px 12px', marginBottom: 14 }}>JBSW Y3DP EHPK 3PXP</div>
                      <div style={{ display: 'flex', gap: 9 }}>
                        <input placeholder="6-digit code" inputMode="numeric" style={{ width: 130, fontFamily: 'var(--jb-v3-font-mono)', fontSize: 14, color: 'var(--jb-v3-fg)', background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: '9px 12px' }} />
                        <button style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', border: 'none', borderRadius: 2, padding: '9px 16px', cursor: 'pointer' }}>Verify</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CONNECTED ACCOUNTS */}
              <div style={cardStyle}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>Connected accounts</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {providers.map((p) => (
                    <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 2, background: p.iconBg, color: p.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-v3-font-mono)', fontWeight: 600, fontSize: 13 }}>{p.glyph}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{p.name}</div>
                        <div style={{ fontSize: 12.5, color: p.statusColor }}>{p.status}</div>
                      </div>
                      <button onClick={p.toggle} style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: p.btnColor, background: p.btnBg, border: `1px solid ${p.btnBorder}`, borderRadius: 2, padding: '8px 16px', cursor: 'pointer' }}>{p.btnLabel}</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTIVE SESSIONS */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Active sessions</h2>
                  {hasOthers && (
                    <button onClick={signOutAll} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out all others</button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {sessionRows.length === 0 ? (
                    <EmptyState
                      icon="🖥️"
                      title="No active sessions to show"
                      hint="Devices signed in to your account will appear here."
                    />
                  ) : (
                    sessionRows.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: `1px solid ${s.divider}` }}>
                      <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 2, background: 'var(--jb-v3-control)', color: 'var(--jb-v3-fg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{s.glyph}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{s.device}</span>
                          {s.current && (
                            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--jb-v3-accent)', background: 'var(--jb-v3-accent-soft)', border: '1px solid var(--jb-v3-accent-line)', padding: '2px 7px', borderRadius: 2 }}>THIS DEVICE</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)', marginTop: 2 }}>{s.location} · {s.when}</div>
                      </div>
                      {s.canSignOut && (
                        <button onClick={s.signOut} style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--jb-v3-fg-2)', background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line-2)', borderRadius: 2, padding: '7px 14px', cursor: 'pointer' }}>Sign out</button>
                      )}
                    </div>
                    ))
                  )}
                </div>
              </div>

              {/* DATA & PRIVACY */}
              <div style={cardStyle}>
                <h2 style={h2Style}>Data &amp; privacy</h2>
                <p style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-3)', margin: '0 0 18px' }}>Download everything we hold about you, or remove your account entirely.</p>
                <button
                  onClick={() => setExported(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg)', background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line-2)', borderRadius: 2, padding: '11px 18px', cursor: 'pointer' }}
                >
                  {exportLabel}
                </button>

                <div style={{ marginTop: 22, padding: 20, background: 'var(--jb-v3-danger-soft)', border: '1px solid var(--jb-v3-danger-line)', borderRadius: 2 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--jb-v3-danger)', marginBottom: 5 }}>Delete account</div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--jb-v3-warn)', margin: '0 0 14px' }}>
                    This permanently removes your profile, résumés, applications and history. This can&rsquo;t be undone. Type <b style={{ fontFamily: 'var(--jb-v3-font-mono)' }}>DELETE</b> to confirm.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                      placeholder="DELETE"
                      style={{ width: 160, fontFamily: 'var(--jb-v3-font-mono)', fontSize: 14, color: 'var(--jb-v3-fg)', background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-danger-line)', borderRadius: 2, padding: '10px 13px' }}
                    />
                    <button
                      disabled={!canDelete}
                      style={{ fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: delColor, background: delBg, border: 'none', borderRadius: 2, padding: '11px 20px', cursor: delCursor }}
                    >
                      Delete account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
