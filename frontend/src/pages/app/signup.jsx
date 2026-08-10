'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { appRoute } from '@/components/app/appRoutes';
import Logo from '@/components/brand/Logo';
import { API_URL } from '@/config/api';

// Password strength scoring (ported from the design's DCLogic.strength)
function passwordStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length === 0) s = 0;
  return s;
}

export default function AppSignUp() {
  const router = useRouter();
  const { signup } = useAuth() || {};

  const [stage, setStage] = useState('role'); // 'role' | 'form'
  const [role, setRole] = useState('seeker'); // 'seeker' | 'employer'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Arriving from the employer sign-in flow (/app/signup?as=employer) preselects
  // the employer role and skips straight to the form.
  useEffect(() => {
    if (router.query.as === 'employer') {
      setRole('employer');
      setStage('form');
    }
  }, [router.query.as]);

  const seeker = role === 'seeker';
  const isRoleStage = stage === 'role';
  const isFormStage = stage === 'form';

  // Accent is one of two known brand colours (seeker green / employer blue), so
  // we branch static Tailwind classes rather than compute colours at runtime.
  const accentBtn = seeker ? 'bg-jb-green text-jb-green-ink' : 'bg-[#4263EB] text-white';
  const accentFocus = seeker
    ? 'focus:border-jb-green focus:shadow-[0_0_0_3px_rgba(31,164,99,0.15)]'
    : 'focus:border-[#4263EB] focus:shadow-[0_0_0_3px_rgba(66,99,235,0.15)]';

  // ----- role-select cards -----
  const choiceDefs = [
    { key: 'seeker', glyph: '◎', title: 'I’m looking for a job', desc: 'Build a résumé, get matched, and auto-apply to roles that fit.' },
    { key: 'employer', glyph: '⛯', title: 'I’m hiring', desc: 'Post roles and let an AI recruiter screen, source and schedule.' },
  ];
  const choices = choiceDefs.map((c) => {
    const on = role === c.key;
    const s = c.key === 'seeker';
    return {
      key: c.key,
      title: c.title,
      desc: c.desc,
      glyph: c.glyph,
      cardClass: [
        on ? (s ? 'bg-[#F4FBF6] border-jb-green' : 'bg-[#F5F7FE] border-[#4263EB]') : 'bg-jb-paper border-jb-line-2',
        on ? (s ? 'shadow-[0_0_0_3px_rgba(31,164,99,0.16)]' : 'shadow-[0_0_0_3px_rgba(66,99,235,0.16)]') : '',
      ].join(' '),
      iconClass: s ? 'bg-jb-green-tint text-jb-green-text' : 'bg-[#EDF0FE] text-[#4263EB]',
      radioClass: on ? (s ? 'border-jb-green bg-jb-green' : 'border-[#4263EB] bg-[#4263EB]') : 'border-[#D2C9B7] bg-transparent',
      check: on ? '✓' : '',
      pick: () => setRole(c.key),
    };
  });

  // ----- password strength -----
  const score = passwordStrength(password);
  // Filled-bar colour by score; index 0 is unused (empty state uses the track).
  const barPalette = ['bg-jb-line-3', 'bg-[#C9622E]', 'bg-[#D89A3E]', 'bg-jb-green-on-dark', 'bg-jb-green'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthLabel = labels[score] || 'Weak';
  const strengthColor = score >= 3 ? 'text-jb-green-text' : score === 0 ? 'text-jb-ink-ghost' : 'text-jb-amber-ink';

  // ----- role-adaptive copy -----
  const roleLabel = seeker ? 'Job seeker' : 'Employer';
  const heading = seeker ? 'Create your account.' : 'Create your hiring account.';
  const subhead = seeker
    ? 'Two minutes to set up — then your copilot takes over.'
    : 'Set up your team and post your first role in minutes.';
  const ssoSecond = seeker ? 'LinkedIn' : 'Microsoft';
  const nameLabel = seeker ? 'Full name' : 'Your name';
  const namePlaceholder = 'Your name';
  const emailLabel = seeker ? 'Email' : 'Work email';
  const emailPlaceholder = seeker ? 'you@email.com' : 'you@company.com';
  const ctaLabel = 'Create account';

  // ----- brand panel (role adaptive) -----
  const brandGlow = seeker
    ? 'bg-[radial-gradient(circle_at_82%_8%,rgba(31,164,99,0.32),transparent_55%),radial-gradient(circle_at_8%_100%,rgba(31,164,99,0.18),transparent_50%)]'
    : 'bg-[radial-gradient(circle_at_82%_8%,rgba(66,99,235,0.34),transparent_55%),radial-gradient(circle_at_8%_100%,rgba(66,99,235,0.18),transparent_50%)]';
  const kickerColor = seeker ? 'text-jb-green-on-dark' : 'text-[#8DA2F5]';
  const perkIcon = seeker ? 'bg-[#1E2D24] text-jb-green-on-dark' : 'bg-[#1E2436] text-[#8DA2F5]';
  const brandKicker = seeker ? 'Free to start' : 'Free to post your first role';
  const brandHeadline = seeker ? 'Set it up once. Wake up to interviews.' : 'Post once. Wake up to a shortlist.';
  const perks = seeker
    ? ['AI résumé & tailored cover letters', 'Daily matches ranked by real fit', 'Auto-apply to verified careers pages', 'Interview prep that actually helps']
    : ['Autopilot screens & ranks every applicant', 'AI sourcing finds passive talent', 'AI interviews + auto-generated scorecards', 'One-tap approval on every action'];
  const statTitle = 'Your first week, typically';
  const stat1 = seeker ? '120+' : '37→6';
  const stat1Label = seeker ? 'ranked matches' : 'applicants to shortlist';
  const stat2 = seeker ? '48h' : '3×';
  const stat2Label = seeker ? 'to first interview' : 'faster time-to-hire';
  const brandFootnote = seeker
    ? 'Free forever tier · you approve every application'
    : 'Post your first role free · no card required';

  // ----- backend wiring -----
  const handleSignup = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email and password.');
      return;
    }

    const backendRole = seeker ? 'ROLE_CANDIDATE' : 'ROLE_EMPLOYER';
    const destination = seeker ? '/app/onboarding' : '/employer/onboarding';

    setSubmitting(true);
    try {
      if (typeof signup === 'function') {
        await signup({ name: name.trim(), email: email.trim(), password, role: backendRole });
      }
      router.push(destination);
    } catch (err) {
      setError(err?.message || 'Could not create your account. Please try again.');
      setSubmitting(false);
    }
  };

  const handleOAuth = (provider) => {
    if (typeof window !== 'undefined') {
      // Carry the chosen role so an employer signing up via OAuth is created
      // with ROLE_EMPLOYER (not the default candidate role).
      const roleParam = seeker ? '' : `?role=ROLE_EMPLOYER`;
      window.location.href = `${API_URL}/api/auth/${provider}${roleParam}`;
    }
  };

  const fieldClass =
    'w-full font-sans text-[15px] text-jb-ink bg-jb-paper border border-jb-line-input rounded-xl px-[15px] py-3 ' +
    'placeholder:text-jb-ink-ghost transition-[box-shadow,border-color] duration-150 focus:outline-none ' + accentFocus;
  const oauthBtnClass =
    'flex-1 flex items-center justify-center gap-[9px] bg-jb-paper border border-jb-line-input rounded-xl p-3 ' +
    'cursor-pointer font-sans text-sm font-semibold text-jb-ink';

  return (
    <>
      <Head>
        <title>Sign up — Jobocate</title>
      </Head>

      <div className="grid grid-cols-1 min-[880px]:grid-cols-2 min-h-screen bg-jb-cream font-sans text-jb-ink">
        {/* FORM SIDE */}
        <div className="flex flex-col px-6 py-9 sm:px-14">
          <Link href={appRoute('Jobocate Home.dc.html')} className="flex items-center gap-[9px] no-underline">
            {/* Same wordmark unification as /app/login. */}
            <Logo size={26} />
          </Link>

          <div className="flex-1 flex flex-col justify-center w-full max-w-[420px] mx-auto py-6 animate-rise-in">
            {/* ===== STAGE 1: ROLE SELECT ===== */}
            {isRoleStage && (
              <div>
                <div className="inline-flex self-start items-center gap-2 border border-jb-line-input rounded-full px-[13px] py-1.5 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-jb-green" />
                  <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-jb-ink-muted">
                    Free to start
                  </span>
                </div>
                <h1 className="font-display font-normal text-[42px] leading-[1.03] tracking-[-0.01em] mb-2">
                  What brings you here?
                </h1>
                <p className="text-[15px] text-jb-ink-muted mb-[26px]">
                  Choose how you&rsquo;ll use Jobocate &mdash; you can switch later.
                </p>

                <div className="flex flex-col gap-[13px]">
                  {choices.map((c) => (
                    <button
                      key={c.key}
                      onClick={c.pick}
                      className={`relative text-left flex items-center gap-4 border-[1.5px] rounded-2xl p-5 cursor-pointer font-sans ${c.cardClass}`}
                    >
                      <span className={`w-12 h-12 flex-shrink-0 rounded-[13px] flex items-center justify-center text-[22px] ${c.iconClass}`}>
                        {c.glyph}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[17px] font-bold text-jb-ink mb-[3px]">{c.title}</span>
                        <span className="block text-[13.5px] leading-[1.45] text-jb-ink-subtle">{c.desc}</span>
                      </span>
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full border-[1.5px] text-white flex items-center justify-center text-[13px] ${c.radioClass}`}>
                        {c.check}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStage('form')}
                  className={`flex items-center justify-center gap-[9px] w-full text-base font-bold p-[15px] rounded-full border-none cursor-pointer mt-6 font-sans ${accentBtn}`}
                >
                  Continue <span className="text-[17px]">&rarr;</span>
                </button>
                <p className="text-sm text-jb-ink-muted text-center mt-[18px]">
                  Already have an account?{' '}
                  <Link href={appRoute('App Login.dc.html')} className="text-jb-green-text font-semibold no-underline">
                    Log in
                  </Link>
                </p>
              </div>
            )}

            {/* ===== STAGE 2: FORM ===== */}
            {isFormStage && (
              <form onSubmit={handleSignup} className="animate-rb-pop">
                <button
                  type="button"
                  onClick={() => setStage('role')}
                  className="inline-flex items-center gap-[7px] font-sans text-[13px] font-semibold text-jb-ink-muted bg-transparent border-none cursor-pointer p-0 mb-[18px]"
                >
                  &larr; {roleLabel}
                </button>

                <h1 className="font-display font-normal text-[38px] leading-[1.03] tracking-[-0.01em] mb-2">
                  {heading}
                </h1>
                <p className="text-[15px] text-jb-ink-muted mb-[22px]">{subhead}</p>

                <div className="flex gap-[11px] mb-5">
                  <button type="button" onClick={() => handleOAuth('google')} className={oauthBtnClass}>
                    <span className="w-[18px] h-[18px] rounded-full bg-[conic-gradient(from_-45deg,#EA4335,#FBBC05,#34A853,#4285F4,#EA4335)]" />
                    Google
                  </button>
                  <button type="button" onClick={() => handleOAuth(seeker ? 'linkedin' : 'microsoft')} className={oauthBtnClass}>
                    <span className="w-[18px] h-[18px] rounded bg-[#0A66C2] text-white font-mono text-[11px] font-semibold flex items-center justify-center">
                      in
                    </span>
                    {ssoSecond}
                  </button>
                </div>

                <div className="flex items-center gap-3.5 mb-5">
                  <span className="flex-1 h-px bg-jb-line-3" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-jb-ink-ghost">
                    or with email
                  </span>
                  <span className="flex-1 h-px bg-jb-line-3" />
                </div>

                <label htmlFor="signup-name" className="block text-[13px] font-semibold text-jb-ink-heading mb-[7px]">{nameLabel}</label>
                <input
                  id="signup-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                  className={`${fieldClass} mb-4`}
                />

                <label htmlFor="signup-email" className="block text-[13px] font-semibold text-jb-ink-heading mb-[7px]">{emailLabel}</label>
                <input
                  id="signup-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={emailPlaceholder}
                  className={`${fieldClass} mb-4`}
                />

                <div className="flex items-center justify-between mb-[7px]">
                  <label htmlFor="signup-password" className="text-[13px] font-semibold text-jb-ink-heading">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="font-sans text-[13px] font-semibold text-jb-green-text bg-transparent border-none cursor-pointer p-0"
                  >
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="signup-password"
                  name="password"
                  autoComplete="new-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`${fieldClass} mb-2.5`}
                />

                <div className="flex items-center gap-2.5 mb-[22px]">
                  <div className="flex-1 flex gap-[5px]">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`flex-1 h-[5px] rounded-full ${i < score ? barPalette[score] : 'bg-jb-line-2'}`} />
                    ))}
                  </div>
                  <span className={`font-mono text-[11px] font-semibold min-w-[54px] text-right ${strengthColor}`}>
                    {strengthLabel}
                  </span>
                </div>

                {error && (
                  <div className="text-[13px] text-jb-amber-ink bg-[#FBEFE7] border border-[#F0D7C5] rounded-xl px-3.5 py-[11px] mb-4">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center justify-center gap-[9px] w-full text-base font-bold p-[15px] rounded-full border-none font-sans ${accentBtn} ${submitting ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
                >
                  {submitting ? 'Creating…' : ctaLabel} <span className="text-[18px]">&rarr;</span>
                </button>

                <p className="text-[12.5px] leading-[1.5] text-jb-ink-subtle text-center mt-4">
                  By continuing you agree to our{' '}
                  <a href="#" className="text-jb-ink-muted font-semibold no-underline">Terms</a>{' '}
                  and{' '}
                  <a href="#" className="text-jb-ink-muted font-semibold no-underline">Privacy Policy</a>.
                </p>
              </form>
            )}
          </div>

          <div className="font-mono text-[11px] text-jb-ink-ghost">&copy; 2026 Jobocate</div>
        </div>

        {/* BRAND SIDE — hidden below 880px so the form gets the full width. */}
        <div className="relative overflow-hidden bg-jb-deep p-12 hidden min-[880px]:flex min-[880px]:flex-col min-[880px]:justify-between">
          <div className={`absolute inset-0 pointer-events-none ${brandGlow}`} />

          <div className={`relative font-mono text-[11px] tracking-[0.14em] uppercase ${kickerColor}`}>
            &mdash; {brandKicker}
          </div>

          <div className="relative">
            <p className="font-display text-[38px] leading-[1.1] text-[#f2ede2] mb-7 max-w-[440px]">
              {brandHeadline}
            </p>

            <div className="flex flex-col gap-[11px] mb-[30px]">
              {perks.map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <span className={`w-[26px] h-[26px] flex-shrink-0 rounded-full flex items-center justify-center text-xs ${perkIcon}`}>
                    &#10003;
                  </span>
                  <span className="text-[14.5px] text-[#e4decf]">{p}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#1e1c15] border border-[#2c2a22] rounded-2xl p-[18px] shadow-[0_30px_60px_-28px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[13px] font-bold text-[#fbf8f1]">{statTitle}</span>
                <span className={`font-mono text-[11px] ${kickerColor}`}>&#9679; avg</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-jb-deep rounded-[10px] p-[13px]">
                  <div className="font-mono text-2xl font-semibold text-[#fbf8f1]">{stat1}</div>
                  <div className="text-xs text-jb-ink-subtle">{stat1Label}</div>
                </div>
                <div className="bg-jb-deep rounded-[10px] p-[13px]">
                  <div className={`font-mono text-2xl font-semibold ${kickerColor}`}>{stat2}</div>
                  <div className="text-xs text-jb-ink-subtle">{stat2Label}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-[13px] text-jb-ink-faint">
            <span className="text-jb-green tracking-[0.1em]">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            {brandFootnote}
          </div>
        </div>
      </div>
    </>
  );
}
