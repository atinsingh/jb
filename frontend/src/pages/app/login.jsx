'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaGoogle, FaLinkedinIn } from 'react-icons/fa6';

import { appRoute } from '@/components/app/appRoutes';
import Logo from '@/components/brand/Logo';
import { useAuth } from '@/context/AuthContext';
import styles from '@/components/auth/v3/AuthV3.module.css';

/**
 * Sign in, Candidate v3.
 *
 * Two things changed at once here, deliberately: the visual language moved to
 * v3 (see AuthV3.module.css) and the mechanics moved to Supabase Auth. Doing
 * them separately would have meant building this screen twice, since the
 * Supabase rebuild replaces every form handler anyway.
 *
 * The `?as=employer` variant is preserved: it swaps copy only. Both audiences
 * share one accent, so there is no second colour to maintain.
 */
export default function AppLogin() {
  const router = useRouter();
  const { user, loading, login, loginWithProvider } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const asEmployer = router.query.as === 'employer';

  const copy = asEmployer
    ? {
        heading: 'Log in to keep hiring on autopilot.',
        lede: 'Your candidates, interviews and AI recruiter are where you left them.',
        signupHref: '/app/signup?as=employer',
        asideHead: 'Your recruiting copilot kept working.',
        stats: [
          ['37', 'screened overnight'],
          ['8', 'interviews booked'],
        ],
        asideNote:
          'Every shortlist shows the reasoning behind it, and nothing is sent without your approval.',
      }
    : {
        heading: 'Log in to keep the search running.',
        lede: 'Your matches and auto-applications are where you left them.',
        signupHref: '/app/signup',
        asideHead: 'Your copilot kept working.',
        stats: [
          ['14', 'new matches'],
          ['6', 'auto-applied'],
        ],
        asideNote:
          'Every match shows why it fits, and nothing is submitted until you approve it.',
      };

  // Role-aware landing. The middleware gates the route; this picks the surface.
  const landingFor = (u) =>
    u?.role === 'ROLE_EMPLOYER'
      ? '/employer/dashboard'
      : u?.role === 'ROLE_AGENT'
        ? '/agent/dashboard'
        : appRoute('App Dashboard.dc.html');

  // Already signed in: do not show a login form to someone who has a session.
  useEffect(() => {
    if (!loading && user) router.replace(landingFor(user));
  }, [loading, user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);
    try {
      const result = await login(email, password);
      const requested = router.query.redirect;
      router.replace(
        typeof requested === 'string' && requested.startsWith('/')
          ? requested
          : landingFor(result?.user),
      );
    } catch (err) {
      setError(err?.message || 'Could not sign in. Check your email and password.');
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    try {
      await loginWithProvider(provider, {
        redirectTo: typeof router.query.redirect === 'string' ? router.query.redirect : undefined,
      });
    } catch (err) {
      setError(err?.message || 'Could not reach that provider. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Sign in · Jobocate</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={`jb jbv3 ${styles.page}`}>
        <div className={styles.dots} aria-hidden="true" />

        <header className={styles.bar}>
          <Link href="/" className={styles.brand} aria-label="Jobocate home">
            <Logo size={22} />
          </Link>
          <Link href="/" className={styles.barLink}>
            Back to site
          </Link>
        </header>

        <div className={styles.shellOuter}>
          <div className={styles.grid}>
            <section className={styles.formCell}>
              <div className={styles.form}>
                <h1 className={styles.h1}>{copy.heading}</h1>
                <p className={styles.lede}>{copy.lede}</p>

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
                    <div className={styles.labelRow}>
                      <label htmlFor="password" className={styles.label}>
                        Password
                      </label>
                      <Link href="/app/reset-password" className={styles.inlineLink}>
                        Forgot?
                      </Link>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={styles.field}
                      aria-invalid={error ? 'true' : undefined}
                    />
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
                    {submitting ? 'Signing in' : 'Log in'}
                  </button>
                </form>

                <p className={styles.footNote}>
                  New here? <Link href={copy.signupHref}>Create an account</Link>. Free, no card
                  required.
                </p>
              </div>
            </section>

            <aside className={styles.asideCell}>
              <p className={styles.asideHead}>{copy.asideHead}</p>

              <Histogram />

              <div className={styles.statStrip}>
                {copy.stats.map(([value, label]) => (
                  <div key={label} className={styles.statCell}>
                    <p className={styles.statValue}>{value}</p>
                    <p className={styles.statLabel}>{label}</p>
                  </div>
                ))}
              </div>

              <p className={styles.asideNote}>{copy.asideNote}</p>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The coverage histogram from the homepage hero, reused so the login screen
 * reads as the same product rather than a bolted-on form. Static heights: this
 * is a decorative restatement of a real chart, not live data, so it does not
 * pretend to be precise.
 */
const BARS = [22, 34, 28, 46, 39, 58, 52, 71, 64, 83, 76, 92, 88, 61, 44, 31];

function Histogram() {
  return (
    <div className={styles.hist} aria-hidden="true">
      {BARS.map((height, i) => (
        <span
          key={i}
          className={`${styles.tick} ${height >= 60 ? styles.tickOn : ''}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}
