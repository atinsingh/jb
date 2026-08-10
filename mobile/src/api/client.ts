import { API_BASE_URL } from '../config';

/**
 * Native fetch wrapper — mirrors the web `employerApi.js` apiCall helper:
 * prepends the base URL, attaches the JWT as `Authorization: Bearer <token>`,
 * sends JSON headers, and throws on non-2xx with the server's message.
 *
 * The token lives in a tiny in-memory holder set by AuthContext (which is the
 * source of truth, backed by expo-secure-store). No CORS concern on native.
 */
let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

export const getAuthToken = (): string | null => authToken;

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export const apiCall = async <T = unknown>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> => {
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    const message = Array.isArray(err?.message)
      ? err.message.join(', ')
      : err?.message || 'Request failed';
    throw new Error(message);
  }

  // 204 / empty body tolerance
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
};
