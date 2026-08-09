/**
 * Queue + job-name constants for the CRON background-queue conversion.
 *
 * Kept OUT of `queue.constants.ts` (owned by another agent). This file owns
 * everything for turning the five single-instance `@Cron` schedulers into Bull
 * REPEATABLE jobs so they fire exactly-once across replicas.
 *
 * Design: ONE shared `cron` queue with one distinct job name per scheduler.
 * Each domain module registers its own `@Processor('cron')` consumer that only
 * handles its own job names (Bull supports multiple consumer classes on one
 * queue as long as the job names never collide), so no module has to depend on
 * another module's services.
 *
 * Backward compatibility: reuse `isQueueEnabled()` from `queue.constants.ts`.
 * With `QUEUE_ENABLED` unset the queue is never registered, the injected
 * `@Optional()` queue is `undefined`, no repeatable job is registered, and the
 * plain `@Cron` handlers run exactly as before (no Redis needed).
 */

/** Single shared Bull queue for every converted cron scheduler. */
export const QUEUE_CRON = 'cron';

// ── Job names (one per converted @Cron) ──────────────────────────────────────
/** monitors/monitor.scheduler.ts — scrape greenhouse/lever/workday. */
export const JOB_MONITORS = 'monitors';
/** ingestion/orchestration/ingestion.scheduler.ts — per-source polling. */
export const JOB_INGESTION_POLL = 'ingestion-poll';
/** ingestion/orchestration/expiration.service.ts — expiry + link verify. */
export const JOB_INGESTION_EXPIRY = 'ingestion-expiry';
/** job-tracker/reminders.service.ts — process due reminders. */
export const JOB_REMINDERS = 'reminders';
/** job-tracker/analytics.service.ts — monthly analytics aggregation. */
export const JOB_ANALYTICS = 'analytics';

// ── Stable repeatable-job ids ────────────────────────────────────────────────
// A stable jobId makes duplicate `queue.add(..., { repeat })` calls across
// replicas collapse to a SINGLE repeatable schedule instead of N copies.
export const JOBID_MONITORS = 'cron:monitors';
export const JOBID_INGESTION_POLL = 'cron:ingestion-poll';
export const JOBID_INGESTION_EXPIRY = 'cron:ingestion-expiry';
export const JOBID_REMINDERS = 'cron:reminders';
export const JOBID_ANALYTICS = 'cron:analytics';

// ── Cron expressions (must match the original @Cron intervals exactly) ────────
export const CRON_MONITORS = '0 * * * *'; // CronExpression.EVERY_HOUR
export const CRON_INGESTION_POLL = '*/30 * * * *'; // CronExpression.EVERY_30_MINUTES
export const CRON_INGESTION_EXPIRY = '0 */6 * * *'; // CronExpression.EVERY_6_HOURS
export const CRON_REMINDERS = '0 * * * *'; // CronExpression.EVERY_HOUR
export const CRON_ANALYTICS = '0 0 1 * *'; // 1st of every month
