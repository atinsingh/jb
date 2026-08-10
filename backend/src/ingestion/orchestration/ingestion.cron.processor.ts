import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import {
  QUEUE_CRON,
  JOB_INGESTION_POLL,
  JOB_INGESTION_EXPIRY,
} from '../../queue/cron-queue.constants';
import { IngestionScheduler } from './ingestion.scheduler';
import { ExpirationService } from './expiration.service';

/**
 * Bull consumer for the ingestion crons (poll + expiry). Registered as a
 * provider ONLY when QUEUE_ENABLED=true (see ingestion.module.ts). It shares the
 * single 'cron' queue with the other domains, handling only its own job names,
 * and just calls the extracted methods so queued and inline paths match exactly.
 */
@Processor(QUEUE_CRON)
export class IngestionCronProcessor {
  private readonly logger = new Logger(IngestionCronProcessor.name);

  constructor(
    private readonly scheduler: IngestionScheduler,
    private readonly expiration: ExpirationService,
  ) {}

  @Process(JOB_INGESTION_POLL)
  async handlePoll() {
    this.logger.debug('Processing ingestion-poll cron job');
    return this.scheduler.runPollOnce();
  }

  @Process(JOB_INGESTION_EXPIRY)
  async handleExpiry() {
    this.logger.debug('Processing ingestion-expiry cron job');
    return this.expiration.runExpiryOnce();
  }
}
