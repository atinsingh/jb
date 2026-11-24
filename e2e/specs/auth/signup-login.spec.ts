import { test, expect } from '../../fixtures/test';
import { uniqueEmail, TEST_PASSWORD } from '../../support/api';

/**
 * The front door. Everything else in the suite assumes these work, so they are
 * exercised through the real forms rather than the API.
 *
 * Signed out for the whole file: a leaked session would make a redirect test
 * pass for the wrong reason.
 */
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * "Signed in" means a Supabase session cookie, not a localStorage token.
 *
 * The session moved from `localStorage.authToken` to cookies in the Supabase
 * migration, and that was the point: cookies are what let `src/middleware.js`
 * gate protected routes server-side. Supabase names its cookies `sb-<ref>-auth-
 * token`, sharded with a `.0`/`.1` suffix when the payload is large, so this
 * matches on the prefix rather than an exact name.
 */
async function hasSession(page: import('@playwright/test').Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((c) => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name) && !!c.value);
}

test.describe('signing up and in', () => {
  test('a reset code left on the homepage opens the reset page', async ({ page }) => {
    await page.goto('/?code=00000000-0000-4000-8000-000000000000', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/app\/reset-password\?code=/);
  });

  test('a new candidate can register through the form', async ({ page }) => {
    const email = uniqueEmail('signup-candidate').replace('@example.com', '@jobocate.com');

    await page.goto('/app/signup', { waitUntil: 'domcontentloaded' });

    // Signup is a two-stage flow: pick a role card, click Continue, THEN the
    // email/password form appears. The form fields do not exist in the DOM
    // until both of those happen — picking the card alone does not advance.
    await page
      .getByRole('radio', { name: /looking for a job/i })
      .first()
      .click();
    await page.getByRole('button', { name: /^continue$/i }).click();

    await page.fill('input[name="name"]', 'E2E Signup Candidate');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);

    // Scoped to the form: the OAuth buttons above it also read "Continue
    // with ...", so an unscoped name match would click Google and leave.
    await page.locator('form').getByRole('button', { name: /create account/i }).click();

    // Confirmation-enabled signup waits for email; an immediate session lands
    // on the dashboard without requiring an upload.
    await expect.poll(async () =>
      await hasSession(page) || await page.getByRole('heading', { name: 'Check your inbox.' }).isVisible(),
    ).toBe(true);
    if (!await hasSession(page)) return;
    await expect(page).toHaveURL(/\/app\/dashboard\/?$/);
    await expect(page.getByRole('link', { name: /compare a resume/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create a resume/i })).toBeVisible();
    await expect(page.getByText(/roles matched|auto.applied|welcome candidate/i)).toHaveCount(0);
  });

  test('an authenticated candidate visiting signup lands on the resume dashboard', async ({ page, candidateUser }) => {
    await page.goto('/app/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', candidateUser.email);
    await page.fill('input[name="password"]', candidateUser.password);
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await page.goto('/app/signup');
    await expect(page).toHaveURL(/\/app\/dashboard\/?$/);
    await expect(page.getByRole('link', { name: /compare a resume/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create a resume/i })).toBeVisible();
    await expect(page.getByText(/auto.apply|pipeline|matches|welcome candidate/i)).toHaveCount(0);
    await page.reload();
    await expect(page).toHaveURL(/\/app\/dashboard\/?$/);
    await expect(page.getByRole('link', { name: /compare a resume/i })).toBeVisible();
  });

  test('an existing user can sign in and reach the product', async ({
    page,
    candidateUser,
  }) => {
    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="email"]', candidateUser.email);
    await page.fill('input[name="password"]', candidateUser.password);
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();

    await expect
      .poll(() => hasSession(page), {
        message: 'login did not establish a session',
        timeout: 30_000,
      })
      .toBe(true);

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('a wrong password is refused, and says so', async ({ page, guards }) => {
    // The failed sign-in goes straight to Supabase now, not to our backend, so
    // there is no /api/auth/login request to allow. The browser still logs the
    // failed fetch to the console, which the guard would otherwise flag.
    guards.allowConsoleErrors();

    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="email"]', 'nobody-e2e-auto@example.com');
    await page.fill('input[name="password"]', 'definitely-not-the-password');
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();

    // No session, and the user is told — a silent no-op would be the real bug.
    await expect.poll(() => hasSession(page)).toBe(false);

    await expect(
      page.locator('body'),
      'a failed login gave the user no feedback at all',
    ).toContainText(/invalid|incorrect|wrong|not found|failed|try again|credentials/i, {
      timeout: 15_000,
    });
  });

  test('signed-out visitors are kept out of the product', async ({ page, guards }) => {
    // The middleware now redirects before the page renders, so the dashboard's
    // data-fetch effect should never run. The allowances below are kept as a
    // safety net for the brief window where a cached page could still mount.
    guards.allowFailures(
      '/api/matching/matches',
      '/api/matching/recommendations',
      '/api/applications/my-applications',
      '/api/users/preferences',
      '/api/resume-builder',
    );
    guards.allowConsoleErrors();

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });

    // The middleware redirect is server-side, so this should be settled on
    // arrival rather than after a client-side bounce.
    const url = page.url();
    expect(
      /\/app\/login/.test(url),
      `an unauthenticated visitor was served ${url} instead of being redirected`,
    ).toBe(true);

    // And it must carry the requested route so sign-in can return them to it.
    expect(url).toContain('redirect=');
  });
});

/**
 * The homepage asks "Compare or Create?". A visitor who answered must not be
 * asked again after the account wall: the choice rides along as ?redirect= from
 * the middleware through login <-> signup and back into /app/resume.
 */
test.describe('the Compare/Create choice survives the account wall', () => {
  const COMPARE = '/app/resume?mode=compare';

  test('a signed-out visitor sent to login keeps the query and lands in that mode', async ({ page, candidateUser }) => {
    await page.goto(COMPARE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app\/login\?/);
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(COMPARE);

    // The way to a new account carries the same intent (the href settles once the router is ready).
    await expect(page.getByRole('link', { name: /create an account/i }))
      .toHaveAttribute('href', `/app/signup?redirect=${encodeURIComponent(COMPARE)}`);

    await page.fill('input[name="email"]', candidateUser.email);
    await page.fill('input[name="password"]', candidateUser.password);
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/app\/resume\?mode=compare$/, { timeout: 30_000 });
  });

  test('a new visitor from the homepage CTA signs up and lands in Compare', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Score my resume — free' }).first().click();
    await expect(page).toHaveURL(/\/app\/signup\?/);
    expect(new URL(page.url()).searchParams.get('redirect')).toBe(COMPARE);

    // A résumé intent is a candidate intent: no role picker, and the page says what the account is for.
    await expect(page.getByRole('heading', { name: /score your resume/i })).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /^sign in$/i }).first())
      .toHaveAttribute('href', `/app/login?redirect=${encodeURIComponent(COMPARE)}`);

    await page.fill('input[name="name"]', 'E2E Intent Candidate');
    await page.fill('input[name="email"]', uniqueEmail('signup-intent').replace('@example.com', '@jobocate.com'));
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('form').getByRole('button', { name: /create account/i }).click();

    await expect.poll(async () =>
      await hasSession(page) || await page.getByRole('heading', { name: 'Check your inbox.' }).isVisible(),
    ).toBe(true);
    if (!await hasSession(page)) return;
    await expect(page).toHaveURL(/\/app\/resume\?mode=compare$/, { timeout: 30_000 });
  });

  test('sign-in ignores an off-site redirect', async ({ page, candidateUser }) => {
    await page.goto('/app/login?redirect=%2F%2Fexample.com%2Fsteal', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="email"]', candidateUser.email);
    await page.fill('input[name="password"]', candidateUser.password);
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 30_000 });
    expect(new URL(page.url()).host).not.toBe('example.com');
  });
});
