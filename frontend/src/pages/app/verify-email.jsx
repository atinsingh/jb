'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import Logo from '@/components/brand/Logo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from '@/components/auth/v3/AuthV3.module.css';

/**
 * Email verification, Candidate v3, on Supabase Auth.
 *
 * **The 6-digit OTP UI is gone, deliberately.** Supabase's default signup
 * template sends a confirmation *link*, not a code, so six input boxes were
 * asking for something the user would never receive. (Supabase can be made to
 * send a numeric token by switching the template to `{{ .Token }}` and calling
 * `verifyOtp`. If that is ever wanted it is a template change plus a handler
 * here, not a reason to keep dead boxes on screen now.)
 *
 * So this page has two jobs:
 *   - land the user after they click the link and confirm it worked
 *   - let someone whose mail never arrived send another
 *
 * Note email confirmation is currently OFF on the project, which makes this a
 * mostly-unreachable screen by design (see SUPABASE_AUTH_SETUP.md). It is built
 * correctly so that turning confirmation on is a dashboard toggle rather than a
 * frontend project.
 *
 * The previous version showed "fall back to sample data" behaviour on failure,
 * so a broken backend rendered a plausible-looking verified state. Removed.
 */
export default function VerifyEmail() {
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState('');
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const read = async () => {
      // Supabase exchanges the token in the URL fragment on load, so by the time
      // getUser resolves the confirmation has either landed or it has not.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setEmail(user?.email || '');
      setVerified(Boolean(user?.email_confirmed_at));
      setChecking(false);
    };

    read();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user?.email || '');
      setVerified(Boolean(session?.user?.email_confirmed_at));
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    setError('');
    setNotice('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/app/verify-email` },
      });
      if (resendError) throw new Error(resendError.message);

      setNotice('Sent. It can take a minute to arrive.');
      setCooldown(60);
    } catch (err) {
      // Supabase rate-limits this hard, and that is the most likely failure -
      // say so rather than showing a generic error.
      setError(err?.message || 'Could not resend just now. Try again shortly.');
    }
  };

  return (
    <>
      <Head>
        <title>Verify email · Jobocate</title>
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
                {checking ? (
                  <>
                    <p className={styles.monoLabel}>One moment</p>
                    <h1 className={styles.h1}>Checking your link.</h1>
                  </>
                ) : verified ? (
                  <>
                    <h1 className={styles.h1}>Email confirmed.</h1>
                    <p className={styles.lede}>
                      {email} is verified. You are all set.
                    </p>
                    <Link
                      href="/app/dashboard"
                      className={`${styles.btn} ${styles.btnPrimary}`}
                    >
                      Continue
                    </Link>
                  </>
                ) : (
                  <>
                    <h1 className={styles.h1}>Confirm your email.</h1>
                    <p className={styles.lede}>
                      {email
                        ? `We sent a confirmation link to ${email}. Open it to finish setting up your account.`
                        : 'Open the confirmation link we emailed you to finish setting up your account.'}
                    </p>

                    {notice && <p className={styles.notice}>{notice}</p>}
                    {error && (
                      <p className={styles.error} role="alert">
                        {error}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || !email}
                      className={`${styles.btn} ${styles.btnGhost}`}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
                    </button>

                    <p className={styles.footNote}>
                      Wrong address? <Link href="/app/signup">Start again</Link>.
                    </p>
                  </>
                )}
              </div>
            </section>

            <aside className={styles.asideCell}>
              <p className={styles.asideHead}>One click and you are in.</p>
              <p className={styles.asideNote}>
                Confirming your email is what lets us send match alerts and application updates
                to the right place.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
