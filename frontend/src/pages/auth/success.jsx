'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

/**
 * The OAuth landing page.
 *
 * Supabase handles the provider round trip and drops the session into cookies
 * before redirecting here, so this page no longer parses a token and a
 * URL-encoded user object out of the query string the way the hand-rolled flow
 * did. It waits for the session to settle and then route the user to
 * the surface their role belongs to.
 *
 * The `processedRef` guard is kept from the previous implementation: it stops
 * the effect re-entering after `router.replace`, which caused a redirect loop.
 */
export default function AuthSuccess() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const processedRef = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const supabase = getSupabaseBrowserClient();

    const land = async () => {
      /*
       * Surface the provider's own failure before anything else.
       *
       * Supabase reports these BOTH as query params and in the hash fragment,
       * and the hash is the half `router.query` cannot see. Reading only the
       * query would work today and silently stop working if Supabase moved to
       * hash-only, so read both.
       *
       * This used to fall through to getSession() and show a generic 'please
       * try again', which threw away the one piece of information that says what
       * to fix (invalid_scope_error, redirect_uri mismatch, access_denied).
       */
      const hashParams = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '',
      );
      const providerError =
        router.query.error || hashParams.get('error');
      const providerDetail =
        router.query.error_description || hashParams.get('error_description');

      if (providerError) {
        setError(
          providerDetail
            ? `${providerDetail} (${providerError})`
            : `Sign-in was refused: ${providerError}`,
        );
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError(
          sessionError?.message ||
            'We could not complete that sign-in. Please try again.',
        );
        return;
      }

      /*
       * Stamp the signup role BEFORE anything calls /api/auth/me.
       *
       * That call is what creates the local user, and the backend reads
       * user_metadata.role only at creation. Do this after it and an employer
       * who signed up with Google is already a candidate.
       *
       * signInWithOAuth has no way to carry this, so /app/signup puts it in the
       * redirect URL. Only the two self-selectable roles are honoured here, and
       * the backend re-checks that anyway - user_metadata is user-writable, so
       * this is a convenience, never a grant.
       */
      const requestedRole = router.query.role;
      if (requestedRole === 'ROLE_EMPLOYER' || requestedRole === 'ROLE_CANDIDATE') {
        await supabase.auth.updateUser({ data: { role: requestedRole } });
      }

      // The Mongo user carries the role; Supabase does not. On a first social
      // sign-in the backend creates that document on this very call.
      await refreshUser?.();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/me`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      ).catch(() => null);

      const role = response?.ok ? (await response.json())?.user?.role : null;

      // Honour an explicit ?redirect= if the sign-in was triggered from a
      // protected route, otherwise land on the role's home surface. Only
      // same-origin paths are accepted - an absolute URL here would be an open
      // redirect.
      const requested = router.query.redirect;
      if (typeof requested === 'string' && requested.startsWith('/')) {
        router.replace(requested);
        return;
      }

      router.replace(
        role === 'ROLE_EMPLOYER'
          ? '/employer/dashboard'
          : role === 'ROLE_AGENT'
            ? '/agent/dashboard'
            : role === 'ROLE_ADMIN'
              ? '/admin/dashboard'
              : '/app/dashboard',
      );
    };

    land();
    // Intentionally runs once - see processedRef above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        <title>Signing you in · Jobocate</title>
        <meta name="robots" content="noindex" />
      </Head>
      <main className="jb jbv3" style={styles.root}>
        <div style={styles.inner}>
          <p style={styles.label}>{error ? 'Sign-in failed' : 'One moment'}</p>
          <p style={styles.message}>
            {error || 'Finishing your sign-in…'}
          </p>
          {error && (
            <a href="/app/login" style={styles.link}>
              Back to sign in
            </a>
          )}
        </div>
      </main>
    </>
  );
}

/*
 * Inline styles rather than a module: this page renders for well under a second
 * and its whole job is to not flash something off-brand while the session
 * settles. Every value is a v3 token.
 */
const styles = {
  root: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: 'var(--jb-v3-bg)',
    color: 'var(--jb-v3-fg)',
    fontFamily: 'var(--jb-v3-font-display)',
  },
  inner: { textAlign: 'center', padding: '0 24px' },
  label: {
    margin: '0 0 12px',
    fontFamily: 'var(--jb-v3-font-mono)',
    fontSize: 9.5,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--jb-v3-fg-3)',
  },
  message: { margin: 0, fontSize: 16.5, color: 'var(--jb-v3-fg-2)' },
  link: {
    display: 'inline-block',
    marginTop: 24,
    padding: '11px 22px',
    borderRadius: 2,
    border: '1px solid var(--jb-v3-line-2)',
    color: 'var(--jb-v3-fg-2)',
    textDecoration: 'none',
    fontFamily: 'var(--jb-v3-font-mono)',
    fontSize: 10.5,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
};
