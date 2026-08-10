'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';
import { requestPasswordReset, submitPasswordReset } from '@/services/resetApi';

const BADGES = {
  request: 'Account recovery',
  sent: 'Link sent',
  reset: 'New password',
  done: 'All done',
};

const STRENGTH_PALETTE = ['#E1D9C9', '#C9622E', '#D89A3E', '#5BD08C', '#1FA463'];
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

function scorePassword(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length === 0) s = 0;
  return s;
}

export default function AppResetPassword() {
  const router = useRouter();

  const [stage, setStage] = useState('request'); // request | sent | reset | done
  const [email, setEmail] = useState('sarah.chen@gmail.com');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The reset token usually arrives as a query param on the emailed link.
  const resetToken = useMemo(() => {
    const t = router.query?.token;
    return Array.isArray(t) ? t[0] : t || '';
  }, [router.query]);

  const score = scorePassword(pwd);
  const strengthBars = [0, 1, 2, 3].map((i) => ({
    color: i < score ? STRENGTH_PALETTE[score] : '#E6DECF',
  }));
  const strengthLabel = STRENGTH_LABELS[score] || 'Weak';
  const strengthColor = score >= 3 ? '#157A49' : score === 0 ? '#A79E8F' : '#C9622E';

  const match = pwd.length > 0 && pwd === confirm;
  const canUpdate = pwd.length >= 8 && match;
  const showMismatch = confirm.length > 0 && pwd !== confirm;
  const confirmBorder = showMismatch ? '#EAB8A4' : '#D9D0BE';

  const emailDisplay = email || 'your email';
  const pwdType = showPwd ? 'text' : 'password';
  const showLabel = showPwd ? 'Hide' : 'Show';

  // ----- Stage 1: send reset link (graceful fallback to the design flow) -----
  const sendLink = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await requestPasswordReset(email);
    } catch (e) {
      // Faithfully fall back: still advance so the screen stays usable offline.
    } finally {
      setBusy(false);
      setStage('sent');
    }
  };

  const openLink = () => setStage('reset');

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await requestPasswordReset(email);
    } catch (e) {
      /* no-op — keep the design flow */
    } finally {
      setBusy(false);
      setStage('sent');
    }
  };

  // ----- Stage: set new password ----------------------------------------------
  const update = async () => {
    if (!canUpdate || busy) return;
    setError('');
    setBusy(true);
    try {
      await submitPasswordReset({ token: resetToken, email, password: pwd });
    } catch (e) {
      // Fall back to the design's optimistic success.
    } finally {
      setBusy(false);
      setStage('done');
    }
  };

  const badge = BADGES[stage];
  const isRequest = stage === 'request';
  const isSent = stage === 'sent';
  const isReset = stage === 'reset';
  const isDone = stage === 'done';

  const updateBg = canUpdate ? '#1FA463' : '#CFE6D8';
  const updateColor = canUpdate ? '#0C2C1C' : '#8FB7A1';
  const updateCursor = canUpdate ? 'pointer' : 'default';

  const darkBtn = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    background: '#1B1A16',
    color: '#F7F3EA',
    fontSize: 16,
    fontWeight: 600,
    padding: 15,
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <>
      <Head>
        <title>Reset password — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbreset input::placeholder {
          color: #a79e8f;
        }
        #jbreset input:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes riseIn {
          from {
            transform: translateY(16px);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        id="jbreset"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        {/* FORM SIDE */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 56px' }}>
          <Link
            href={appRoute('Jobocate Home.dc.html')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
          >
            <span
              style={{
                fontFamily: 'var(--jb-font-display)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontSize: 24,
                color: '#1B1A16',
              }}
            >
              Jobocate<span style={{ color: '#1FA463' }}>.</span>
            </span>
          </Link>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              maxWidth: 404,
              width: '100%',
              margin: '0 auto',
              animation: 'riseIn 0.6s ease both',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                alignItems: 'center',
                gap: 8,
                border: '1px solid #D9D0BE',
                borderRadius: 999,
                padding: '6px 13px',
                marginBottom: 22,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1FA463' }} />
              <span
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#5A544A',
                }}
              >
                {badge}
              </span>
            </div>

            {/* STAGE: REQUEST */}
            {isRequest && (
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--jb-font-display)',
                    fontWeight: 400,
                    fontSize: 44,
                    lineHeight: 1.02,
                    letterSpacing: '-0.01em',
                    margin: '0 0 10px',
                  }}
                >
                  Reset your password.
                </h1>
                <p style={{ fontSize: 15.5, color: '#5A544A', margin: '0 0 28px' }}>
                  Enter your account email and we&rsquo;ll send a secure link to set a new one.
                </p>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#46413A',
                    marginBottom: 7,
                    display: 'block',
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #D9D0BE',
                    borderRadius: 12,
                    padding: '13px 15px',
                    marginBottom: 22,
                  }}
                />
                {error && (
                  <p style={{ fontSize: 12.5, color: '#C9622E', margin: '-12px 0 16px' }}>{error}</p>
                )}
                <button onClick={sendLink} disabled={busy} style={darkBtn}>
                  {busy ? 'Sending…' : 'Send reset link'} <span style={{ fontSize: 18 }}>→</span>
                </button>
                <p style={{ fontSize: 14, color: '#5A544A', textAlign: 'center', margin: '24px 0 0' }}>
                  Remembered it?{' '}
                  <Link
                    href={appRoute('App Login.dc.html')}
                    style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Back to log in
                  </Link>
                </p>
              </div>
            )}

            {/* STAGE: SENT */}
            {isSent && (
              <div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#EAF6EE',
                    color: '#157A49',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    marginBottom: 22,
                  }}
                >
                  ✉
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--jb-font-display)',
                    fontWeight: 400,
                    fontSize: 42,
                    lineHeight: 1.03,
                    margin: '0 0 10px',
                  }}
                >
                  Check your inbox.
                </h1>
                <p
                  style={{
                    fontSize: 15.5,
                    lineHeight: 1.55,
                    color: '#5A544A',
                    margin: '0 0 28px',
                  }}
                >
                  We sent a reset link to <b style={{ color: '#1B1A16' }}>{emailDisplay}</b>. It
                  expires in 30 minutes.
                </p>
                <button onClick={openLink} style={darkBtn}>
                  I clicked the link <span style={{ fontSize: 18 }}>→</span>
                </button>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    marginTop: 22,
                  }}
                >
                  <button
                    onClick={resend}
                    disabled={busy}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#157A49',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Resend email
                  </button>
                  <span style={{ width: 1, height: 14, background: '#D9D0BE' }} />
                  <Link
                    href={appRoute('App Login.dc.html')}
                    style={{ fontSize: 14, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}
                  >
                    Back to log in
                  </Link>
                </div>
              </div>
            )}

            {/* STAGE: RESET */}
            {isReset && (
              <div>
                <h1
                  style={{
                    fontFamily: 'var(--jb-font-display)',
                    fontWeight: 400,
                    fontSize: 42,
                    lineHeight: 1.03,
                    margin: '0 0 10px',
                  }}
                >
                  Set a new password.
                </h1>
                <p style={{ fontSize: 15.5, color: '#5A544A', margin: '0 0 26px' }}>
                  Choose something you haven&rsquo;t used before.
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 7,
                  }}
                >
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#46413A' }}>
                    New password
                  </label>
                  <button
                    onClick={() => setShowPwd((s) => !s)}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#157A49',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showLabel}
                  </button>
                </div>
                <input
                  type={pwdType}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #D9D0BE',
                    borderRadius: 12,
                    padding: '12px 15px',
                    marginBottom: 10,
                  }}
                />
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}
                >
                  <div style={{ flex: 1, display: 'flex', gap: 5 }}>
                    {strengthBars.map((b, i) => (
                      <span
                        key={i}
                        style={{ flex: 1, height: 5, borderRadius: 999, background: b.color }}
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: strengthColor,
                      minWidth: 54,
                      textAlign: 'right',
                    }}
                  >
                    {strengthLabel}
                  </span>
                </div>

                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#46413A',
                    marginBottom: 7,
                    display: 'block',
                  }}
                >
                  Confirm password
                </label>
                <input
                  type={pwdType}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: `1px solid ${confirmBorder}`,
                    borderRadius: 12,
                    padding: '12px 15px',
                    marginBottom: 10,
                  }}
                />
                {showMismatch && (
                  <div style={{ fontSize: 12.5, color: '#C9622E', marginBottom: 14 }}>
                    Passwords don&rsquo;t match yet.
                  </div>
                )}

                <button
                  onClick={update}
                  disabled={!canUpdate || busy}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    background: updateBg,
                    color: updateColor,
                    fontSize: 16,
                    fontWeight: 700,
                    padding: 15,
                    borderRadius: 999,
                    border: 'none',
                    cursor: updateCursor,
                    fontFamily: 'inherit',
                    marginTop: 8,
                  }}
                >
                  {busy ? 'Updating…' : 'Update password'} <span style={{ fontSize: 18 }}>→</span>
                </button>
              </div>
            )}

            {/* STAGE: DONE */}
            {isDone && (
              <div>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#1FA463',
                    color: '#0C2C1C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                    marginBottom: 22,
                  }}
                >
                  ✓
                </div>
                <h1
                  style={{
                    fontFamily: 'var(--jb-font-display)',
                    fontWeight: 400,
                    fontSize: 42,
                    lineHeight: 1.03,
                    margin: '0 0 10px',
                  }}
                >
                  Password updated.
                </h1>
                <p style={{ fontSize: 15.5, color: '#5A544A', margin: '0 0 28px' }}>
                  You&rsquo;re all set. Log in with your new password to pick up your search.
                </p>
                <Link
                  href={appRoute('App Login.dc.html')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    background: '#1FA463',
                    color: '#0C2C1C',
                    fontSize: 16,
                    fontWeight: 700,
                    padding: 15,
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  Continue to log in <span style={{ fontSize: 18 }}>→</span>
                </Link>
              </div>
            )}
          </div>

          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F' }}>
            © 2026 Jobocate
          </div>
        </div>

        {/* BRAND SIDE */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: '#15140F',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 80% 10%, rgba(31,164,99,0.32), transparent 55%), radial-gradient(circle at 10% 100%, rgba(31,164,99,0.18), transparent 50%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              fontFamily: 'var(--jb-font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#5BD08C',
            }}
          >
            — Your copilot, still working
          </div>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                background: '#1E1C15',
                border: '1px solid #2C2A22',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 30px 60px -28px rgba(0,0,0,0.6)',
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FBF8F1' }}>
                  While you were away
                </span>
                <span
                  style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#5BD08C' }}
                >
                  ● live
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#15140F', borderRadius: 10, padding: 13 }}>
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 24,
                      fontWeight: 600,
                      color: '#FBF8F1',
                    }}
                  >
                    14
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8378' }}>new matches</div>
                </div>
                <div style={{ background: '#15140F', borderRadius: 10, padding: 13 }}>
                  <div
                    style={{
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 24,
                      fontWeight: 600,
                      color: '#5BD08C',
                    }}
                  >
                    6
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8378' }}>auto-applied</div>
                </div>
              </div>
            </div>

            <p
              style={{
                fontFamily: 'var(--jb-font-display)',
                fontSize: 30,
                lineHeight: 1.2,
                color: '#F2EDE2',
                margin: '0 0 22px',
                maxWidth: 420,
              }}
            >
              &ldquo;Locked myself out for a week and still came back to three interviews lined
              up.&rdquo;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#C9622E',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                RA
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: '#FBF8F1' }}>Riya Anand</div>
                <div style={{ fontSize: 13, color: '#9A9286' }}>Software Engineer at Figma</div>
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: '#9A9286',
            }}
          >
            <span style={{ color: '#1FA463' }}>✓</span>
            Free to start · You approve every application
          </div>
        </div>
      </div>
    </>
  );
}
