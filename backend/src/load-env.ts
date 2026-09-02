/**
 * Early .env loader — MUST be imported before AppModule.
 *
 * NestJS evaluates conditional `imports`/decorators (e.g. the QUEUE_ENABLED
 * guards in queue.config.ts) at module LOAD time, which happens when
 * `./app.module` is required — BEFORE ConfigModule reads the env. Importing
 * this module as the very first line of main.ts runs dotenv as a side effect,
 * so `process.env.QUEUE_ENABLED` / `REDIS_*` are populated before app.module.ts
 * is evaluated.
 *
 * There is one env file for the whole repo, at the root: `.env.local`, from
 * `.env.example`. The backend, the frontend, both compose stacks, Playwright
 * and the CLI scripts all read it. This used to be three near-identical copies
 * under `backend/` (`.env`, `.env.local`, `.env.docker`) carrying the same 16
 * keys with drifting values, which is exactly how a fix lands in one file and
 * not the two that were actually being read.
 *
 * Precedence: real process env > .env.local > .env. dotenv never overwrites an
 * already-exported variable, so compose and CI override any file value without
 * editing it — and re-running dotenv.config() elsewhere is a harmless no-op.
 */
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Walks up from this file looking for the repo root, so the loader works from
 * `backend/` under ts-node, from `backend/dist/` after a build, and from the
 * repo root under compose — all of which have a different cwd.
 */
function findRepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, '.env.example')) || existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fall back to cwd rather than throwing: a container that injects real env
  // vars needs no file at all, and failing to boot over a missing one would be
  // the wrong trade.
  return process.cwd();
}

export const REPO_ROOT = findRepoRoot();

/** Loads the repo-wide env files. Safe to call more than once. */
export function loadRepoEnv(): void {
  // .env.local first: dotenv keeps the first value it sees, so listing the
  // local override ahead of the shared default makes it win.
  for (const file of ['.env.local', '.env']) {
    const path = join(REPO_ROOT, file);
    if (existsSync(path)) dotenv.config({ path });
  }
}

loadRepoEnv();
