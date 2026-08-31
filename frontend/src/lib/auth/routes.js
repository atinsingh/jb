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

export const loginRedirectFor = (pathname) =>
  `${LOGIN_ROUTE}?redirect=${encodeURIComponent(pathname)}`;
