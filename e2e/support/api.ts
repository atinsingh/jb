import { URLS } from '../playwright.config';
import { E2E_MARKER, e2eAuthUserIds } from './e2e-auth-users';

export { E2E_MARKER };

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
 * Every artifact this suite creates carries `e2e-auto`, so it is collision-proof
 * and safe to delete from the dev database and from Supabase Auth.
 */
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

/**
 * Supabase Auth owns identity now, so provisioning a test user is two steps
 * against Supabase rather than one POST to a registration endpoint we deleted.
 *
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY in the
 * environment. The service-role key is admin-level and must only ever come from
 * a DEV project — never point this suite at production.
 */
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requireSupabaseEnv(): void {
  const missing = [
    !SUPABASE_URL && 'SUPABASE_URL',
    !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    !SUPABASE_ANON_KEY && 'SUPABASE_ANON_KEY',
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `E2E needs Supabase credentials to provision users. Missing: ${missing.join(', ')}. ` +
        'Point these at the Supabase DEV project (see the Auth section of README.md).',
    );
  }
}

/** Create a confirmed Supabase user and return them with a valid access token. */
export async function createUser(role: Role, prefix: string): Promise<TestUser> {
  requireSupabaseEnv();

  const email = uniqueEmail(prefix);
  const name = role === 'ROLE_EMPLOYER' ? 'E2E Employer' : 'E2E Candidate';

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY as string,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password: TEST_PASSWORD,
      // Skip the confirmation email: the suite has no inbox.
      email_confirm: true,
      // The backend honours role from user_metadata ONLY when first creating
      // the local user, and only for candidate/employer. That is what makes an
      // employer fixture possible without a second admin call.
      user_metadata: { name, role },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Supabase admin createUser failed (${res.status}): ${await res.text()}`,
    );
  }

  const token = await login(email, TEST_PASSWORD);
  return { name, email, password: TEST_PASSWORD, role, token };
}

function supabaseAdminHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function supabaseAdmin(path: string, init?: RequestInit): Promise<Response> {
  const url = `${SUPABASE_URL}/auth/v1${path}`;
  const headers = { ...supabaseAdminHeaders(), ...init?.headers };
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { ...init, headers });
    if (res.status !== 429 || attempt === 4) return res;
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  throw new Error('supabaseAdmin retry fell through');
}

/**
 * Delete every Supabase auth user tagged `e2e-auto`.
 *
 * shortcut: lists at most 50 pages (10k users), raise the cap if a dev project exceeds that.
 * Real accounts and the homepage demo user (no marker) are left alone.
 */
export async function deleteE2EAuthUsers(): Promise<number> {
  requireSupabaseEnv();

  const pages: Array<Array<{ id: string; email?: string }>> = [];
  for (let page = 1; page <= 50; page++) {
    const res = await supabaseAdmin(`/admin/users?page=${page}&per_page=200`);
    if (!res.ok) {
      throw new Error(`Supabase list users failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { users?: Array<{ id: string; email?: string }> };
    const users = body.users ?? [];
    pages.push(users);
    if (users.length < 200) break;
  }

  const ids = e2eAuthUserIds(pages);
  const queue = [...ids];
  const workers = Array.from({ length: 8 }, async () => {
    for (;;) {
      const id = queue.pop();
      if (!id) return;
      const res = await supabaseAdmin(`/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Supabase delete user failed (${res.status}): ${await res.text()}`);
      }
    }
  });
  await Promise.all(workers);
  return ids.length;
}

/** Exchange email + password for a Supabase access token. */
export async function login(email: string, password: string): Promise<string> {
  requireSupabaseEnv();

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = (await res.json()) as { access_token?: string };
  if (!res.ok || !payload.access_token) {
    throw new Error(
      `Supabase login for ${email} returned no token: ${JSON.stringify(payload)}`,
    );
  }
  return payload.access_token;
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
