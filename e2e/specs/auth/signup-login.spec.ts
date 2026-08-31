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
  return cookies.some((c) => /^sb-.*-auth-token/.test(c.name) && !!c.value);
}

test.describe('signing up and in', () => {
  test('a new candidate can register through the form', async ({ page }) => {
    const email = uniqueEmail('signup-candidate');

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

    // Success is a persisted session, not a URL: the app routes new users to
    // onboarding, dashboard or a verify-email notice depending on config, and
    // asserting one of those would make this test about routing config.
    await expect
      .poll(() => hasSession(page), {
        message: 'signup did not establish a session',
        timeout: 30_000,
      })
      .toBe(true);
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
