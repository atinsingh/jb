import { URLS } from '../playwright.config';

/**
 * Thin API client used to ARRANGE state for browser tests.
 *
 * Setup goes through the API rather than the UI deliberately: a matches test
 * should fail because matching broke, not because the signup form changed. The
 * UI is exercised by the journey specs that are actually about that UI.
 */

export type Role = 'ROLE_CANDIDATE' | 'ROLE_EMPLOYER';

export interface TestUser {
  name: string;
  email: string;
  password: string;
  role: Role;
  token: string;
  id?: string;
}

/** Shared password for provisioned users — meets the 8-char minimum. */
export const TEST_PASSWORD = 'E2ePassw0rd!2026';

/**
 * Every artifact this suite creates carries this marker.
 *
 * The suite runs against a developer's real dev database, so its data must be
 * both collision-proof and identifiable after the fact. Anything containing
 * this string is safe to delete.
 */
export const E2E_MARKER = 'e2e-auto';

/** A unique, marked identifier — safe to create repeatedly without collisions. */
export function uniqueId(prefix: string): string {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return `${prefix}-${E2E_MARKER}-${stamp}`;
}

export function uniqueEmail(prefix: string): string {
  return `${uniqueId(prefix)}@example.com`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
    readonly path: string,
  ) {
    super(message);
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${URLS.backend}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    // Surface the server's own message. NestJS validation failures arrive as a
    // `message` ARRAY ("property x should not exist"), and reading that
    // verbatim is what makes a contract break obvious instead of "request
    // failed".
    const detail = Array.isArray(parsed?.message)
      ? parsed.message.join('; ')
      : parsed?.message || res.statusText;
    throw new ApiError(
      `${method} ${path} -> ${res.status}: ${detail}`,
      res.status,
      parsed,
      path,
    );
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>('POST', path, body, token),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>('PATCH', path, body, token),
  put: <T>(path: string, body?: unknown, token?: string) =>
    request<T>('PUT', path, body, token),
  del: <T>(path: string, token?: string) => request<T>('DELETE', path, undefined, token),
};

/** Register a fresh user and return them with a valid token. */
export async function createUser(role: Role, prefix: string): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const name = role === 'ROLE_EMPLOYER' ? 'E2E Employer' : 'E2E Candidate';

  await api.post('/api/auth/register', {
    name,
    email,
    password: TEST_PASSWORD,
    role,
  });

  const token = await login(email, TEST_PASSWORD);
  return { name, email, password: TEST_PASSWORD, role, token };
}

export async function login(email: string, password: string): Promise<string> {
  const res = await api.post<{ token?: string; accessToken?: string }>(
    '/api/auth/login',
    { email, password },
  );
  const token = res.token || res.accessToken;
  if (!token) {
    throw new Error(`Login for ${email} returned no token: ${JSON.stringify(res)}`);
  }
  return token;
}

/** Wait until the backend reports itself up, so setup fails loudly not flakily. */
export async function waitForBackend(timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'never responded';

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${URLS.backend}/health`);
      if (res.ok) {
        const body: any = await res.json();
        if (body.mongodb === 'connected') return;
        lastError = `mongodb: ${body.mongodb}`;
      } else {
        lastError = `status ${res.status}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(
    `Backend at ${URLS.backend} not ready after ${timeoutMs}ms (${lastError}). ` +
      `Start it with "pnpm dev:backend", and check MongoDB is running.`,
  );
}
