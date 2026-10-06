import { test, expect } from '../../fixtures/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('the homepage comparison demo plays and resume actions work on mobile', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'Candidates', exact: true })).toHaveAttribute('href', '/#candidates');
  await expect(page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'Resume', exact: true })).toHaveCount(0);
  await expect(page.locator('#candidates')).toContainText('Know where you stand.');
  await expect(page.getByRole('link', { name: 'Create my resume' }).first()).toHaveAttribute('href', '/app/resume?mode=generate');
  await expect(page.getByRole('link', { name: 'Compare my resume' })).toHaveAttribute('href', '/app/resume?mode=compare');
  await expect(page.locator('main')).not.toContainText(/\bAI\b|résumé/i);
  const video = page.locator('video');
  await expect(video).toHaveAttribute('autoplay', '');
  await expect(video).toHaveAttribute('loop', '');
  await expect(video).not.toHaveAttribute('controls', '');
  await expect(video).toHaveJSProperty('muted', true);
  await video.evaluate((element: HTMLVideoElement) => element.load());
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate((element: HTMLVideoElement) => element.duration)).toBeGreaterThan(8);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.textTracks[0]?.cues?.length || 0)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true });
});

test('public pricing plans align side by side and the employer page stays usable on mobile', async ({ page }, testInfo) => {
  await page.goto('/pricing');
  const plans = page.getByTestId('candidate-pricing-tier');
  await expect(plans.nth(1)).toBeVisible();
  const first = await plans.nth(0).boundingBox();
  const second = await plans.nth(1).boundingBox();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
  expect(second!.x).toBeGreaterThan(first!.x + first!.width - 2);
  await page.screenshot({ path: testInfo.outputPath('pricing.png'), fullPage: true });
  await page.goto('/employers');
  await expect(page.getByRole('link', { name: 'Start hiring' }).last()).toHaveAttribute('href', '/app/signup?as=employer');
  await expect(page.locator('main')).not.toContainText(/\bAI\b|Candidate ·|Verified candidates only/);
  await page.screenshot({ path: testInfo.outputPath('employers.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/pricing');
  await expect(plans.nth(1)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
