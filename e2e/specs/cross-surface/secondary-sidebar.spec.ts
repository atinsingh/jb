import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';

for (const surface of [
  {
    name: 'candidate',
    storageState: storage.candidate,
    route: '/app/tracker',
    primaryName: 'Sections',
    secondaryName: 'Applications navigation',
    links: ['Applications', 'Saved', 'Offers'],
    nextLink: 'Saved',
    nextRoute: /\/app\/saved$/,
  },
  {
    name: 'employer',
    storageState: storage.employer,
    route: '/employer/candidates',
    primaryName: 'Employer primary',
    secondaryName: 'Employer candidates',
    links: ['Candidates', 'Screening', 'Pipeline', 'Talent pool'],
    nextLink: 'Screening',
    nextRoute: /\/employer\/screening$/,
  },
]) {
  test.describe(`${surface.name} secondary navigation`, () => {
    test.use({ storageState: surface.storageState });

    test('moves the active section into a left panel and collapses it on mobile', async ({ page }) => {
      await page.goto(surface.route, { waitUntil: 'domcontentloaded' });

      const primary = page.getByRole('navigation', { name: surface.primaryName });
      const secondary = page.getByRole('navigation', { name: surface.secondaryName });
      await expect(primary).toBeVisible();
      await expect(secondary.getByRole('link')).toHaveText(surface.links);
      await expect(secondary.getByRole('link', { name: surface.links[0], exact: true })).toHaveAttribute('aria-current', 'page');

      const primaryBox = await primary.boundingBox();
      const secondaryBox = await secondary.boundingBox();
      expect(primaryBox).not.toBeNull();
      expect(secondaryBox).not.toBeNull();
      expect(secondaryBox!.y).toBeGreaterThanOrEqual(primaryBox!.y + primaryBox!.height);
      expect(secondaryBox!.x).toBeLessThan(primaryBox!.x);
      expect(secondaryBox!.height).toBeGreaterThan(secondaryBox!.width);
      await expectNoHorizontalOverflow(page, `${surface.name} desktop sidebar`);

      await secondary.getByRole('link', { name: surface.nextLink }).click();
      await expect(page).toHaveURL(surface.nextRoute);
      await expect(page.getByRole('navigation', { name: surface.secondaryName }).getByRole('link', { name: surface.nextLink })).toHaveAttribute('aria-current', 'page');

      await page.setViewportSize({ width: 390, height: 844 });
      const toggle = page.getByRole('button', { name: 'Open section navigation' });
      await expect(toggle).toBeVisible();
      await toggle.click();
      await expect(page.getByRole('navigation', { name: surface.secondaryName })).toBeVisible();
      await expectNoHorizontalOverflow(page, `${surface.name} mobile sidebar`);
    });
  });
}
