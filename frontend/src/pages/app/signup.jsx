'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { appRoute } from '@/components/app/appRoutes';
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

  const seeker = role === 'seeker';
  const accent = seeker ? '#1FA463' : '#4263EB';
  const accentText = seeker ? '#0C2C1C' : '#FFFFFF';
  const focusRing = seeker ? 'rgba(31,164,99,0.15)' : 'rgba(66,99,235,0.15)';

  const isRoleStage = stage === 'role';
  const isFormStage = stage === 'form';

  // ----- role-select cards -----
  const choiceDefs = [
    { key: 'seeker', glyph: '◎', title: 'I’m looking for a job', desc: 'Build a résumé, get matched, and auto-apply to roles that fit.' },
    { key: 'employer', glyph: '⛯', title: 'I’m hiring', desc: 'Post roles and let an AI recruiter screen, source and schedule.' },
  ];
  const choices = choiceDefs.map((c) => {
    const on = role === c.key;
    const acc = c.key === 'seeker' ? '#1FA463' : '#4263EB';
    const tint = c.key === 'seeker' ? '#EAF6EE' : '#EDF0FE';
    const ink = c.key === 'seeker' ? '#157A49' : '#4263EB';
    return {
      key: c.key,
      title: c.title,
      desc: c.desc,
      glyph: c.glyph,
      bg: on ? (c.key === 'seeker' ? '#F4FBF6' : '#F5F7FE') : '#FFFEFB',
      border: on ? acc : '#E6DECF',
      hoverBorder: acc,
      ring: on ? '0 0 0 3px ' + (c.key === 'seeker' ? 'rgba(31,164,99,0.16)' : 'rgba(66,99,235,0.16)') : 'none',
      iconBg: tint,
      iconColor: ink,
      radioBorder: on ? acc : '#D2C9B7',
      radioBg: on ? acc : 'transparent',
      check: on ? '✓' : '',
      pick: () => setRole(c.key),
    };
  });

  // ----- password strength -----
  const score = passwordStrength(password);
  const palette = ['#E1D9C9', '#C9622E', '#D89A3E', '#5BD08C', '#1FA463'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthBars = [0, 1, 2, 3].map((i) => ({ color: i < score ? palette[score] : '#E6DECF' }));
  const strengthLabel = labels[score] || 'Weak';
  const strengthColor = score >= 3 ? '#157A49' : score === 0 ? '#A79E8F' : '#C9622E';

  // ----- role-adaptive copy -----
  const roleLabel = seeker ? 'Job seeker' : 'Employer';
  const heading = seeker ? 'Create your account.' : 'Create your hiring account.';
  const subhead = seeker
    ? 'Two minutes to set up — then your copilot takes over.'
    : 'Set up your team and post your first role in minutes.';
  const ssoSecond = seeker ? 'LinkedIn' : 'Microsoft';
  const nameLabel = seeker ? 'Full name' : 'Your name';
  const namePlaceholder = seeker ? 'Sarah Chen' : 'Dana Whitfield';
  const emailLabel = seeker ? 'Email' : 'Work email';
  const emailPlaceholder = seeker ? 'you@email.com' : 'you@company.com';
  const ctaLabel = 'Create account';

  // ----- brand panel (role adaptive) -----
  const brandGlow = seeker
    ? 'radial-gradient(circle at 82% 8%, rgba(31,164,99,0.32), transparent 55%), radial-gradient(circle at 8% 100%, rgba(31,164,99,0.18), transparent 50%)'
    : 'radial-gradient(circle at 82% 8%, rgba(66,99,235,0.34), transparent 55%), radial-gradient(circle at 8% 100%, rgba(66,99,235,0.18), transparent 50%)';
  const brandKickerColor = seeker ? '#5BD08C' : '#8DA2F5';
  const brandKicker = seeker ? 'Join 100k+ job seekers' : 'Join 5,000+ hiring teams';
  const brandHeadline = seeker ? 'Set it up once. Wake up to interviews.' : 'Post once. Wake up to a shortlist.';
  const perkIconBg = seeker ? '#1E2D24' : '#1E2436';
  const perkIconColor = seeker ? '#5BD08C' : '#8DA2F5';
  const perks = seeker
    ? ['AI résumé & tailored cover letters', 'Daily matches ranked by real fit', 'Auto-apply to verified careers pages', 'Interview prep that actually helps']
    : ['Autopilot screens & ranks every applicant', 'AI sourcing finds passive talent', 'AI interviews + auto-generated scorecards', 'One-tap approval on every action'];
  const statTitle = 'Your first week, typically';
  const stat1 = seeker ? '120+' : '37→6';
  const stat1Label = seeker ? 'ranked matches' : 'applicants to shortlist';
  const stat2 = seeker ? '48h' : '3×';
  const stat2Label = seeker ? 'to first interview' : 'faster time-to-hire';
  const brandFootnote = seeker ? '4.9 average · 12,000+ reviews' : 'Trusted by talent teams at fast-growing companies';

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

  return (
    <>
      <Head>
        <title>Sign up — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbsignup * {
          box-sizing: border-box;
        }
        #jbsignup input::placeholder {
          color: #a79e8f;
        }
        #jbsignup input:focus {
          outline: none;
          border-color: ${accent};
          box-shadow: 0 0 0 3px ${focusRing};
        }
        @keyframes riseIn {
          from {
            transform: translateY(16px);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 880px) {
          #jbsignup {
            grid-template-columns: 1fr !important;
          }
          #jbsignup .jb-brand-side {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="jbsignup"
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
        <div style={{ display: 'flex', flexDirection: 'column', padding: '36px 56px' }}>
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
              maxWidth: 420,
              width: '100%',
              margin: '0 auto',
              padding: '24px 0',
              animation: 'riseIn 0.6s ease both',
            }}
          >
            {/* ===== STAGE 1: ROLE SELECT ===== */}
            {isRoleStage && (
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid #D9D0BE',
                    borderRadius: 999,
                    padding: '6px 13px',
                    marginBottom: 20,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1FA463' }} />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#5A544A',
                    }}
                  >
                    Free to start
                  </span>
                </div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 42, lineHeight: 1.03, letterSpacing: '-0.01em', margin: '0 0 8px' }}>
                  What brings you here?
                </h1>
                <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 26px' }}>
                  Choose how you&rsquo;ll use Jobocate &mdash; you can switch later.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {choices.map((c) => (
                    <button
                      key={c.key}
                      onClick={c.pick}
                      style={{
                        position: 'relative',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: c.bg,
                        border: `1.5px solid ${c.border}`,
                        boxShadow: c.ring,
                        borderRadius: 16,
                        padding: 20,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span
                        style={{
                          width: 48,
                          height: 48,
                          flexShrink: 0,
                          borderRadius: 13,
                          background: c.iconBg,
                          color: c.iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        {c.glyph}
                      </span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 17, fontWeight: 700, color: '#1B1A16', marginBottom: 3 }}>{c.title}</span>
                        <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.45, color: '#8A8378' }}>{c.desc}</span>
                      </span>
                      <span
                        style={{
                          flexShrink: 0,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          border: `1.5px solid ${c.radioBorder}`,
                          background: c.radioBg,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                        }}
                      >
                        {c.check}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStage('form')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    width: '100%',
                    background: accent,
                    color: accentText,
                    fontSize: 16,
                    fontWeight: 700,
                    padding: 15,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: 24,
                    fontFamily: 'inherit',
                  }}
                >
                  Continue <span style={{ fontSize: 17 }}>&rarr;</span>
                </button>
                <p style={{ fontSize: 14, color: '#5A544A', textAlign: 'center', margin: '18px 0 0' }}>
                  Already have an account?{' '}
                  <Link href={appRoute('App Login.dc.html')} style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}>
                    Log in
                  </Link>
                </p>
              </div>
            )}

            {/* ===== STAGE 2: FORM ===== */}
            {isFormStage && (
              <form onSubmit={handleSignup} style={{ animation: 'rbpop 0.25s ease' }}>
                <button
                  type="button"
                  onClick={() => setStage('role')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#5A544A',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 18,
                  }}
                >
                  &larr; {roleLabel}
                </button>

                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 38, lineHeight: 1.03, letterSpacing: '-0.01em', margin: '0 0 8px' }}>
                  {heading}
                </h1>
                <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 22px' }}>{subhead}</p>

                <div style={{ display: 'flex', gap: 11, marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
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
                    onClick={() => handleOAuth(seeker ? 'linkedin' : 'microsoft')}
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
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      in
                    </span>
                    {ssoSecond}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <span style={{ flex: 1, height: 1, background: '#E1D9C9' }} />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#A79E8F',
                    }}
                  >
                    or with email
                  </span>
                  <span style={{ flex: 1, height: 1, background: '#E1D9C9' }} />
                </div>

                <label style={{ fontSize: 13, fontWeight: 600, color: '#46413A', marginBottom: 7, display: 'block' }}>{nameLabel}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={namePlaceholder}
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #D9D0BE',
                    borderRadius: 12,
                    padding: '12px 15px',
                    marginBottom: 16,
                  }}
                />

                <label style={{ fontSize: 13, fontWeight: 600, color: '#46413A', marginBottom: 7, display: 'block' }}>{emailLabel}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={emailPlaceholder}
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: 15,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #D9D0BE',
                    borderRadius: 12,
                    padding: '12px 15px',
                    marginBottom: 16,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#46413A' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
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
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                  <div style={{ flex: 1, display: 'flex', gap: 5 }}>
                    {strengthBars.map((b, i) => (
                      <span key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: b.color }} />
                    ))}
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
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

                {error && (
                  <div
                    style={{
                      fontSize: 13,
                      color: '#C9622E',
                      background: '#FBEFE7',
                      border: '1px solid #F0D7C5',
                      borderRadius: 12,
                      padding: '11px 14px',
                      marginBottom: 16,
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    width: '100%',
                    background: accent,
                    color: accentText,
                    fontSize: 16,
                    fontWeight: 700,
                    padding: 15,
                    borderRadius: 999,
                    border: 'none',
                    cursor: submitting ? 'default' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {submitting ? 'Creating…' : ctaLabel} <span style={{ fontSize: 18 }}>&rarr;</span>
                </button>

                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: '#8A8378', textAlign: 'center', margin: '16px 0 0' }}>
                  By continuing you agree to our{' '}
                  <a href="#" style={{ color: '#5A544A', fontWeight: 600, textDecoration: 'none' }}>
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="#" style={{ color: '#5A544A', fontWeight: 600, textDecoration: 'none' }}>
                    Privacy Policy
                  </a>
                  .
                </p>
              </form>
            )}
          </div>

          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F' }}>&copy; 2026 Jobocate</div>
        </div>

        {/* BRAND SIDE */}
        <div
          className="jb-brand-side"
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
          <div style={{ position: 'absolute', inset: 0, background: brandGlow, pointerEvents: 'none' }} />

          <div
            style={{
              position: 'relative',
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: brandKickerColor,
            }}
          >
            &mdash; {brandKicker}
          </div>

          <div style={{ position: 'relative' }}>
            <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, lineHeight: 1.1, color: '#F2EDE2', margin: '0 0 28px', maxWidth: 440 }}>
              {brandHeadline}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 30 }}>
              {perks.map((p) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: perkIconBg,
                      color: perkIconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >
                    &#10003;
                  </span>
                  <span style={{ fontSize: 14.5, color: '#E4DECF' }}>{p}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: '#1E1C15',
                border: '1px solid #2C2A22',
                borderRadius: 16,
                padding: 18,
                boxShadow: '0 30px 60px -28px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FBF8F1' }}>{statTitle}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: brandKickerColor }}>&#9679; avg</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#15140F', borderRadius: 10, padding: 13 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, color: '#FBF8F1' }}>{stat1}</div>
                  <div style={{ fontSize: 12, color: '#8A8378' }}>{stat1Label}</div>
                </div>
                <div style={{ background: '#15140F', borderRadius: 10, padding: 13 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24, fontWeight: 600, color: brandKickerColor }}>{stat2}</div>
                  <div style={{ fontSize: 12, color: '#8A8378' }}>{stat2Label}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9A9286' }}>
            <span style={{ color: '#1FA463', letterSpacing: '0.1em' }}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            {brandFootnote}
          </div>
        </div>
      </div>
    </>
  );
}
