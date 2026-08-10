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
  // Accent is one of two known brand colours, so we branch static Tailwind
  // classes rather than compute a colour at runtime.
  const accentDot = asEmployer ? 'bg-[#4263EB]' : 'bg-jb-green';
  const accentText = asEmployer ? 'text-[#4263EB]' : 'text-jb-green';
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
  const fieldClass =
    'w-full font-sans text-[15px] text-jb-ink bg-jb-paper border border-jb-line-input rounded-xl px-[15px] py-[13px] ' +
    'placeholder:text-jb-ink-ghost transition-[box-shadow,border-color] duration-150 ' +
    'focus:outline-none focus:border-jb-green focus:shadow-[0_0_0_3px_rgba(31,164,99,0.15)]';
  const oauthBtnClass =
    'flex-1 flex items-center justify-center gap-[9px] bg-jb-paper border border-jb-line-input rounded-xl p-3 ' +
    'cursor-pointer font-sans text-sm font-semibold text-jb-ink';

  return (
    <>
      <Head>
        <title>Log in — Jobocate</title>
      </Head>

      <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen bg-jb-cream font-sans text-jb-ink">
        {/* FORM SIDE */}
        <div className="flex flex-col px-6 py-10 sm:px-14">
          <Link href={appRoute('Jobocate Home.dc.html')} className="flex items-center gap-[9px] no-underline">
            {/* Was a hand-rolled "Jobocate." wordmark, so the auth screens
                carried a different logo from every other page. */}
            <Logo size={26} />
          </Link>

          <div className="flex-1 flex flex-col justify-center w-full max-w-[400px] mx-auto animate-rise-in">
            <div className="inline-flex self-start items-center gap-2 border border-jb-line-input rounded-full px-[13px] py-[6px] mb-[22px]">
              <span className={`w-1.5 h-1.5 rounded-full ${accentDot}`} />
              <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-jb-ink-muted">
                {copy.badge}
              </span>
            </div>

            <h1 className="font-display font-normal text-[46px] leading-[1.02] tracking-[-0.01em] mb-2.5">
              {copy.heading[0]}
              <br />
              {copy.heading[1]}
            </h1>
            <p className="text-[15.5px] text-jb-ink-muted mb-[30px]">{copy.sub}</p>

            {/* OAUTH BUTTONS */}
            <div className="flex gap-[11px] mb-[22px]">
              <button type="button" onClick={() => startOAuth('google')} className={oauthBtnClass}>
                <span className="w-[18px] h-[18px] rounded-full bg-[conic-gradient(from_-45deg,#EA4335,#FBBC05,#34A853,#4285F4,#EA4335)]" />
                Google
              </button>
              <button type="button" onClick={() => startOAuth('linkedin')} className={oauthBtnClass}>
                <span className="w-[18px] h-[18px] rounded bg-[#0A66C2] text-white flex items-center justify-center font-display font-extrabold text-[11px]">
                  in
                </span>
                LinkedIn
              </button>
            </div>

            <div className="flex items-center gap-3.5 mb-[22px]">
              <span className="flex-1 h-px bg-jb-line-3" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-jb-ink-ghost">
                or with email
              </span>
              <span className="flex-1 h-px bg-jb-line-3" />
            </div>

            <label htmlFor="login-email" className="block text-[13px] font-semibold text-jb-ink-heading mb-[7px]">Email</label>
            <input
              id="login-email"
              name="email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${fieldClass} mb-[18px]`}
            />

            <div className="flex items-center justify-between mb-[7px]">
              <label htmlFor="login-password" className="text-[13px] font-semibold text-jb-ink-heading">Password</label>
              <a href="#" className="text-[13px] font-semibold text-jb-green-text no-underline">
                Forgot?
              </a>
            </div>
            <input
              id="login-password"
              name="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleEmailLogin(e); }}
              className={`${fieldClass} mb-[22px]`}
            />

            {error ? (
              <div className="text-[13px] text-jb-danger bg-jb-danger-tint border border-jb-danger-line rounded-[10px] px-[13px] py-2.5 mb-3.5">
                {error}
              </div>
            ) : null}

            {/* Primary action: email/password sign-in via AuthContext. */}
            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={submitting}
              className="flex items-center justify-center gap-[9px] w-full bg-jb-ink text-jb-cream text-base font-semibold p-[15px] rounded-full border-none cursor-pointer font-sans"
            >
              {submitting ? 'Signing in…' : 'Log in'} <span className="text-[18px]">→</span>
            </button>

            <p className="text-sm text-jb-ink-muted text-center mt-[26px]">
              New here?{' '}
              <Link href={copy.signupHref} className={`${accentText} font-semibold no-underline`}>
                Create an account
              </Link>
            </p>
          </div>

          <div className="font-mono text-[11px] text-jb-ink-ghost">© 2026 Jobocate</div>
        </div>

        {/* BRAND SIDE — hidden on mobile so the form gets the full width. */}
        <div className="relative overflow-hidden bg-jb-deep p-12 hidden md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_10%,rgba(31,164,99,0.32),transparent_55%),radial-gradient(circle_at_10%_100%,rgba(31,164,99,0.18),transparent_50%)]" />

          <div className="relative font-mono text-[11px] tracking-[0.14em] uppercase text-jb-green-on-dark">
            — {copy.aside}
          </div>

          <div className="relative">
            <div className="bg-[#1e1c15] border border-[#2c2a22] rounded-2xl p-5 shadow-[0_30px_60px_-28px_rgba(0,0,0,0.6)] mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-bold text-[#fbf8f1]">While you were away</span>
                <span className="font-mono text-[11px] text-jb-green-on-dark">● live</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-jb-deep rounded-[10px] p-[13px]">
                  <div className="font-mono text-2xl font-semibold text-[#fbf8f1]">{copy.stat1[0]}</div>
                  <div className="text-xs text-jb-ink-subtle">{copy.stat1[1]}</div>
                </div>
                <div className="bg-jb-deep rounded-[10px] p-[13px]">
                  <div className="font-mono text-2xl font-semibold text-jb-green-on-dark">{copy.stat2[0]}</div>
                  <div className="text-xs text-jb-ink-subtle">{copy.stat2[1]}</div>
                </div>
              </div>
            </div>

            {/*
              An attributed testimonial ran here — "Marcus Johnson, Product
              Manager at Stripe" for candidates, "Dana Whitfield, Head of Talent
              at Northwind" for employers. Neither person nor customer exists.
              Replaced with a factual statement of how the product behaves.
            */}
            <p className="font-display text-[30px] leading-[1.2] text-[#f2ede2] m-0 max-w-[420px]">
              {copy.promise}
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-[13px] text-jb-ink-faint">
            <span className={accentText}>✓</span>
            {copy.trust}
          </div>
        </div>
      </div>
    </>
  );
}
