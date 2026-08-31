import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { API_URL } from '@/config/api';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  PUBLIC_APP_ROUTES,
  isProtectedRoute,
  LOGIN_ROUTE,
} from '@/lib/auth/routes';

export const AuthContext = createContext();

/**
 * Auth state, backed by Supabase.
 *
 * The exported shape is deliberately unchanged from the localStorage-JWT
 * version — `user`, `loading`, `login`, `signup`, `logout`, `hasRole`,
 * `refreshUser` — because it is consumed in 17 files and none of them should
 * need editing for a change to the mechanics underneath.
 *
 * What changed inside:
 *  - No hand-rolled JWT base64 decoding. The token is opaque to us now.
 *  - No `localStorage`. Supabase stores the session in COOKIES, which is what
 *    lets `src/middleware.js` gate routes server-side.
 *  - `onAuthStateChange` drives everything, so sign-in, sign-out and silent
 *    token refresh all propagate through the tree without a page reload.
 *
 * Division of labour: Supabase owns identity (who you are), and the Mongo user
 * document owns everything else (role, plan, Stripe state). `GET /api/auth/me`
 * is how we read the second half, and it is cached per user rather than
 * re-fetched on every token refresh — a token refresh does not change your role.
 */

// Route gating lives in one place now — see @/lib/auth/routes, which
// src/middleware.js reads too. Two drifting copies is exactly how a protected
// page quietly becomes public.
//
// isProtectedRoute is still used here to hold a protected page back until auth
// resolves, so it cannot paint before the redirect fires. The whole marketing
// surface must keep rendering on the server: gating it too left
// `<div id="__next">` empty in the SSR output, so no page shipped a title,
// description, OG tag or <h1> to a crawler.

export const AuthProvider = ({ children }) => {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Which Supabase user id the cached `user` belongs to. A TOKEN_REFRESHED event
  // fires on a timer; without this the app would re-request /api/auth/me every
  // time the access token rotated, for data that had not changed.
  const loadedForRef = useRef(null);

  /**
   * Fetch the local User document — role, plan, Stripe state — for the current
   * session. Supabase does not hold any of it.
   */
  const fetchLocalUser = useCallback(async (accessToken) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) return null;

      const data = await response.json();
      return data.user ?? null;
    } catch (error) {
      // The backend may simply be offline in local dev; that must not wedge the
      // whole app in a loading state.
      console.debug('Could not load user profile:', error.message);
      return null;
    }
  }, []);

  const applySession = useCallback(
    async (session) => {
      if (!session?.user) {
        loadedForRef.current = null;
        setUser(null);
        return;
      }

      if (loadedForRef.current === session.user.id) return;

      const localUser = await fetchLocalUser(session.access_token);
      loadedForRef.current = session.user.id;
      setUser(localUser);
    },
    [fetchLocalUser],
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      await applySession(session);
      if (active) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;

      if (event === 'SIGNED_OUT') {
        loadedForRef.current = null;
        setUser(null);
        return;
      }

      await applySession(session);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [supabase, applySession]);

  // Role-based surface enforcement: an authenticated user should only ever be on
  // the surface that matches their role. Employers belong on /employer/*, human
  // career agents on /agent/*, everyone else on the candidate app (/app/*).
  //
  // This stays client-side because role lives on the Mongo document, not in the
  // Supabase token, so the middleware cannot see it. The middleware enforces
  // AUTHENTICATED; the NestJS guards enforce AUTHORISED. This is only a
  // redirect, never a security boundary.
  useEffect(() => {
    if (loading || !user) return;
    const path = router.pathname;
    const role = user.role;

    if (path.startsWith('/admin') && role !== 'ROLE_ADMIN') {
      router.replace('/unauthorized');
      return;
    }
    if (role === 'ROLE_ADMIN') return; // admins may view every surface

    const isEmployer = role === 'ROLE_EMPLOYER';
    const isAgent = role === 'ROLE_AGENT';
    const onEmployerApp = path.startsWith('/employer/') || path === '/employer';
    const onAgentApp = path.startsWith('/agent/') || path === '/agent';
    const onCandidateApp =
      path.startsWith('/app') && !PUBLIC_APP_ROUTES.includes(path);

    if (isAgent) {
      if (onCandidateApp || onEmployerApp) router.replace('/agent/dashboard');
    } else if (isEmployer) {
      if (onCandidateApp || onAgentApp) router.replace('/employer/dashboard');
    } else {
      if (onEmployerApp || onAgentApp) router.replace('/app/dashboard');
    }
  }, [loading, user, router.pathname]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);

    const localUser = await fetchLocalUser(data.session.access_token);
    loadedForRef.current = data.user.id;
    setUser(localUser);
    return { user: localUser };
  };

  const signup = async ({ name, email, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // The backend only ever honours ROLE_CANDIDATE / ROLE_EMPLOYER from
        // here, and only when first creating the user — user_metadata is
        // user-writable, so it can never grant anything privileged.
        data: { name, role },
      },
    });
    if (error) throw new Error(error.message);

    // With email confirmation off (the current alpha posture) signUp returns a
    // live session. If it is ever switched on, `session` is null and the user
    // must confirm before signing in — hence the guard rather than a `!`.
    if (data.session) {
      const localUser = await fetchLocalUser(data.session.access_token);
      loadedForRef.current = data.user.id;
      setUser(localUser);
      return { user: localUser, needsConfirmation: false };
    }

    return { user: null, needsConfirmation: true };
  };

  /**
   * Google / LinkedIn. Supabase owns the round trip; we just say where to land.
   *
   * `role` rides in the redirect URL rather than the call, because
   * `signInWithOAuth` has no `data` option — its options are only redirectTo,
   * scopes, queryParams and skipBrowserRedirect. Passing `data` here looks like
   * it works and is silently dropped, which would land every OAuth employer
   * signup as a candidate. /auth/success stamps it before the first
   * /api/auth/me call, which is what creates the local user.
   */
  const loginWithProvider = async (provider, { redirectTo, role } = {}) => {
    const landing = new URL(`${window.location.origin}/auth/success`);
    if (redirectTo) landing.searchParams.set('redirect', redirectTo);
    if (role) landing.searchParams.set('role', role);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: landing.toString() },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    loadedForRef.current = null;
    setUser(null);
    router.push(LOGIN_ROUTE);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/app/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  };

  const hasRole = (role) => user?.role === role;

  /** Force a re-read of the local User document (role/plan/Stripe may have changed). */
  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const localUser = await fetchLocalUser(session.access_token);
    if (localUser) setUser(localUser);
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    loginWithProvider,
    logout,
    resetPassword,
    updatePassword,
    hasRole,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading && isProtectedRoute(router.pathname) ? null : children}
    </AuthContext.Provider>
  );
};

/**
 * Returns an empty object rather than `undefined` outside a provider.
 *
 * The old version returned `useContext(AuthContext)` raw, which is why call
 * sites are littered with `useAuth() || {}`. Those still work; new ones do not
 * need the guard.
 */
export const useAuth = () => useContext(AuthContext) ?? {};
