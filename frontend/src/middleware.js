/**
 * The real auth boundary.
 *
 * Before this file existed, every guard in the app was client-side: a protected
 * page rendered, THEN AuthContext noticed there was no token and redirected. The
 * API was the only thing actually enforcing anything. This runs before any page
 * renders, so there is no flash of protected content.
 *
 * It also refreshes the session cookie on every request — see
 * `lib/supabase/middleware.js` for why that half matters just as much.
 *
 * Scope note: this enforces AUTHENTICATED, not AUTHORISED. Role lives on the
 * Mongo User document, not in the Supabase token (a deliberate decision — one
 * source of truth, no stale claims), so the middleware cannot see it. Role
 * gating stays in the NestJS guards, which means the API must be closed even
 * where the UI is not.
 *
 * .js, not .ts: the frontend has no tsconfig and no typescript dependency, and
 * a single .ts file would make Next bootstrap a toolchain nothing else uses.
 */
import { NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';
import { isProtectedRoute, loginRedirectFor } from '@/lib/auth/routes';

export async function middleware(request) {
  // Runs on public routes too: the session-refresh half has to happen
  // everywhere, or a visitor who browses the marketing site long enough returns
  // to /app with an expired cookie.
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  if (!user && isProtectedRoute(pathname)) {
    const target = loginRedirectFor(pathname);
    const url = request.nextUrl.clone();
    url.pathname = target.slice(0, target.indexOf('?'));
    url.search = target.slice(target.indexOf('?'));
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /*
   * Everything except static assets. This deliberately DOES include the public
   * marketing routes, because of the session-refresh job above.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
