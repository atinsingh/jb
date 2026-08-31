/**
 * The browser Supabase client.
 *
 * A module singleton rather than a React provider: every consumer (AuthContext,
 * the pre-auth forms, and the shared apiClient) needs the same instance, and a
 * provider would mean prop-drilling it into non-component code like
 * `lib/apiClient.js`. `createBrowserClient` is itself memoised per set of args,
 * but the module-level call makes the single-instance guarantee explicit.
 *
 * Session storage is COOKIES, not localStorage — that is what lets
 * `src/middleware.ts` see the session server-side.
 */
import { createBrowserClient } from '@supabase/ssr';

let client;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return client;
}
