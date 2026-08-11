import {
  test,
  expect,
  storage,
  expectNoHorizontalOverflow,
  expectPageRendered,
} from '../../fixtures/test';
import {
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  CANDIDATE_ROUTES,
  EMPLOYER_ROUTES,
  type RouteSpec,
} from '../../support/routes';

/**
 * The smoke layer: every route in the manifest, for the role that may see it.
 *
 * This is deliberately shallow and deliberately wide. It answers one question
 * for the whole product — "does this page still work at all?" — and it answers
 * it for pages nobody has opened in months. The guards in the base fixture do
 * most of the work: a page that renders but quietly 400s on its own API, logs a
 * React error, or scrolls sideways on mobile fails here without any spec author
 * having thought to check.
 */

function smokeTest(route: RouteSpec) {
  const title = `${route.name} (${route.path})`;

  test(title, async ({ page, guards }, testInfo) => {
    if (route.skip) test.skip(true, route.skip);
    if (route.allowFailures?.length) {
      guards.allowFailures(...route.allowFailures);
      // A failed fetch is reported on two independent channels — the network
      // response (caught above) and Chrome's own console log of the same
      // failure. A route that expects one expects both.
      guards.allowConsoleErrors();
    }

    const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });

    // A 5xx from the Next.js server is unambiguous: the page did not build or
    // threw during render.
    expect(
      response?.status(),
      `${title} returned HTTP ${response?.status()}`,
    ).toBeLessThan(500);

    // Client-side data fetching starts after DOMContentLoaded; without settling
    // here the guards would miss the very API failures they exist to catch.
    await page.waitForLoadState('networkidle').catch(() => {
      // A page holding a long-poll or websocket never goes idle. Not a failure.
    });

    await expectPageRendered(page, title);

    if (route.expectText) {
      await expect(
        page.locator('body'),
        `${title} did not render its expected content`,
      ).toContainText(route.expectText);
    }

    // Only assert layout on the mobile project — desktop overflow is a
    // different (and much rarer) problem, and asserting it twice doubles the
    // cost for no extra signal.
    if (testInfo.project.name === 'mobile') {
      await expectNoHorizontalOverflow(page, title);
    }
  });
}

test.describe('public routes', () => {
  // Signed out on purpose: these must not require a session.
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of [...PUBLIC_ROUTES, ...AUTH_ROUTES]) smokeTest(route);
});

test.describe('candidate routes', () => {
  test.use({ storageState: storage.candidate });

  for (const route of CANDIDATE_ROUTES) smokeTest(route);
});

test.describe('employer routes', () => {
  test.use({ storageState: storage.employer });

  for (const route of EMPLOYER_ROUTES) smokeTest(route);
});
