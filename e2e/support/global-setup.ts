import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { STORAGE_DIR, URLS } from '../playwright.config';
import { createUser, waitForBackend, type TestUser } from './api';

/**
 * Provision one candidate and one employer, then capture a signed-in browser
 * state for each so specs start authenticated instead of logging in repeatedly.
 *
 * Users are REGISTERED over the API (fast, and a signup-form change should not
 * break unrelated specs) but SIGNED IN through the real login form. Minting
 * localStorage by hand would mean this suite guessing at the shape AuthContext
 * writes, and quietly drifting the day that shape changes — the exact class of
 * bug this suite exists to catch.
 */

export const ACCOUNTS_FILE = path.join(STORAGE_DIR, 'accounts.json');

export interface ProvisionedAccounts {
  candidate: TestUser;
  employer: TestUser;
}

async function signInAndSaveState(
  user: TestUser,
  storagePath: string,
): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${URLS.frontend}/app/login`, { waitUntil: 'domcontentloaded' });

    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);

    // Targeted by ACCESSIBLE NAME, not by `type="submit"`: the login button is
    // a type="button" with an onClick handler, so a type-based selector finds
    // nothing. Role + name is what a user (and a screen reader) goes by, and it
    // survives markup changes that a structural selector would not.
    await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();

    // Login is done when the app has actually persisted a token — a URL change
    // alone can happen before AuthContext finishes writing.
    await page.waitForFunction(() => !!window.localStorage.getItem('authToken'), null, {
      timeout: 30_000,
    });

    await context.storageState({ path: storagePath });
  } catch (err) {
    const shot = storagePath.replace(/\.json$/, '-login-failure.png');
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    throw new Error(
      `Could not sign in ${user.role} (${user.email}) through the login form. ` +
        `Screenshot: ${shot}. Original: ${err instanceof Error ? err.message : err}`,
    );
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  await waitForBackend();

  const candidate = await createUser('ROLE_CANDIDATE', 'candidate');
  const employer = await createUser('ROLE_EMPLOYER', 'employer');

  await signInAndSaveState(candidate, path.join(STORAGE_DIR, 'candidate.json'));
  await signInAndSaveState(employer, path.join(STORAGE_DIR, 'employer.json'));

  const accounts: ProvisionedAccounts = { candidate, employer };
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));

  console.log(
    `\n[e2e] provisioned candidate=${candidate.email} employer=${employer.email}\n`,
  );
}
