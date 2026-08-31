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

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
