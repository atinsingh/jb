import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { API_URL } from '@/config/api';

/**
 * The single place the app gets an access token.
 *
 * This replaces ~48 copy-pasted `getAuthToken()` helpers that each read
 * `localStorage.authToken`. That duplication is what made the Supabase swap
 * expensive, so it does not come back: everything asks here.
 *
 * **Always call this per request — never cache the result.** Supabase access
 * tokens are short-lived and rotate. A module that grabs one at import time
 * starts 401-ing on any tab left open past the TTL. `getSession()` is cheap: it
 * returns the cached token and only refreshes when it is actually near expiry.
 */
export async function getAccessToken() {
  if (typeof window === 'undefined') return null;

  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    console.debug('Could not read Supabase session:', error.message);
    return null;
  }
}

/** Authorization header for the current session, or `{}` when signed out. */
export async function authHeader() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * JSON fetch against the backend with the current access token attached.
 *
 * Most service modules still define their own `apiCall` because their error
 * handling genuinely differs (some parse a `message` array from NestJS, some
 * return blobs). Those keep their own wrapper and just take the token from
 * `getAccessToken()` above. New code should prefer this one.
 */
export async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message || 'Request failed';
    throw new Error(message);
  }

  return response.json();
}
