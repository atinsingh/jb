/**
 * The browser Supabase client.
 *
 * A module singleton rather than a React provider: every consumer (AuthContext,
 * the pre-auth forms, and the shared apiClient) needs the same instance, and a
 * provider would mean prop-drilling it into non-component code like
 * `lib/apiClient.js`. `createBrowserClient` is itself memoised per set of args,
 * but the module-level call makes the single-instance guarantee explicit.
 *
 * Access and refresh tokens are cookies, so `src/middleware.js` can see the
 * session. The user record is localStorage (`cookies.encode: 'tokens-only'`).
 */
import { createBrowserClient } from '@supabase/ssr';

let client;

export function getSupabaseBrowserClient() {
  if (!client) {
    // tokens-only reads `window.localStorage` while the client is constructed.
    // This module is also evaluated during SSR, where `window` does not exist,
    // so the server gets a throwaway store and the browser keeps localStorage.
    const userStorage =
      typeof window === 'undefined'
        ? {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        : window.localStorage;

    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: { userStorage },
        // Google identities, the avatar URL and the provider token used to ride
        // along in the cookie. That payload is what splits into .0/.1/.2 chunks.
        // A later sign-in does not always delete the old chunks, the Cookie
        // header outgrows the proxy, and the site answers 502 until the jar is
        // cleared. Tokens stay in the cookie (middleware still has to read
        // them); the user record stays in localStorage.
        cookies: {
          encode: 'tokens-only',
          // Passing `cookies` at all makes the server render demand getAll and
          // setAll. The browser keeps the document.cookie defaults.
          ...(typeof document === 'undefined'
            ? { getAll: () => [], setAll: () => {} }
            : {}),
        },
      },
    );
  }
  return client;
}
