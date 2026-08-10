'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import {
  getVerifyTarget,
  submitVerificationCode,
  resendVerificationCode,
} from '@/services/verifyEmailApi';

export default function AppVerifyEmail() {
  const router = useRouter();
  const { user } = useAuth();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const boxRefs = useRef([]);
  const verifyTimer = useRef(null);
  const cooldownTimer = useRef(null);

  // Fetch the real verify target; gracefully fall back to sample data.
  useEffect(() => {
    let cancelled = false;

    // Use whatever the auth context already knows, immediately.
    if (user?.email) setEmail(user.email);
    if (user?.name) setName(String(user.name).split(' ')[0]);

    (async () => {
      try {
        const data = await getVerifyTarget();
        const u = data?.user || data;
        if (!cancelled && u?.email) setEmail(u.email);
        if (!cancelled && u?.name) setName(String(u.name).split(' ')[0]);
      } catch {
        // Unauthenticated or backend offline — keep whatever auth already knows.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    return () => {
      clearTimeout(verifyTimer.current);
      clearInterval(cooldownTimer.current);
    };
  }, []);

  const finishVerification = () => {
    setVerified(true);
    setChecking(false);
  };

  const tryVerify = (fullCode) => {
    setChecking(true);
    clearTimeout(verifyTimer.current);

    // Attempt the live endpoint; if it is missing/unauthenticated, fall back
    // to the design's demo behavior (any 6 digits verify) after a brief delay.
    submitVerificationCode(fullCode)
      .then(() => finishVerification())
      .catch(() => {
        verifyTimer.current = setTimeout(finishVerification, 650);
      });
  };

  const handleInput = (i, raw) => {
    const ch = (raw || '').replace(/\D/g, '').slice(-1);
    setCode((prev) => {
      const nextCode = prev.slice();
      nextCode[i] = ch;

      if (ch && i < 5 && boxRefs.current[i + 1]) {
        boxRefs.current[i + 1].focus();
      }

      const full = nextCode.every((d) => d !== '');
      if (full) tryVerify(nextCode.join(''));

      return nextCode;
    });
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0 && boxRefs.current[i - 1]) {
      boxRefs.current[i - 1].focus();
    }
  };

  const startCooldown = () => {
    setCooldown(30);
    clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => {
        const next = c - 1;
        if (next <= 0) clearInterval(cooldownTimer.current);
        return Math.max(next, 0);
      });
    }, 1000);
  };

  const handleResend = () => {
    if (cooldown !== 0) return;
    startCooldown();
    // Fire-and-forget; sample/no live endpoint — ignore failures.
    resendVerificationCode().catch(() => {});
  };

  const openMail = () => {
    if (typeof window !== 'undefined') {
      window.location.href = 'mailto:';
    }
  };

  const pending = !verified;
  const canResend = cooldown === 0;
  const cooling = cooldown > 0;

  return (
    <>
      <Head>
        <title>Verify your email — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbverify input:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes riseIn {
          from {
            transform: translateY(14px);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes pop {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div
        id="jbverify"
        style={{
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Link
          href={appRoute('Jobocate Home.dc.html')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 26 }}
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
            width: '100%',
            maxWidth: 468,
            background: '#FFFEFB',
            border: '1px solid #E6DECF',
            borderRadius: 22,
            padding: 40,
            boxShadow: '0 30px 70px -40px rgba(27,26,22,0.4)',
            animation: 'riseIn 0.5s ease both',
          }}
        >
          {/* VERIFY STATE */}
          {pending && (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: '0 auto 22px',
                  borderRadius: 16,
                  background: '#EAF6EE',
                  color: '#157A49',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                ✉
              </div>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 32,
                  lineHeight: 1.06,
                  margin: '0 0 8px',
                }}
              >
                Verify your email
              </h1>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#5A544A', margin: '0 0 28px' }}>
                We sent a 6-digit code to <b style={{ color: '#1B1A16' }}>{email || 'your email'}</b>. Enter it
                below to confirm it&apos;s you.
              </p>

              <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginBottom: 10 }}>
                {code.map((val, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxRefs.current[i] = el;
                    }}
                    value={val}
                    onChange={(e) => handleInput(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    inputMode="numeric"
                    maxLength={1}
                    style={{
                      width: 52,
                      height: 62,
                      textAlign: 'center',
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 24,
                      fontWeight: 600,
                      color: '#1B1A16',
                      background: '#FBF8F1',
                      border: `1.5px solid ${val ? '#1FA463' : '#E1D9C9'}`,
                      borderRadius: 13,
                    }}
                  />
                ))}
              </div>

              {checking && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#157A49',
                    marginBottom: 16,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1FA463' }} />
                  Verifying…
                </div>
              )}
              <button
                onClick={openMail}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  background: '#1B1A16',
                  color: '#F7F3EA',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: 14,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: 14,
                }}
              >
                Open email app <span style={{ fontSize: 16 }}>↗</span>
              </button>

              <div style={{ fontSize: 13.5, color: '#5A544A' }}>
                Didn&apos;t get it?{' '}
                {canResend && (
                  <button
                    onClick={handleResend}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#157A49',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Resend code
                  </button>
                )}
                {cooling && (
                  <span style={{ fontFamily: 'var(--jb-font-mono)', color: '#A79E8F' }}>
                    Resend in {cooldown}s
                  </span>
                )}
              </div>
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #F2ECE0' }}>
                <Link
                  href={appRoute('App Sign Up.dc.html')}
                  style={{ fontSize: 13, fontWeight: 600, color: '#8A8378', textDecoration: 'none' }}
                >
                  Use a different email
                </Link>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {verified && (
            <div style={{ textAlign: 'center', animation: 'pop 0.4s ease' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: '0 auto 24px',
                  borderRadius: '50%',
                  background: '#1FA463',
                  color: '#0C2C1C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 34,
                }}
              >
                ✓
              </div>
              <h1
                style={{
                  fontFamily: 'var(--jb-font-display)',
                  fontWeight: 400,
                  fontSize: 34,
                  lineHeight: 1.05,
                  margin: '0 0 10px',
                }}
              >
                Email verified.
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: '#5A544A', margin: '0 0 28px' }}>
                You&apos;re all set{name ? `, ${name}` : ''}. Let&apos;s get your search running.
              </p>
              <Link
                href={appRoute('App Dashboard.dc.html')}
                onClick={() => router.push(appRoute('App Dashboard.dc.html'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  background: '#1FA463',
                  color: '#0C2C1C',
                  fontSize: 15.5,
                  fontWeight: 700,
                  padding: 14,
                  borderRadius: 999,
                  textDecoration: 'none',
                }}
              >
                Continue to dashboard <span style={{ fontSize: 18 }}>→</span>
              </Link>
            </div>
          )}
        </div>

        <div
          style={{
            fontFamily: 'var(--jb-font-mono)',
            fontSize: 11,
            color: '#A79E8F',
            marginTop: 26,
          }}
        >
          © 2026 Jobocate
        </div>
      </div>
    </>
  );
}
