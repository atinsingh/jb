import { test, expect } from '../../fixtures/test';
import { api, createUser, login, type TestUser } from '../../support/api';

async function signIn(page: any, user: TestUser, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
}

test.describe.configure({ mode: 'serial' });

test.describe('One account with candidate and employer workspaces', () => {
  test('login lets the visitor select the employer workspace without a special URL', async ({
    page,
  }) => {
    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('radio', { name: 'Candidate' })).toBeChecked();
    await page.getByRole('radio', { name: 'Employer' }).click();
    await expect(page.getByRole('radio', { name: 'Employer' })).toBeChecked();
  });

  test('the same email can enter employer mode and later return to candidate mode', async ({
    page,
  }) => {
    const user = await createUser('ROLE_CANDIDATE', 'dual-workspace');

    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('radio', { name: 'Employer' }).click();
    await expect(page.getByRole('radio', { name: 'Employer' })).toBeChecked();
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/employer\/dashboard$/);

    const employerToken = await login(user.email, user.password);
    const employerMe = await api.get<{ user: { id: string; email: string; role: string } }>(
      '/api/auth/me',
      employerToken,
    );
    expect(employerMe.user.email).toBe(user.email);
    expect(employerMe.user.role).toBe('ROLE_EMPLOYER');

    await page.goto('/employer/profile', { waitUntil: 'domcontentloaded' });
    const account = page.getByRole('heading', { name: 'Account', exact: true });
    const accountCard = account.locator('xpath=..').locator('xpath=..');
    await accountCard.getByRole('button', { name: 'Log out', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/login$/);

    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('radio', { name: 'Candidate' })).toBeChecked();
    await signIn(page, user, '/app/login');
    await expect(page).toHaveURL(/\/app\/dashboard$/);

    const candidateToken = await login(user.email, user.password);
    const candidateMe = await api.get<{ user: { id: string; email: string; role: string } }>(
      '/api/auth/me',
      candidateToken,
    );
    expect(candidateMe.user.id).toBe(employerMe.user.id);
    expect(candidateMe.user.email).toBe(user.email);
    expect(candidateMe.user.role).toBe('ROLE_CANDIDATE');
  });

  test('a workspace-switch failure stays on login and explains the failure', async ({
    page,
    guards,
  }) => {
    const user = await createUser('ROLE_CANDIDATE', 'dual-workspace-failure');
    guards.allowFailures(/\/api\/auth\/workspace$/);
    guards.allowConsoleErrors();
    await page.route('**/api/auth/workspace', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'workspace unavailable' }),
      }),
    );

    await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('radio', { name: 'Employer' }).click();
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();

    await expect(page).toHaveURL(/\/app\/login$/);
    await expect(page.getByRole('radio', { name: 'Employer' })).toBeChecked();
    await expect(
      page.getByRole('alert').filter({ hasText: /workspace unavailable/i }),
    ).toBeVisible();
  });

  test('an OAuth workspace-switch failure is surfaced instead of leaving sign-in stuck', async ({
    page,
    guards,
  }) => {
    const user = await createUser('ROLE_CANDIDATE', 'dual-workspace-oauth-failure');
    await signIn(page, user, '/app/login');
    await expect(page).toHaveURL(/\/app\/dashboard$/);

    guards.allowFailures(/\/api\/auth\/workspace$/);
    guards.allowConsoleErrors();
    await page.route('**/api/auth/workspace', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'workspace unavailable' }),
      }),
    );

    await page.goto('/auth/success?role=ROLE_EMPLOYER', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByText(/workspace unavailable/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible();
  });
});
