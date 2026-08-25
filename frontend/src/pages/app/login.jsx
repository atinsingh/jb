'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appRoute } from '@/components/app/appRoutes';
import Logo from '@/components/brand/Logo';
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

  // Employer-branded sign-in when arriving from the employer marketing site
  // (/app/login?as=employer). Copy + accent adapt; the flow is otherwise
  // identical and the post-login redirect stays role-aware.
  const asEmployer = router.query.as === 'employer';
  // The employer variant used to carry its own blue accent. It no longer needs
  // to: --jb-a-accent IS that blue now, so both surfaces share one colour and
  // only the copy differs.
  const copy = asEmployer
    ? {
        badge: 'Welcome back',
        heading: ['Log in to keep', 'hiring on autopilot.'],
        sub: 'Your candidates, interviews and AI recruiter are waiting.',
        signupHref: '/app/signup?as=employer',
        aside: 'Your recruiting copilot, still working',
        stat1: ['37', 'screened overnight'],
        stat2: ['8', 'interviews booked'],
        promise: 'Every shortlist shows the reasoning behind it, and nothing is sent without your approval.',
        trust: 'Free to post your first role · No card required',
      }
    : {
        badge: 'Welcome back',
        heading: ['Log in to keep', 'the search running.'],
        sub: 'Your matches and auto-applications are waiting.',
        signupHref: '/app/signup',
        aside: 'Your copilot, still working',
        stat1: ['14', 'new matches'],
        stat2: ['6', 'auto-applied'],
        promise: 'Every match shows why it fits, and nothing is submitted until you approve it.',
        trust: 'Free to start · You approve every application',
      };

  // Role-aware landing: employers go to the employer surface, human career
  // agents to the concierge console, everyone else to the candidate app.
  const landingFor = (u) =>
    u?.role === 'ROLE_EMPLOYER'
      ? '/employer/dashboard'
      : u?.role === 'ROLE_AGENT'
      ? '/agent/dashboard'
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

  // Shared field classes: the focus ring replaces the old styled-jsx
  // `#jblogin input:focus` rule.
  const fieldStyle = {
    height: 50,
    width: '100%',
    padding: '0 14px',
    border: '1px solid var(--jb-a-line-strong)',
    borderRadius: 9,
    background: 'var(--jb-a-card)',
    fontFamily: 'inherit',
    fontSize: 15,
    color: 'var(--jb-a-ink)',
  };

  const oauthBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    width: '100%',
    borderRadius: 9,
    border: '1px solid var(--jb-a-line-strong)',
    background: 'var(--jb-a-card)',
    fontFamily: 'inherit',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--jb-a-ink)',
    cursor: 'pointer',
  };

  return (
    <>
      <Head>
        <title>Sign in · Jobocate</title>
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--jb-a-card)', color: 'var(--jb-a-ink)', fontFamily: 'var(--jb-font-sans)' }}>
        {/* ── FORM ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 'clamp(28px, 5vw, 44px) clamp(20px, 5vw, 52px)', overflow: 'auto' }}>
          <Link href={appRoute('Jobocate Home.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'inherit', alignSelf: 'flex-start' }}>
            <Logo size={23} accent="var(--jb-a-accent)" />
          </Link>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 26, maxWidth: 460, width: '100%', margin: '0 auto', paddingTop: 32, paddingBottom: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h1 style={{ margin: 0, fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'var(--jb-a-display-sm)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                Welcome back.
              </h1>
              <span style={{ fontSize: 16, color: 'var(--jb-a-ink-2)' }}>{copy.sub}</span>
            </div>

            {/* OAuth. The marks stay in each provider's own brand colour —
                they identify a third party, so they are the one place on this
                surface where a literal colour is correct. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" onClick={() => startOAuth('google')} style={oauthBtnStyle}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'conic-gradient(from -45deg, #EA4335, #FBBC05, #34A853, #4285F4, #EA4335)',
                  }}
                />
                Continue with Google
              </button>
              <button type="button" onClick={() => startOAuth('linkedin')} style={oauthBtnStyle}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: '#0A66C2',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 11,
                  }}
                >
                  in
                </span>
                Continue with LinkedIn
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ flex: 1, height: 1, background: 'var(--jb-a-line-soft)' }} />
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-a-ink-warm)' }}>
                or email
              </span>
              <span style={{ flex: 1, height: 1, background: 'var(--jb-a-line-soft)' }} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEmailLogin(e);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <label htmlFor="login-email" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--jb-a-ink-2)' }}>Email</span>
                <input
                  id="login-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={fieldStyle}
                />
              </label>

              <label htmlFor="login-password" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--jb-a-ink-2)' }}>Password</span>
                  <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--jb-a-accent)', fontWeight: 600, textDecoration: 'none' }}>
                    Forgot?
                  </Link>
                </span>
                <input
                  id="login-password"
                  name="password"
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={fieldStyle}
                />
              </label>

              {error ? (
                <div
                  role="alert"
                  style={{
                    fontSize: 13.5,
                    color: 'var(--jb-a-danger-ink)',
                    background: 'var(--jb-a-danger-bg)',
                    border: '1px solid var(--jb-a-danger-line)',
                    borderRadius: 9,
                    padding: '10px 13px',
                  }}
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  height: 52,
                  border: 0,
                  borderRadius: 9,
                  background: 'var(--jb-a-accent)',
                  color: 'var(--jb-a-accent-ink)',
                  fontFamily: 'inherit',
                  fontSize: 15.5,
                  fontWeight: 600,
                  marginTop: 4,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <span style={{ fontSize: 14.5, color: 'var(--jb-a-ink-2)' }}>
              New here?{' '}
              <Link href={copy.signupHref} style={{ fontWeight: 600, color: 'var(--jb-a-accent)', textDecoration: 'none' }}>
                Create an account
              </Link>{' '}
              — free, no card.
            </span>
          </div>

          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-a-ink-faint)' }}>© 2026 Jobocate</span>
        </div>

        {/* ── PANEL ─────────────────────────────────────────────────────
            The mockup fills this with a customer quote and labels it
            "Illustrative — swap for a real one before launch". We have no real
            one, and the stat card that used to live here ("14 new matches",
            "6 auto-applied") was invented. So the panel states how the product
            actually behaves, which is true today and needs no attribution.
            Hidden below 900px so the form gets the full width. */}
        <aside className="jb-auth-aside" style={{ width: 300, flexShrink: 0, background: 'var(--jb-a-invert)', color: 'var(--jb-a-invert-ink)', padding: '44px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 20 }}>
          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-a-invert-muted)' }}>
            — {copy.aside}
          </span>
          <span style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 30, lineHeight: 1.2 }}>{copy.promise}</span>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--jb-a-invert-muted)' }}>{copy.trust}</span>
        </aside>

        <style jsx>{`
          @media (max-width: 900px) {
            .jb-auth-aside {
              display: none;
            }
          }
        `}</style>
      </div>
    </>
  );
}
