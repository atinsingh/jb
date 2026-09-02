import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Supabase credentials for `support/api.ts`, read from the repo-wide env file.
 *
 * Deliberately NOT an `e2e/.env`: these are real service-role keys, and a copy
 * is a copy that drifts and a copy that leaks. `.env.local` at the root is the
 * single source every part of this repo reads. Nothing is written to disk, and
 * an already-exported variable always wins so CI can pass its own values.
 */
function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

// .env.local first — dotenv-style precedence, local overrides shared.
loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env'));

/**
 * Browser end-to-end suite for Jobocate.
 *
 * This suite drives the REAL stack — Next.js, NestJS and MongoDB — on purpose.
 * Nearly every defect found on this project so far lived on a layer boundary
 * (a DTO rejecting an undeclared field, a destructure dropping a param, a
 * publish step skipping normalization). Unit tests structurally cannot see
 * those, because each layer's own tests pass. Only driving the product does.
 *
 * Servers are NOT started by this config when they are already up: `reuse-
 * ExistingServer` keeps a developer's running `pnpm dev` intact instead of
 * fighting it for the port.
 */

const FRONTEND_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.E2E_API_URL || 'http://localhost:8000';

export const URLS = { frontend: FRONTEND_URL, backend: BACKEND_URL };

/** Where per-role signed-in browser state is cached by global setup. */
export const STORAGE_DIR = path.join(__dirname, '.auth');

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',

  // A failing E2E run should point at ONE cause, not a wall of cascading
  // timeouts, so the whole run stops early on a burst of failures in CI.
  maxFailures: process.env.CI ? 10 : undefined,

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // The stack is shared mutable state (one MongoDB), so heavy parallelism makes
  // tests observe each other's writes. Journeys that create data are further
  // serialized within their own files.
  workers: process.env.CI ? 2 : 4,

  // LLM-backed routes legitimately take tens of seconds on a local gateway.
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'never' }], ['list']],

  globalSetup: require.resolve('./support/global-setup'),

  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Mobile is a first-class surface here: a prior audit found 29 pages with
      // horizontal overflow, so the smoke layer asserts against it explicitly.
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /smoke\/.*\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: 'pnpm --filter backend dev',
          url: `${BACKEND_URL}/health`,
          reuseExistingServer: true,
          timeout: 180_000,
          cwd: path.join(__dirname, '..'),
        },
        {
          command: 'pnpm --filter jobocate dev',
          url: FRONTEND_URL,
          reuseExistingServer: true,
          timeout: 180_000,
          cwd: path.join(__dirname, '..'),
        },
      ],
});
