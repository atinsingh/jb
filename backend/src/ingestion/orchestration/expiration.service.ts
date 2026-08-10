import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../../common/logger/logger.service';
import { Job, JobDocument } from '../../schemas/job.schema';
import { FetcherService } from '../pipeline/fetcher.service';
import { IngestionMetricsService } from './metrics.service';
import { isQueueEnabled } from '../../queue/queue.constants';
import {
  QUEUE_CRON,
  JOB_INGESTION_EXPIRY,
  JOBID_INGESTION_EXPIRY,
  CRON_INGESTION_EXPIRY,
} from '../../queue/cron-queue.constants';

const MAX_VERIFY_FAILURES = 3;

/**
 * Freshness & expiration monitoring (spec §11).
 *
 * Two responsibilities on a cron:
 *   1. Expire published external jobs past their expiration (source-provided or
 *      the internal max-age) — they leave candidate search promptly.
 *   2. Verify a batch of the least-recently-checked published external jobs by
 *      fetching their application URL; 404 / gone / closed markers increment a
 *      failure counter, and after MAX_VERIFY_FAILURES the job is archived.
 *
 * Employer-posted (isExternal:false) jobs are never expired here — their
 * lifecycle is owned by the employer. Historical records are preserved
 * (lifecycle changes, never hard-deleted) so analytics + application history
 * survive.
 */
@Injectable()
export class ExpirationService implements OnModuleInit {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    private readonly fetcher: FetcherService,
    private readonly config: ConfigService,
    private readonly metrics: IngestionMetricsService,
    private readonly logger: AppLoggerService,
    // Present only when QUEUE_ENABLED=true; else @Optional → undefined (inline).
    @Optional() @InjectQueue(QUEUE_CRON) private readonly cronQueue?: Queue,
  ) {
    this.logger.setContext('IngestionExpiration');
  }

  /** Register the repeatable expiry job with a stable jobId when queues own it. */
  async onModuleInit(): Promise<void> {
    if (!this.cronQueue) return;
    await this.cronQueue.add(
      JOB_INGESTION_EXPIRY,
      {},
      { repeat: { cron: CRON_INGESTION_EXPIRY }, jobId: JOBID_INGESTION_EXPIRY },
    );
  }

  @Cron(CronExpression.EVERY_6_HOURS, { name: 'ingestion-expiry', timeZone: 'UTC' })
  async handleExpiry(): Promise<void> {
    // Queues own scheduling when enabled → decorator no-ops (avoid double run).
    if (isQueueEnabled()) return;
    return this.runExpiryOnce();
  }

  /**
   * The expiry sweep — called by both the @Cron handler (queues off) and the
   * Bull processor (queues on). Kill-switch stays inside so it applies on both.
   */
  async runExpiryOnce(): Promise<void> {
    if (this.config.get('INGESTION_CRON_DISABLE') === 'true') return;
    const expired = await this.expirePastDue();
    const { checked, archived } = await this.verifyBatch();
    this.logger.log(`expiry sweep: ${expired} expired, ${checked} verified, ${archived} archived`);
    this.metrics.gauge('jobs_expired', expired);
    this.metrics.gauge('jobs_archived', archived);
  }

  /** Expire external jobs past their expiration date. Returns count. */
  async expirePastDue(): Promise<number> {
    const now = new Date();
    const res = await this.jobModel.updateMany(
      {
        isExternal: true,
        lifecycle: 'published',
        $or: [{ sourceExpiresAt: { $lte: now } }, { internalExpiresAt: { $lte: now } }],
      },
      {
        $set: {
          lifecycle: 'expired',
          isActive: false,
          removalReason: 'expired',
          lastVerifiedAt: now,
        },
      },
    );
    return res.modifiedCount || 0;
  }

  /**
   * Verify a small batch of the least-recently-verified published external jobs.
   * A dead application link increments verificationFailures; after the threshold
   * the job is archived (kept for history, removed from search).
   */
  async verifyBatch(): Promise<{ checked: number; archived: number }> {
    const batchSize = Number(this.config.get('INGESTION_VERIFY_BATCH')) || 20;
    const jobs = await this.jobModel
      .find({ isExternal: true, lifecycle: 'published' })
      .sort({ lastVerifiedAt: 1 })
      .limit(batchSize)
      .select('_id originalApplyUrl externalUrl verificationFailures')
      .exec();

    let archived = 0;
    let brokenLinks = 0;
    for (const job of jobs) {
      const url = job.originalApplyUrl || job.externalUrl;
      if (!url) continue;
      const alive = await this.isListingAlive(url);
      const now = new Date();
      if (alive) {
        await this.jobModel.updateOne(
          { _id: job._id },
          { $set: { lastVerifiedAt: now, verificationFailures: 0 } },
        );
      } else {
        brokenLinks++;
        const failures = (job.verificationFailures || 0) + 1;
        if (failures >= MAX_VERIFY_FAILURES) {
          archived++;
          await this.jobModel.updateOne(
            { _id: job._id },
            {
              $set: {
                lifecycle: 'archived',
                isActive: false,
                removalReason: 'verification_failed',
                lastVerifiedAt: now,
                verificationFailures: failures,
              },
            },
          );
        } else {
          await this.jobModel.updateOne(
            { _id: job._id },
            { $set: { lastVerifiedAt: now, verificationFailures: failures } },
          );
        }
      }
    }
    if (brokenLinks > 0) this.metrics.gauge('broken_application_links', brokenLinks);
    return { checked: jobs.length, archived };
  }

  /** True if the listing still looks live. 404 / "no longer available" => dead. */
  private async isListingAlive(url: string): Promise<boolean> {
    const res = await this.fetcher.fetch(url, { maxRedirects: 3, maxBytes: 512 * 1024 });
    if (!res.ok) {
      // 404/410 = gone; SSRF-block/timeouts are inconclusive -> treat as alive to
      // avoid false archival on a transient network blip.
      if (res.status === 404 || res.status === 410) return false;
      return true;
    }
    const body = res.body.toLowerCase();
    const goneMarkers = [
      'no longer available',
      'position has been filled',
      'job has been closed',
      'posting is closed',
      'this job is no longer accepting applications',
    ];
    return !goneMarkers.some((m) => body.includes(m));
  }
}
