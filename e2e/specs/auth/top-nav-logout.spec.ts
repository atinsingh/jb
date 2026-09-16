import { test, expect, storage } from '../../fixtures/test';

test.describe('Candidate top-nav logout', () => {
  test.use({ storageState: storage.candidate });

  test('logged-in candidates can log out from the top navigation', async ({ page }) => {
    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });

    const header = page.getByRole('banner');
    const logout = header.getByRole('button', { name: 'Log out', exact: true });
    await expect(logout).toBeVisible();
    await expect(logout).toBeEnabled();

    await logout.focus();
    await expect(logout).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/app\/login/);
    await expect(page.getByRole('button', { name: 'Log out', exact: true })).toHaveCount(0);

    await page.goto('/app/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app\/login/);
  });
});

test.describe('Employer top-nav logout', () => {
  test.use({ storageState: storage.employer });

  test('logged-in employers can log out from the top navigation', async ({ page }) => {
    await page.goto('/employer/dashboard', { waitUntil: 'domcontentloaded' });

    const header = page.locator('#employer-v3-shell');
    const logout = header.getByRole('button', { name: 'Log out', exact: true });
    await expect(logout).toBeVisible();
    await expect(logout).toBeEnabled();

    await logout.focus();
    await expect(logout).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/app\/login/);
    await expect(page.getByRole('button', { name: 'Log out', exact: true })).toHaveCount(0);

    await page.goto('/employer/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app\/login/);
  });
});
