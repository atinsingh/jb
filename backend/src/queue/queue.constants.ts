/**
 * Shared queue names and job names for the Bull background-queue infrastructure.
 *
 * Keep every queue name and job-type string here so producers, processors and
 * `BullModule.registerQueue({ name })` calls all reference the same constant and
 * cannot drift.
 */

/** Queue for Puppeteer résumé-PDF generation. */
export const QUEUE_PDF = 'pdf';

/** Job name inside the PDF queue: render + persist a résumé PDF. */
export const JOB_GENERATE_PDF = 'generate';

/** Queue for candidate auto-apply batches (match calc + cover-letter gen + pipeline bridge). */
export const QUEUE_AUTO_APPLY = 'auto-apply';

/** Job name inside the auto-apply queue: run one auto-apply batch for a user. */
export const JOB_AUTO_APPLY = 'run';

/** Queue for headless ATS submission (Puppeteer, Greenhouse-first). */
export const QUEUE_ATS = 'ats-submit';

/** Job name inside the ATS queue: process a batch of pending auto-applied applications. */
export const JOB_ATS_SUBMIT = 'submit';

/** Queue for background AI agent runs (generic planner/executor runtime). */
export const QUEUE_AGENT = 'agent';

/** Job name inside the agent queue: execute one agent run to completion. */
export const JOB_AGENT_RUN = 'run';

/**
 * True only when background queues are switched on via env.
 *
 * Default is OFF: with no `QUEUE_ENABLED=true`, producers never see a queue and
 * run their work inline (see `@Optional() @InjectQueue(...)`), so dev and tests
 * run with NO Redis and zero behaviour change.
 */
export function isQueueEnabled(): boolean {
  return process.env.QUEUE_ENABLED === 'true';
}
