'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import Logo from '@/components/brand/Logo';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from '@/components/auth/v3/AuthV3.module.css';

/**
 * Password reset, Candidate v3, on Supabase Auth.
 *
 * Two real stages, driven by whether Supabase has given us a recovery session:
 *
 *   request  -> resetPasswordForEmail() sends the link, we say so
 *   reset    -> the user came BACK via that link, so updateUser() sets the password
 *
 * The previous version had four stages including a fake one: an `openLink()`
 * handler jumped straight from "sent" to "reset" with no token, so the flow
 * could be walked end to end without ever receiving an email. It also defaulted
 * the email field to `sarah.chen@gmail.com` and advanced the stage even when the
 * API call threw. None of that is carried over.
 *
 * Supabase puts the recovery token in the URL fragment and the browser client
 * exchanges it automatically, firing PASSWORD_RECOVERY. We watch for both that
 * event and the `type=recovery` fragment, because whichever of the two we see
 * first depends on how quickly the client initialises.
 */
export default function ResetPassword() {
  const supabase = getSupabaseBrowserClient();

  const [stage, setStage] = useState('request'); // request | sent | reset | done
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // The fragment is readable immediately; the event may arrive a tick later.
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setStage('reset');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('reset');
    });

    return () => subscription?.unsubscribe();
  }, [supabase]);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (busy) return;

    setError('');
    setBusy(true);
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/app/reset-password` },
      );
      // Only advance on success. The old version advanced regardless, so a user
      // whose request failed sat waiting for an email that was never sent.
      if (requestError) throw new Error(requestError.message);
      setStage('sent');
    } catch (err) {
      setError(err?.message || 'Could not send that reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setStage('done');
    } catch (err) {
      setError(err?.message || 'Could not set that password. The link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset password · Jobocate</title>
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
                {stage === 'request' && (
                  <>
                    <h1 className={styles.h1}>Reset your password.</h1>
                    <p className={styles.lede}>
                      Tell us the email on your account and we will send a link to set a new
                      password.
                    </p>

                    <form onSubmit={handleRequest} noValidate>
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

                      {error && (
                        <p className={styles.error} role="alert">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={busy}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                      >
                        {busy ? 'Sending' : 'Send link'}
                      </button>
                    </form>

                    <p className={styles.footNote}>
                      Remembered it? <Link href="/app/login">Sign in</Link>.
                    </p>
                  </>
                )}

                {stage === 'sent' && (
                  <>
                    <h1 className={styles.h1}>Check your email.</h1>
                    <p className={styles.lede}>
                      If an account exists for {email}, a reset link is on its way. The link
                      expires in an hour.
                    </p>

                    <p className={styles.notice}>
                      Nothing arrived? Check spam, then{' '}
                      <button
                        type="button"
                        onClick={() => setStage('request')}
                        className={styles.inlineLink}
                        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                      >
                        try again
                      </button>
                      .
                    </p>

                    <Link href="/app/login" className={`${styles.btn} ${styles.btnGhost}`}>
                      Back to sign in
                    </Link>
                  </>
                )}

                {stage === 'reset' && (
                  <>
                    <h1 className={styles.h1}>Set a new password.</h1>
                    <p className={styles.lede}>
                      Choose something you do not use anywhere else.
                    </p>

                    <form onSubmit={handleReset} noValidate>
                      <div className={styles.fieldBlock}>
                        <label htmlFor="password" className={styles.label}>
                          New password
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
                        />
                      </div>

                      <div className={styles.fieldBlock}>
                        <label htmlFor="confirm" className={styles.label}>
                          Confirm password
                        </label>
                        <input
                          id="confirm"
                          name="confirm"
                          type="password"
                          autoComplete="new-password"
                          required
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
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
                        disabled={busy}
                        className={`${styles.btn} ${styles.btnPrimary}`}
                      >
                        {busy ? 'Saving' : 'Save password'}
                      </button>
                    </form>
                  </>
                )}

                {stage === 'done' && (
                  <>
                    <h1 className={styles.h1}>Password updated.</h1>
                    <p className={styles.lede}>
                      You are signed in on this device. Other devices will need the new password.
                    </p>
                    <Link href="/app/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
                      Continue
                    </Link>
                  </>
                )}
              </div>
            </section>

            <aside className={styles.asideCell}>
              <p className={styles.asideHead}>Your work is where you left it.</p>
              <p className={styles.asideNote}>
                Resetting your password does not touch your matches, applications or saved
                resumes.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
