import { test, expect } from '../../fixtures/test';
import { createUser, type TestUser } from '../../support/api';

async function signIn(page: any, user: TestUser) {
  const loginPath =
    user.role === 'ROLE_EMPLOYER' ? '/app/login?as=employer' : '/app/login';
  await page.goto(loginPath, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
  await page.waitForFunction(
    () => document.cookie.split(/;\s*/).some((cookie) => /^sb-.*-auth-token/.test(cookie)),
    null,
    { timeout: 30_000 },
  );
}

test.describe.configure({ mode: 'serial' });

test.describe('Settings logout', () => {
  test('candidate logout has pending/failure states and ends the session on retry', async ({
    page,
    guards,
  }) => {
    guards.allowConsoleErrors();
    const candidate = await createUser('ROLE_CANDIDATE', 'settings-logout-candidate');
    await signIn(page, candidate);
    await page.goto('/app/settings', { waitUntil: 'domcontentloaded' });

    const logout = page.getByRole('button', { name: 'Log out', exact: true });
    await expect(logout).toBeVisible();

    let releaseFailure!: () => void;
    const holdFailure = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    let logoutRequests = 0;
    const failLogout = async (route: any) => {
      logoutRequests += 1;
      await holdFailure;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'sign out failed' }),
      });
    };
    await page.route('**/auth/v1/logout**', failLogout);

    await logout.click();
    await expect(page.getByRole('button', { name: 'Logging out…' })).toBeDisabled();
    await page.getByRole('button', { name: 'Logging out…' }).evaluate((button: HTMLButtonElement) =>
      button.click(),
    );
    expect(logoutRequests).toBe(1);
    releaseFailure();

    await expect(page.getByText(/couldn.t log you out/i)).toBeVisible();
    await expect(page).toHaveURL(/\/app\/settings$/);

    await page.unroute('**/auth/v1/logout**', failLogout);
    await logout.click();
    await expect(page).toHaveURL(/\/app\/login$/);
    await page.goto('/app/settings');
    await expect(page).toHaveURL(/\/app\/login/);
  });

  test('employer can log out from the Account section on the profile page', async ({
    page,
  }) => {
    const employer = await createUser('ROLE_EMPLOYER', 'settings-logout-employer');
    await signIn(page, employer);
    await page.goto('/employer/profile', { waitUntil: 'domcontentloaded' });

    const account = page.getByRole('heading', { name: 'Account', exact: true });
    await expect(account).toBeVisible();
    const accountCard = account.locator('xpath=..').locator('xpath=..');
    const logout = accountCard.getByRole('button', { name: 'Log out', exact: true });
    await expect(logout).toBeVisible();
    await logout.click();

    await expect(page).toHaveURL(/\/app\/login$/);
    await page.goto('/employer/profile');
    await expect(page).toHaveURL(/\/app\/login/);
  });
});
