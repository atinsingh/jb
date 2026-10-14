/**
 * Session refresh for the Edge middleware.
 *
 * This does TWO jobs and the second is the one that is easy to miss:
 *
 *  1. reads the session so the middleware can gate the route, and
 *  2. writes any ROTATED cookies back onto the response.
 *
 * Supabase access tokens are short-lived. `getUser()` transparently refreshes an
 * expired one, but the new cookies only reach the browser if they are copied
 * onto the outgoing response — which is what the `setAll` handler below does.
 * Skip that and sessions appear to work, then silently expire mid-session.
 *
 * Uses `getUser()`, not `getSession()`: getSession trusts the cookie as-is,
 * while getUser revalidates the token with the auth server. On the server, where
 * the cookie is attacker-supplied input, only the second one is a check.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * A Google session used to be several `sb-*-auth-token` chunks. Re-login left
 * the old chunks in the jar, and the proxy answered 502 once the Cookie
 * header no longer fit. Two chunks is a normal tokens-only session. Three is
 * the broken jar, and it is expired here so the next request can get through
 * without the user clearing cookies by hand.
 */
const AUTH_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/;
const AUTH_COOKIE_BUDGET = 8000;

function authCookies(request) {
  return request.cookies.getAll().filter((cookie) => AUTH_COOKIE.test(cookie.name));
}

function authCookieBytes(cookies) {
  return cookies.reduce(
    (total, cookie) => total + cookie.name.length + cookie.value.length,
    0,
  );
}

function expireAuthCookies(response, cookies) {
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });
  }
  return response;
}

function sessionIsPoisoned(error) {
  if (!error) return false;
  if (error.name === 'AuthSessionMissingError') return false;
  if (error.name === 'AuthRetryableFetchError') return false;
  if (typeof error.status === 'number' && error.status >= 500) return false;
  return true;
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const stored = authCookies(request);

  if (authCookieBytes(stored) > AUTH_COOKIE_BUDGET) {
    return { response: expireAuthCookies(response, stored), user: null };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        encode: 'tokens-only',
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (sessionIsPoisoned(error)) {
      return {
        response: expireAuthCookies(response, authCookies(request)),
        user: null,
      };
    }

    return { response, user };
  } catch {
    return {
      response: expireAuthCookies(NextResponse.next({ request }), stored),
      user: null,
    };
  }
}
