import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '../../common/logger/logger.service';
import {
  IngestionSource,
  IngestionSourceDocument,
} from '../schemas/ingestion-source.schema';
import { IngestionRunner } from './ingestion.runner';
import { isQueueEnabled } from '../../queue/queue.constants';
import {
  QUEUE_CRON,
  JOB_INGESTION_POLL,
  JOBID_INGESTION_POLL,
  CRON_INGESTION_POLL,
} from '../../queue/cron-queue.constants';

/**
 * Per-source polling scheduler (spec §10). Mirrors the existing
 * monitors/monitor.scheduler.ts pattern (hourly @Cron + env kill-switch).
 *
 * Every tick it selects enabled + approved sources whose poll interval has
 * elapsed, ordered by priority (trusted sources first), and runs them with
 * bounded concurrency. The runner's distributed lock makes this safe even if two
 * ticks overlap. Disable entirely with INGESTION_CRON_DISABLE=true.
 */
@Injectable()
export class IngestionScheduler implements OnModuleInit {
  constructor(
    @InjectModel(IngestionSource.name)
    private readonly sourceModel: Model<IngestionSourceDocument>,
    private readonly runner: IngestionRunner,
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
    // Present only when QUEUE_ENABLED=true; else @Optional → undefined (inline).
    @Optional() @InjectQueue(QUEUE_CRON) private readonly cronQueue?: Queue,
  ) {
    this.logger.setContext('IngestionScheduler');
  }

  /** Register the repeatable poll job with a stable jobId when queues own it. */
  async onModuleInit(): Promise<void> {
    if (!this.cronQueue) return;
    await this.cronQueue.add(
      JOB_INGESTION_POLL,
      {},
      { repeat: { cron: CRON_INGESTION_POLL }, jobId: JOBID_INGESTION_POLL },
    );
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'ingestion-poll', timeZone: 'UTC' })
  async handlePoll(): Promise<void> {
    // Queues own scheduling when enabled → decorator no-ops (avoid double run).
    if (isQueueEnabled()) return;
    return this.runPollOnce();
  }

  /**
   * The actual poll work — called by both the @Cron handler (queues off) and the
   * Bull processor (queues on). Kill-switch stays inside so it applies on both.
   */
  async runPollOnce(): Promise<void> {
    if (this.config.get('INGESTION_CRON_DISABLE') === 'true') {
      this.logger.debug('ingestion cron disabled');
      return;
    }

    const due = await this.selectDueSources();
    if (!due.length) return;
    this.logger.log(`ingestion poll: ${due.length} source(s) due`);

    const concurrency = Number(this.config.get('INGESTION_MAX_CONCURRENCY')) || 3;
    await this.runBounded(due, concurrency);
  }

  /** Sources enabled + approved whose poll interval has elapsed. */
  async selectDueSources(): Promise<IngestionSourceDocument[]> {
    const now = Date.now();
    const candidates = await this.sourceModel
      .find({
        enabled: true,
        emergencyStopped: { $ne: true },
        complianceStatus: 'approved',
        // CSV/manual sources are upload-driven, never polled.
        adapterType: { $nin: ['csv_import', 'manual'] },
      })
      .sort({ priority: 1 })
      .exec();

    return candidates.filter((s) => {
      const last = s.lastAttemptedRunAt?.getTime() || 0;
      const intervalMs = (s.pollIntervalMinutes ?? 60) * 60000;
      return now - last >= intervalMs;
    });
  }

  private async runBounded(sources: IngestionSourceDocument[], concurrency: number): Promise<void> {
    const queue = [...sources];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      workers.push(
        (async () => {
          let src: IngestionSourceDocument | undefined;
          while ((src = queue.shift())) {
            try {
              await this.runner.runSource(String(src._id), { trigger: 'scheduled' });
            } catch (err: any) {
              this.logger.error(`scheduled run failed for ${src.sourceId}: ${err.message}`);
            }
          }
        })(),
      );
    }
    await Promise.all(workers);
  }
}
