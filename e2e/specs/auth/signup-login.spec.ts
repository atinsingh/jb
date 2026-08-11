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

test.describe('signing up and in', () => {
  test('a new candidate can register through the form', async ({ page }) => {
    const email = uniqueEmail('signup-candidate');

    await page.goto('/app/signup', { waitUntil: 'domcontentloaded' });

    // Signup is a two-stage flow: pick a role card, click Continue, THEN the
    // email/password form appears. The form fields do not exist in the DOM
    // until both of those happen — picking the card alone does not advance.
    await page
      .getByRole('button', { name: /looking for a job/i })
      .first()
      .click();
    await page.getByRole('button', { name: /^continue/i }).click();

    await page.fill('input[name="name"]', 'E2E Signup Candidate');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.getByRole('button', { name: /sign ?up|create|get started|continue/i }).first().click();

    // Success is a persisted session, not a URL: the app routes new users to
    // onboarding, dashboard or a verify-email notice depending on config, and
    // asserting one of those would make this test about routing config.
    await expect
      .poll(
        () => page.evaluate(() => !!window.localStorage.getItem('authToken')),
        { message: 'signup did not establish a session', timeout: 30_000 },
      )
      .toBe(true);
  });

  test('an existing user can sign in and reach the product', async ({
    page,
    candidateUser,
  }) => {
    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="email"]', candidateUser.email);
    await page.fill('input[name="password"]', candidateUser.password);
    await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();

    await expect
      .poll(
        () => page.evaluate(() => !!window.localStorage.getItem('authToken')),
        { message: 'login did not establish a session', timeout: 30_000 },
      )
      .toBe(true);

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('a wrong password is refused, and says so', async ({ page, guards }) => {
    // The 401 here is the point of the test, so it is not a guard failure. The
    // browser also logs the failed fetch to the console on top of the network
    // event Playwright reports separately, so both channels need the allowance.
    guards.allowFailures('/api/auth/login');
    guards.allowConsoleErrors();

    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="email"]', 'nobody-e2e-auto@example.com');
    await page.fill('input[name="password"]', 'definitely-not-the-password');
    await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();

    // No session, and the user is told — a silent no-op would be the real bug.
    await expect
      .poll(() => page.evaluate(() => !!window.localStorage.getItem('authToken')))
      .toBe(false);

    await expect(
      page.locator('body'),
      'a failed login gave the user no feedback at all',
    ).toContainText(/invalid|incorrect|wrong|not found|failed|try again/i, {
      timeout: 15_000,
    });
  });

  test('signed-out visitors are kept out of the product', async ({ page, guards }) => {
    // The dashboard's own data-fetch effect and AuthContext's redirect guard
    // both run on mount, independently. The redirect wins and no protected DATA
    // is ever shown, but the data-fetch effect gets a beat of runway first and
    // fires five authenticated calls that 401 before the redirect lands. That
    // is wasted requests, not a security gap, so it is allowed here rather than
    // silently muted — this is what the assertion below actually verifies.
    guards.allowFailures(
      '/api/matching/matches',
      '/api/matching/recommendations',
      '/api/applications/my-applications',
      '/api/users/preferences',
      '/api/resume-builder',
    );
    // Chrome logs a failed fetch to the console in addition to the network
    // event above — same expected noise, second channel.
    guards.allowConsoleErrors();

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });

    // Either a redirect to login or an explicit gate is acceptable; silently
    // rendering the dashboard shell to a stranger is not.
    await page.waitForLoadState('networkidle').catch(() => {});

    const url = page.url();
    const body = (await page.locator('body').innerText()).toLowerCase();
    const gated =
      /\/login|\/signup|\/unauthorized/.test(url) ||
      /sign in|log in|unauthori/i.test(body);

    expect(gated, `an unauthenticated visitor was served ${url}`).toBe(true);
  });
});
