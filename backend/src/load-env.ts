/**
 * Early .env loader — MUST be imported before AppModule.
 *
 * NestJS evaluates conditional `imports`/decorators (e.g. the QUEUE_ENABLED
 * guards in queue.config.ts) at module LOAD time, which happens when
 * `./app.module` is required — BEFORE ConfigModule reads `.env`. Importing this
 * module as the very first line of main.ts runs dotenv as a side effect, so
 * `process.env.QUEUE_ENABLED` / `REDIS_*` are populated before app.module.ts is
 * evaluated. Real process env (docker/compose/prod) already works with no
 * dotenv; this only helps the local `.env`-file case.
 *
 * dotenv does not override variables already present in process.env, so
 * re-running dotenv.config() elsewhere is a harmless no-op.
 */
import * as dotenv from 'dotenv';
import { join } from 'path';

const candidatePaths = [
  join(process.cwd(), '.env'),
  join(process.cwd(), 'backend', '.env'),
  join(__dirname, '..', '.env'),
];

for (const path of candidatePaths) {
  const result = dotenv.config({ path });
  if (!result.error && result.parsed) {
    break;
  }
}
