import { test, expect, storage } from '../../fixtures/test';
import { CANDIDATE_ROUTES } from '../../support/routes';

/**
 * Dead-end empty states.
 *
 * A brand-new candidate sees an empty version of almost every page, which makes
 * this the most-viewed state in the product and the least-tested. This suite's
 * account is genuinely new, so it hits those states naturally.
 *
 * The rule: a page that has nothing to show must still offer a way forward.
 * Shipped counter-examples from this codebase — the cover-letter page told users
 * to "generate one from a role" while its only control was "Resume builder",
 * and the sidebar rendered a permanently dead "— / —" credits meter.
 */
test.use({ storageState: storage.candidate });

/** Pages where a new user legitimately has nothing, and must be given a next step. */
const PAGES_THAT_START_EMPTY = CANDIDATE_ROUTES.filter((r) =>
  [
    '/app/matches',
    '/app/cover-letter',
    '/app/tracker',
    '/app/saved',
    '/app/offers',
    '/app/apply',
    '/app/resume-library',
    '/app/messages',
    '/app/notifications',
  ].includes(r.path),
);

/**
 * Words that indicate the page is telling the user to do something, rather than
 * just stating that there is nothing here.
 */
const OFFERS_A_NEXT_STEP =
  /add|create|new|start|find|browse|search|generate|upload|import|set up|get started|explore|connect|choose|pick|build|write|apply/i;

for (const route of PAGES_THAT_START_EMPTY) {
  test(`${route.name} offers a next step when it has nothing to show`, async ({
    page,
  }) => {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const body = await page.locator('body').innerText();

    // Only assert on pages that really are empty for this user; if the account
    // has data the page is out of scope here rather than wrongly failed.
    const looksEmpty = /no |nothing|empty|yet\b|haven't|don't have/i.test(body);
    test.skip(!looksEmpty, `${route.name} has data for this account`);

    // An actionable control, not merely the word "add" in prose.
    const actions = page.locator(
      'a[href]:visible, button:visible, [role="button"]:visible',
    );
    const count = await actions.count();

    // An accessible name can come from visible text OR a `title`/`aria-label`
    // attribute — an icon-only "+" control is a legitimate, common pattern, and
    // reading only innerText would wrongly flag it as offering nothing.
    const accessibleName = async (locator: ReturnType<typeof page.locator>, i: number) => {
      const el = locator.nth(i);
      const text = (await el.innerText().catch(() => '')).trim();
      // Real words win outright. A single glyph ("+", "×", "→") is an icon, not
      // a label — for THOSE, an aria-label or title is the actual accessible
      // name and takes priority over the symbol itself.
      if (text.length > 1) return text;
      const aria = await el.getAttribute('aria-label').catch(() => null);
      if (aria) return aria;
      const title = await el.getAttribute('title').catch(() => null);
      if (title) return title;
      return text;
    };

    const labels: string[] = [];
    for (let i = 0; i < Math.min(count, 60); i++) {
      const name = await accessibleName(actions, i);
      if (name) labels.push(name);
    }

    // Navigation is present on every page, so it cannot count as this page's
    // answer to "what do I do now?". Restrict to the main content area.
    const mainActions = page.locator(
      'main a[href]:visible, main button:visible, [role="main"] a[href]:visible, [role="main"] button:visible',
    );
    const mainCount = await mainActions.count();
    const mainLabels: string[] = [];
    for (let i = 0; i < Math.min(mainCount, 60); i++) {
      const name = await accessibleName(mainActions, i);
      if (name) mainLabels.push(name);
    }

    const pool = mainLabels.length ? mainLabels : labels;
    const hasNextStep = pool.some((l) => OFFERS_A_NEXT_STEP.test(l));

    expect(
      hasNextStep,
      `${route.name} shows an empty state with no way forward.\n` +
        `Controls found: ${pool.slice(0, 20).join(' | ') || '(none)'}\n` +
        `An empty state should tell the user what to do next, not just that ` +
        `there is nothing here.`,
    ).toBe(true);
  });
}
