import { test as base, expect, type Page, type ConsoleMessage } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { STORAGE_DIR } from '../playwright.config';
import { ACCOUNTS_FILE, type ProvisionedAccounts } from '../support/global-setup';
import type { TestUser } from '../support/api';

/**
 * The base test every spec imports.
 *
 * Its job is not convenience — it is to make whole CLASSES of defect fail
 * automatically, so nobody has to remember to assert them. Real examples from
 * this codebase that these guards would have caught without anyone writing a
 * specific test:
 *
 *   - Every POST to /api/llm/* returned 400 "property x should not exist",
 *     because the DTOs carried no class-validator decorators. `apiFailures`
 *     catches this on any page that calls such a route.
 *   - A page swallowed a 401 in `.catch(() => {})` and rendered a success
 *     state. `consoleErrors` and `apiFailures` both surface it.
 *   - 29 pages scrolled horizontally on mobile. `expectNoHorizontalOverflow`.
 */

/** Console noise that is not a product defect and would otherwise mask real ones. */
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /React DevTools/i,
  /Warning: ReactDOM.render is no longer supported/i,
  // Next.js dev-only hydration diagnostics are noisy but not what this suite is for.
  /webpack-hmr/i,
  /_next\/static\/development/i,
];

/** Endpoints whose failure is expected in some tests (opt-in per spec). */
export interface FailureRecord {
  url: string;
  status: number;
  body: string;
}

export interface Guards {
  /** Console errors seen so far, minus known-benign noise. */
  consoleErrors: string[];
  /** Backend responses with status >= 400 seen so far. */
  apiFailures: FailureRecord[];
  /**
   * Allow specific failures for a test that deliberately triggers them (e.g. a
   * negative-path spec asserting a 401). Substring or regex match on the URL.
   */
  allowFailures: (...patterns: (string | RegExp)[]) => void;
  /** Turn off console assertion for a test that intentionally logs an error. */
  allowConsoleErrors: () => void;
}

function readAccounts(): ProvisionedAccounts {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    throw new Error(
      `Missing ${ACCOUNTS_FILE}. Global setup did not run — start the stack and re-run.`,
    );
  }
  return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
}

type Fixtures = {
  guards: Guards;
  candidateUser: TestUser;
  employerUser: TestUser;
};

export const test = base.extend<Fixtures>({
  candidateUser: async ({}, use) => {
    await use(readAccounts().candidate);
  },

  employerUser: async ({}, use) => {
    await use(readAccounts().employer);
  },

  guards: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const apiFailures: FailureRecord[] = [];
      const allowedFailures: (string | RegExp)[] = [];
      let consoleAssertionOn = true;

      const isAllowed = (url: string) =>
        allowedFailures.some((p) =>
          typeof p === 'string' ? url.includes(p) : p.test(url),
        );

      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
        consoleErrors.push(text);
      });

      // An uncaught exception is never acceptable — it means React likely
      // stopped rendering part of the tree.
      page.on('pageerror', (err) => {
        consoleErrors.push(`[pageerror] ${err.message}`);
      });

      page.on('response', async (res) => {
        const url = res.url();
        if (res.status() < 400) return;
        // Only the product's own API — third-party and asset 404s are noise.
        if (!url.includes('/api/')) return;
        if (isAllowed(url)) return;

        let body = '';
        try {
          body = (await res.text()).slice(0, 400);
        } catch {
          body = '<unreadable>';
        }
        apiFailures.push({ url, status: res.status(), body });
      });

      const guards: Guards = {
        consoleErrors,
        apiFailures,
        allowFailures: (...patterns) => allowedFailures.push(...patterns),
        allowConsoleErrors: () => {
          consoleAssertionOn = false;
        },
      };

      await use(guards);

      // Assert AFTER the test body. Attaching the detail to the report matters:
      // "1 API failure" is useless, the server's own message is the diagnosis.
      if (apiFailures.length > 0) {
        const detail = apiFailures
          .map((f) => `  ${f.status} ${f.url}\n    ${f.body}`)
          .join('\n');
        await testInfo.attach('api-failures', { body: detail, contentType: 'text/plain' });
        expect(
          apiFailures,
          `The page made API calls that failed:\n${detail}\n\n` +
            `If a failure is intentional for this test, call guards.allowFailures(...).`,
        ).toHaveLength(0);
      }

      if (consoleAssertionOn && consoleErrors.length > 0) {
        const detail = consoleErrors.map((e) => `  ${e}`).join('\n');
        await testInfo.attach('console-errors', {
          body: detail,
          contentType: 'text/plain',
        });
        expect(
          consoleErrors,
          `The page logged console errors:\n${detail}\n\n` +
            `If intentional, call guards.allowConsoleErrors().`,
        ).toHaveLength(0);
      }
    },
    // `auto` is the point: a spec gets these guards without importing anything.
    { auto: true },
  ],
});

export { expect };

/** Storage state paths for role-scoped describe blocks. */
export const storage = {
  candidate: path.join(STORAGE_DIR, 'candidate.json'),
  employer: path.join(STORAGE_DIR, 'employer.json'),
};

/**
 * Assert the page does not scroll sideways.
 *
 * A prior manual audit found 29 pages overflowing on mobile. A small tolerance
 * absorbs sub-pixel layout rounding, which otherwise makes this flaky.
 */
export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(
    overflow.scrollWidth,
    `${label} scrolls horizontally (content ${overflow.scrollWidth}px in a ` +
      `${overflow.clientWidth}px viewport). Find the element wider than its container.`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

/**
 * Assert the page rendered real content rather than a crash or a blank shell.
 *
 * Next.js renders its error overlay INTO the page in dev, so a "successful"
 * navigation can still be a build failure.
 */
export async function expectPageRendered(page: Page, label: string) {
  const nextError = page.locator('#__next-build-watcher, nextjs-portal');
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';

  expect(bodyText.trim().length, `${label} rendered an empty body`).toBeGreaterThan(0);

  // The dev overlay's text is the most direct evidence of a compile/runtime error.
  const overlay = await page
    .locator('nextjs-portal')
    .count()
    .catch(() => 0);
  if (overlay > 0) {
    const text = await page.locator('nextjs-portal').innerText().catch(() => '');
    if (/unhandled runtime error|failed to compile/i.test(text)) {
      throw new Error(`${label} shows a Next.js error overlay:\n${text.slice(0, 800)}`);
    }
  }
  void nextError;
}
