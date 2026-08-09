import { DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { isQueueEnabled } from './queue.constants';

/**
 * =============================================================================
 * Bull (v4) + Redis background-queue pattern — GRACEFUL DEGRADATION
 * =============================================================================
 *
 * Design goals:
 *   - Default OFF. With no `QUEUE_ENABLED=true` (the dev default), NO Redis
 *     connection is ever attempted and producers run their work INLINE, exactly
 *     as before. Dev and unit tests keep working with no Redis.
 *   - When `QUEUE_ENABLED=true`, work is enqueued to Bull and run by processors.
 *
 * ── The reusable pattern (copy this for the auto-apply & cron queues) ────────
 *
 * 1) ROOT (once, in app.module.ts) — spread conditionally into `imports`:
 *
 *        imports: [
 *          ...bullRootImports(),   // [] when disabled, else BullModule.forRootAsync
 *          ...
 *        ]
 *
 * 2) PER-FEATURE QUEUE (in the feature module) — spread conditionally:
 *
 *        imports: [ ...bullQueueImports(QUEUE_PDF) ],   // registerQueue only when enabled
 *        providers: [
 *          FeatureService,
 *          ...(isQueueEnabled() ? [FeaturePdfProcessor] : []),
 *        ],
 *
 * 3) PRODUCER (a provider — service or controller) injects the queue OPTIONALLY:
 *
 *        constructor(
 *          @Optional() @InjectQueue(QUEUE_PDF) private readonly queue?: Queue,
 *        ) {}
 *
 *        async request(payload) {
 *          if (this.queue) {                                   // queue registered
 *            const job = await this.queue.add(JOB_GENERATE_PDF, payload);
 *            return { queued: true, jobId: job.id };
 *          }
 *          return this.doWorkInline(payload);                  // @Optional → undefined
 *        }
 *
 *    `@Optional()` is the whole trick: when the queue is not registered
 *    (disabled), Nest injects `undefined` instead of throwing, giving a clean
 *    inline fallback with no branching in module wiring.
 *
 * 4) PROCESSOR (registered only when enabled) just calls the existing method:
 *
 *        @Processor(QUEUE_PDF)
 *        export class FeaturePdfProcessor {
 *          constructor(private readonly service: FeatureService) {}
 *          @Process(JOB_GENERATE_PDF)
 *          handle(job: Job) { return this.service.doWorkInline(job.data); }
 *        }
 *
 * ── Env-timing gotcha ────────────────────────────────────────────────────────
 * These conditionals evaluate at module LOAD, before ConfigModule reads `.env`.
 * We solve it by importing `src/load-env.ts` as the very first line of main.ts,
 * so dotenv populates `process.env` before app.module.ts is required. Real
 * process env (docker/compose/prod) already works with no dotenv.
 *
 * ── Redis fail-fast ──────────────────────────────────────────────────────────
 * ioredis opts `maxRetriesPerRequest: null` + `enableOfflineQueue: false` make a
 * Redis outage fail fast instead of hanging queued commands forever.
 * =============================================================================
 */

type RedisOpts = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
  maxRetriesPerRequest: null;
  enableOfflineQueue: false;
};

/** Fail-fast ioredis options shared by every connection shape. */
const FAIL_FAST = {
  maxRetriesPerRequest: null as null,
  enableOfflineQueue: false as false,
};

/** Build the Bull root Redis connection from REDIS_URL or REDIS_HOST/PORT. */
export function buildRedisOptions(config: ConfigService): RedisOpts {
  const url = config.get<string>('REDIS_URL');
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port) || 6379,
      username: u.username || undefined,
      password: u.password || undefined,
      db: u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) || 0 : 0,
      tls: u.protocol === 'rediss:' ? {} : undefined,
      ...FAIL_FAST,
    };
  }
  return {
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: config.get<number>('REDIS_PORT', 6379),
    ...FAIL_FAST,
  };
}

/**
 * Root Bull registration for app.module.ts. Returns `[]` when queues are
 * disabled (no Redis touched), otherwise a single `BullModule.forRootAsync`.
 * Spread into the module's `imports` array.
 */
export function bullRootImports(): DynamicModule[] {
  if (!isQueueEnabled()) return [];
  return [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: buildRedisOptions(config),
      }),
    }),
  ];
}

/**
 * Per-feature queue registration. Returns `[]` when disabled, otherwise
 * `BullModule.registerQueue({ name })`. Spread into the feature module imports.
 */
export function bullQueueImports(name: string): DynamicModule[] {
  if (!isQueueEnabled()) return [];
  return [BullModule.registerQueue({ name })];
}
