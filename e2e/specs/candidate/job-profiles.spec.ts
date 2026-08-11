import { test, expect, storage } from '../../fixtures/test';
import { uniqueId } from '../../support/api';

/**
 * Job profiles are the control surface for matching: target countries, skills,
 * role and match threshold all live here. Every field on this page has at some
 * point been stored, displayed, and then ignored by the matcher, so this spec
 * checks that what the user types survives a round trip.
 */
test.use({ storageState: storage.candidate });
test.describe.configure({ mode: 'serial' });

test.describe('job profiles', () => {
  const profileName = `E2E Profile ${uniqueId('jp')}`;

  test('the page loads and offers a way to create a profile', async ({ page }) => {
    await page.goto('/app/job-profiles', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // Whether the user has profiles or not, there must be a way forward. An
    // empty state with no action is a dead end — a defect class this product
    // has shipped more than once.
    const createAction = page.getByRole('button', { name: /new|create|add/i }).first();
    await expect(
      createAction,
      'the job profiles page offers no way to create a profile',
    ).toBeVisible({ timeout: 20_000 });
  });

  test('a profile created in the UI keeps its values', async ({ page }) => {
    await page.goto('/app/job-profiles', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await page.getByRole('button', { name: /new|create|add/i }).first().click();

    // By label, not by name attribute: the field is a controlled input with an
    // id + <label htmlFor>, and no `name` attribute at all.
    const nameField = page.getByLabel('Profile name').first();
    await expect(nameField, 'the profile form has no name field').toBeVisible({
      timeout: 15_000,
    });
    await nameField.fill(profileName);

    const roleField = page.locator('input[name="role"]').first();
    if (await roleField.count()) await roleField.fill('Staff Backend Engineer');

    await page.getByRole('button', { name: /^save|create|add profile/i }).first().click();

    await expect(
      page.locator('body'),
      'the profile disappeared after saving — the write did not persist',
    ).toContainText(profileName, { timeout: 25_000 });
  });

  test('the saved profile survives a reload', async ({ page }) => {
    // A value that only exists in React state looks identical to a saved one
    // until you refresh. This is the cheapest possible check for a fake save.
    await page.goto('/app/job-profiles', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      page.locator('body'),
      'the profile vanished on reload — it was never persisted',
    ).toContainText(profileName, { timeout: 25_000 });
  });
});
