import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';

test.use({ storageState: storage.candidate });
const destinations = ['/app/resume', '/app/resume-library', '/app/preferences', '/app/settings', '/app/billing'];
test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', r => r.fulfill({ json: { user: { id: 'candidate-layout', role: 'ROLE_CANDIDATE' } } }));
  await page.route('**/api/resume-harness/options', r => r.fulfill({ json: { models: [{ model: 'test-model', label: 'Test model', efforts: ['low'] }], sandboxAvailable: true, profile: { ready: true, missing: [], optionalGaps: [] } } }));
  await page.route('**/api/resume-harness/templates', r => r.fulfill({ json: [] }));
  await page.route('**/api/resume-harness/sessions', r => r.fulfill({ json: [] }));
  await page.route('**/api/resume-builder', r => r.fulfill({ json: [{ id: 'layout-resume', name: 'Layout resume', status: 'active', template: 'modern', updatedAt: '2026-09-29' }] }));
});

test('candidate v1 navigation and explicit résumé modes fit desktop and mobile', async ({ page }) => {
  await page.goto('/app/resume');
  const nav = page.getByRole('navigation', { name: 'Candidate navigation' });
  await expect(nav).toBeVisible();
  expect(await nav.locator('a').evaluateAll(links => links.map(a => a.getAttribute('href')))).toEqual(destinations);
  await expect(page.getByTestId('model-select')).toBeHidden();
  await page.screenshot({ path: 'tmp/v1-resume-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Compare Resume/ }).click();
  await expect(page.locator('input[type=file]')).toHaveCount(1);
  await page.getByRole('button', { name: /AI Generate Resume/ }).click();
  await expect(page.getByTestId('model-select')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('model-select')).toBeVisible();
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await expectNoHorizontalOverflow(page);
    for (const link of await nav.locator('a').all()) await expect(link).toBeVisible();
    if (width === 1280) await page.screenshot({ path: 'tmp/v1-generate-desktop.png', fullPage: true });
  }
});

test('a generation configuration failure leaves Compare accessible', async ({ page, guards }) => {
  guards.allowFailures(/\/api\/resume-harness\/options/);
  guards.allowConsoleErrors();
  await page.route('**/api/resume-harness/options', r => r.fulfill({ status: 503, json: { message: 'Models unavailable' } }));
  await page.goto('/app/resume');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /Compare Resume/ }).click();
  await expect(page.locator('input[type=file]')).toHaveCount(1);
});

test('library action menu stays inside the viewport and supports Escape focus return', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await page.goto('/app/resume-library');
  const trigger = page.getByRole('button', { name: 'More actions' }).first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  const bounds = await menu.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(650);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('all five candidate pages fit a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  for (const destination of destinations) {
    await page.goto(destination);
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page, destination);
    await page.screenshot({ path: `tmp/v1-${destination.split('/').pop()}-mobile.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expectNoHorizontalOverflow(page, 'light theme');
  await page.screenshot({ path: 'tmp/v1-billing-light.png', fullPage: true });
});
