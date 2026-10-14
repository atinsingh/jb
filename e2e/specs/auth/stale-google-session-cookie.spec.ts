import { test, expect } from '../../fixtures/test';

/**
 * Google sign-in stores the whole Supabase user (identities, avatar URL,
 * provider tokens) in chunked `sb-*-auth-token` cookies. A second sign-in
 * leaves the old chunks behind. The Cookie header then exceeds what the
 * proxy will forward, and the site answers 502 until the jar is cleared.
 *
 * A small cookie must survive: the recovery only drops a jar that is already
 * too big to send.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('an oversized auth cookie is cleared so login can load', async ({ page, guards }) => {
  guards.allowConsoleErrors();
  await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
  const origin = new URL(page.url()).origin;
  const chunk = 'x'.repeat(3000);

  await page.context().addCookies([
    { name: 'sb-google-relogin-auth-token.0', value: chunk, url: origin },
    { name: 'sb-google-relogin-auth-token.1', value: chunk, url: origin },
    { name: 'sb-google-relogin-auth-token.2', value: chunk, url: origin },
  ]);

  const response = await page.reload({ waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 500).toBeLessThan(500);
  await expect(page.locator('input[name="email"]')).toBeVisible();

  const leftover = (await page.context().cookies()).filter(
    (cookie) => cookie.name.startsWith('sb-google-relogin-auth-token') && cookie.value,
  );
  expect(leftover).toEqual([]);
});

test('a small auth cookie is left in place', async ({ page }) => {
  await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
  const origin = new URL(page.url()).origin;

  await page.context().addCookies([
    { name: 'sb-small-auth-token', value: 'not-a-session', url: origin },
  ]);
  await page.reload({ waitUntil: 'domcontentloaded' });

  const cookies = await page.context().cookies();
  expect(
    cookies.some((cookie) => cookie.name === 'sb-small-auth-token' && cookie.value === 'not-a-session'),
  ).toBe(true);
});
