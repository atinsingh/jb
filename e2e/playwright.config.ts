import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

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
