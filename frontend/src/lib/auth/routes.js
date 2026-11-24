/**
 * The one place route gating is defined.
 *
 * Both `src/middleware.ts` (the real, server-side boundary) and
 * `src/context/AuthContext.jsx` (a client-side convenience that avoids painting
 * a protected page before the redirect lands) read these. They used to be two
 * copies inside AuthContext, which is exactly how a protected page quietly
 * becomes public: someone adds a route to one list and not the other.
 *
 * Plain .js with no imports so the Edge middleware runtime can take it as-is.
 */

/** /app/* screens that never require a session — the pre-auth entry points. */
export const PUBLIC_APP_ROUTES = [
  '/app/login',
  '/app/signup',
  '/app/reset-password',
  '/app/verify-email',
  '/app/states',
];

/**
 * Everything behind a session.
 *
 * `/admin` has no trailing slash on purpose: it matches the bare `/admin` page
 * as well as `/admin/*`. The others are prefix-with-slash so a future public
 * `/agents` marketing page is not accidentally swept in.
 */
const PROTECTED_PREFIXES = ['/employer/', '/candidate/', '/agent/', '/admin'];

export const isProtectedRoute = (pathname) =>
  PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
  (pathname.startsWith('/app') && !PUBLIC_APP_ROUTES.includes(pathname));

/** Where an unauthenticated visitor is sent, carrying the route they wanted. */
export const LOGIN_ROUTE = '/app/login';
export const SIGNUP_ROUTE = '/app/signup';

/**
 * A ?redirect= value we are willing to follow, or null.
 *
 * Same-origin paths only. `startsWith('/')` alone is not enough: `//evil.com`
 * and `/\evil.com` are protocol-relative and browsers leave the site for them.
 */
export const safeRedirect = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !value.startsWith('/\\')
    ? value
    : null;

/** `path` includes the query string, so a `?mode=` choice survives sign-in. */
export const loginRedirectFor = (path) =>
  `${LOGIN_ROUTE}?redirect=${encodeURIComponent(path)}`;

export const signupRedirectFor = (path) =>
  `${SIGNUP_ROUTE}?redirect=${encodeURIComponent(path)}`;

/** Where the homepage's two résumé choices lead once the visitor has an account. */
export const RESUME_INTENT_PATH = {
  compare: '/app/resume?mode=compare',
  generate: '/app/resume?mode=generate',
};

/** 'compare' | 'generate' | null for a redirect target into /app/resume. */
export const resumeIntentOf = (redirect) => {
  const path = safeRedirect(redirect);
  if (!path) return null;
  const url = new URL(path, 'http://x');
  if (url.pathname !== '/app/resume') return null;
  const mode = url.searchParams.get('mode');
  return mode === 'compare' || mode === 'generate' ? mode : null;
};
