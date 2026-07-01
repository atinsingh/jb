'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appRoute } from '@/components/app/appRoutes';
import { API_URL } from '@/config/api';
import { useAuth } from '@/context/AuthContext';

export default function AppLogin() {
  const router = useRouter();
  const auth = useAuth() || {};
  const { user, loading } = auth;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Role-aware landing: employers go to the employer surface, everyone else
  // to the candidate app dashboard.
  const landingFor = (u) =>
    u?.role === 'ROLE_EMPLOYER'
      ? '/employer/dashboard'
      : appRoute('App Dashboard.dc.html');

  // If already authenticated, bounce to the right dashboard.
  useEffect(() => {
    if (!loading && user) {
      router.replace(landingFor(user));
    }
  }, [loading, user, router]);

  const startOAuth = (provider) => {
    window.location.href = `${API_URL}/api/auth/${provider}`;
  };

  // Email/password sign-in via AuthContext (POST /api/auth/login).
  const handleEmailLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!auth.login || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await auth.login(email, password);
      router.replace(landingFor(result?.user));
    } catch (err) {
      setError(err?.message || 'Could not sign in. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Log in — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jblogin * {
          box-sizing: border-box;
        }
        #jblogin input::placeholder {
          color: #a79e8f;
        }
        #jblogin input:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        id="jblogin"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        {/* FORM SIDE */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '40px 56px' }}>
          <Link href={appRoute('Jobocate Home.dc.html')} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', fontSize: 24, color: '#1B1A16' }}>
              Jobocate<span style={{ color: '#1FA463' }}>.</span>
            </span>
          </Link>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              maxWidth: 400,
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
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5A544A' }}>
                Welcome back
              </span>
            </div>

            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 46, lineHeight: 1.02, letterSpacing: '-0.01em', margin: '0 0 10px' }}>
              Log in to keep
              <br />
              the search running.
            </h1>
            <p style={{ fontSize: 15.5, color: '#5A544A', margin: '0 0 30px' }}>Your matches and auto-applications are waiting.</p>

            {/* OAUTH BUTTONS */}
            <div style={{ display: 'flex', gap: 11, marginBottom: 22 }}>
              <button
                type="button"
                onClick={() => startOAuth('google')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  background: '#FFFEFB',
                  border: '1px solid #D9D0BE',
                  borderRadius: 12,
                  padding: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1B1A16',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'conic-gradient(from -45deg, #EA4335, #FBBC05, #34A853, #4285F4, #EA4335)',
                  }}
                />
                Google
              </button>
              <button
                type="button"
                onClick={() => startOAuth('linkedin')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  background: '#FFFEFB',
                  border: '1px solid #D9D0BE',
                  borderRadius: 12,
                  padding: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1B1A16',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: '#0A66C2',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Bricolage Grotesque',sans-serif",
                    fontWeight: 800,
                    fontSize: 11,
                  }}
                >
                  in
                </span>
                LinkedIn
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <span style={{ flex: 1, height: 1, background: '#E1D9C9' }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A79E8F' }}>
                or with email
              </span>
              <span style={{ flex: 1, height: 1, background: '#E1D9C9' }} />
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: '#46413A', marginBottom: 7, display: 'block' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                fontFamily: 'inherit',
                fontSize: 15,
                color: '#1B1A16',
                background: '#FFFEFB',
                border: '1px solid #D9D0BE',
                borderRadius: 12,
                padding: '13px 15px',
                marginBottom: 18,
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#46413A' }}>Password</label>
              <a href="#" style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>
                Forgot?
              </a>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEmailLogin(e); }}
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
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
            />

            {error ? (
              <div style={{ fontSize: 13, color: '#B4231F', background: '#FBECEA', border: '1px solid #F0CFCB', borderRadius: 10, padding: '10px 13px', marginBottom: 14 }}>
                {error}
              </div>
            ) : null}

            {/* Primary action: email/password sign-in via AuthContext. */}
            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={submitting}
              style={{
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
                width: '100%',
              }}
            >
              {submitting ? 'Signing in…' : 'Log in'} <span style={{ fontSize: 18 }}>→</span>
            </button>

            <p style={{ fontSize: 14, color: '#5A544A', textAlign: 'center', margin: '26px 0 0' }}>
              New here?{' '}
              <Link href="/app/signup" style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}>
                Create an account
              </Link>
            </p>
          </div>

          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F' }}>© 2026 Jobocate</div>
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

          <div style={{ position: 'relative', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5BD08C' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FBF8F1' }}>While you were away</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#5BD08C' }}>● live</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#15140F', borderRadius: 10, padding: 13 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, color: '#FBF8F1' }}>14</div>
                  <div style={{ fontSize: 12, color: '#8A8378' }}>new matches</div>
                </div>
                <div style={{ background: '#15140F', borderRadius: 10, padding: 13 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, color: '#5BD08C' }}>6</div>
                  <div style={{ fontSize: 12, color: '#8A8378' }}>auto-applied</div>
                </div>
              </div>
            </div>

            <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, lineHeight: 1.2, color: '#F2EDE2', margin: '0 0 22px', maxWidth: 420 }}>
              &ldquo;I logged back in to two interview requests I didn&apos;t even have to chase.&rdquo;
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
                MJ
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: '#FBF8F1' }}>Marcus Johnson</div>
                <div style={{ fontSize: 13, color: '#9A9286' }}>Product Manager at Stripe</div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9A9286' }}>
            <span style={{ color: '#1FA463', letterSpacing: '0.1em' }}>★★★★★</span>
            Trusted by 100,000+ job seekers
          </div>
        </div>
      </div>
    </>
  );
}
