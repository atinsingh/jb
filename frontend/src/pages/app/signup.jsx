'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa6';

import Logo from '@/components/brand/Logo';
import { useAuth } from '@/context/AuthContext';
import styles from '@/components/auth/v3/AuthV3.module.css';

/**
 * Create an account, Candidate v3.
 *
 * The two-stage role -> form flow is kept deliberately. It is better UX than a
 * role dropdown, and `e2e/specs/auth/signup-login.spec.ts` drives it (pick a
 * role card, click Continue, then the fields appear).
 *
 * What changed: the whole screen was on the retired cream/green Tailwind
 * palette, which is why it looked nothing like the homepage. It is now on the
 * same tokens and the same hairline grid as login, and it signs up through
 * Supabase rather than POST /api/auth/register.
 */
const ROLES = [
  {
    id: 'ROLE_CANDIDATE',
    name: 'Looking for a job',
    desc: 'Get matched, auto-apply, and prepare for interviews.',
  },
  {
    id: 'ROLE_EMPLOYER',
    name: 'Hiring',
    desc: 'Post roles, screen candidates, and book interviews.',
  },
];

/** Four checks, so the meter maps one bar per satisfied rule rather than a vibe. */
function passwordScore(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (/\d/.test(value) && /[A-Za-z]/.test(value)) score += 1;
  return score;
}

const SCORE_LABEL = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export default function AppSignup() {
  const router = useRouter();
  const { user, loading, signup, loginWithProvider } = useAuth();

  const asEmployer = router.query.as === 'employer';
  const [stage, setStage] = useState('role');
  const [role, setRole] = useState('ROLE_CANDIDATE');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  // Arriving from the employer funnel preselects the role and skips the picker.
  useEffect(() => {
    if (asEmployer) {
      setRole('ROLE_EMPLOYER');
      setStage('form');
    }
  }, [asEmployer]);

  useEffect(() => {
    if (!loading && user) {
      router.replace(
        user.role === 'ROLE_EMPLOYER' ? '/employer/onboarding' : '/app/onboarding',
      );
    }
  }, [loading, user, router]);

  const score = passwordScore(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);
    try {
      const result = await signup({ name, email, password, role });

      // With email confirmation off this returns a session and we route on.
      // If it is ever switched on, say so instead of silently doing nothing.
      if (result?.needsConfirmation) {
        setConfirmSent(true);
        setSubmitting(false);
        return;
      }

      router.replace(
        role === 'ROLE_EMPLOYER' ? '/employer/onboarding' : '/app/onboarding',
      );
    } catch (err) {
      setError(err?.message || 'Could not create that account. Please try again.');
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    try {
      await loginWithProvider(provider, { role });
    } catch (err) {
      setError(err?.message || 'Could not reach that provider. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Create an account · Jobocate</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={`jb jbv3 ${styles.page}`}>
        <div className={styles.dots} aria-hidden="true" />

        <header className={styles.bar}>
          <Link href="/" className={styles.brand} aria-label="Jobocate home">
            <Logo size={22} />
          </Link>
          <Link href="/app/login" className={styles.barLink}>
            Sign in
          </Link>
        </header>

        <div className={styles.shellOuter}>
          <div className={styles.grid}>
            <section className={styles.formCell}>
              <div className={styles.form}>
                {confirmSent ? (
                  <>
                    <h1 className={styles.h1}>Check your inbox.</h1>
                    <p className={styles.lede}>
                      We sent a confirmation link to {email}. Open it to finish setting up your
                      account.
                    </p>
                    <Link href="/app/login" className={`${styles.btn} ${styles.btnGhost}`}>
                      Back to sign in
                    </Link>
                  </>
                ) : stage === 'role' ? (
                  <>
                    <h1 className={styles.h1}>Start with what brings you here.</h1>
                    <p className={styles.lede}>
                      This sets up the right workspace. You can change it later.
                    </p>

                    <div className={styles.roleGrid} role="radiogroup" aria-label="Account type">
                      {ROLES.map((option) => {
                        const selected = role === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setRole(option.id)}
                            className={`${styles.roleCell} ${selected ? styles.roleCellOn : ''}`}
                          >
                            <span
                              className={`${styles.roleTick} ${selected ? styles.roleTickOn : ''}`}
                              aria-hidden="true"
                            />
                            <span className={styles.roleName}>{option.name}</span>
                            <span className={styles.roleDesc}>{option.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setStage('form')}
                      className={`${styles.btn} ${styles.btnPrimary}`}
                    >
                      Continue
                    </button>

                    <p className={styles.footNote}>
                      Already have an account? <Link href="/app/login">Sign in</Link>.
                    </p>
                  </>
                ) : (
                  <>
                    {!asEmployer && (
                      <button
                        type="button"
                        onClick={() => setStage('role')}
                        className={styles.backBtn}
                      >
                        Back
                      </button>
                    )}

                    <h1 className={styles.h1}>
                      {role === 'ROLE_EMPLOYER'
                        ? 'Create your hiring account.'
                        : 'Create your account.'}
                    </h1>
                    <p className={styles.lede}>
                      Free to start. No card required.
                    </p>

                    <div className={styles.oauthRow}>
                      <button
                        type="button"
                        onClick={() => handleOAuth('google')}
                        className={`${styles.btn} ${styles.btnGhost}`}
                      >
                        <FaGoogle className={styles.mark} aria-hidden="true" />
                        Continue with Google
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOAuth('linkedin_oidc')}
                        className={`${styles.btn} ${styles.btnGhost}`}
                      >
                        <FaLinkedinIn className={styles.mark} aria-hidden="true" />
                        Continue with LinkedIn
                      </button>
                    </div>

                    <div className={styles.divider}>
                      <span className={styles.dividerLabel}>Or email</span>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                      <div className={styles.fieldBlock}>
                        <label htmlFor="name" className={styles.label}>
                          Full name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={styles.field}
                        />
                      </div>

                      <div className={styles.fieldBlock}>
                        <label htmlFor="email" className={styles.label}>
                          Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={styles.field}
                          aria-invalid={error ? 'true' : undefined}
                        />
                      </div>

                      <div className={styles.fieldBlock}>
                        <label htmlFor="password" className={styles.label}>
                          Password
                        </label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={styles.field}
                          aria-describedby="password-strength"
                        />
                        <div className={styles.strength} id="password-strength">
                          <div className={styles.strengthTicks} aria-hidden="true">
                            {[0, 1, 2, 3].map((i) => (
                              <span
                                key={i}
                                className={`${styles.strengthTick} ${
                                  i < score ? styles.strengthTickOn : ''
                                }`}
                              />
                            ))}
                          </div>
                          <span className={styles.strengthLabel}>
                            {password ? SCORE_LABEL[score] : '8 characters minimum'}
                          </span>
                        </div>
                      </div>

                      {error && (
                        <p className={styles.error} role="alert">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                      >
                        {submitting ? 'Creating account' : 'Create account'}
                      </button>

                      <p className={styles.terms}>
                        By continuing you agree to our <Link href="/terms">Terms</Link> and{' '}
                        <Link href="/privacy">Privacy Policy</Link>.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </section>

            <aside className={styles.asideCell}>
              <p className={styles.asideHead}>
                {role === 'ROLE_EMPLOYER'
                  ? 'Screening runs while you sleep.'
                  : 'The search runs while you sleep.'}
              </p>

              <div className={styles.statStrip}>
                {(role === 'ROLE_EMPLOYER'
                  ? [
                      ['4.2k', 'candidates reached'],
                      ['11', 'days to hire'],
                    ]
                  : [
                      ['62', 'roles matched weekly'],
                      ['9', 'minutes to apply'],
                    ]
                ).map(([value, label]) => (
                  <div key={label} className={styles.statCell}>
                    <p className={styles.statValue}>{value}</p>
                    <p className={styles.statLabel}>{label}</p>
                  </div>
                ))}
              </div>

              <p className={styles.asideNote}>
                {role === 'ROLE_EMPLOYER'
                  ? 'Every shortlist shows the reasoning behind it, and nothing is sent without your approval.'
                  : 'Every match shows why it fits, and nothing is submitted until you approve it.'}
              </p>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
