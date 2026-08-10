import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import {
  QUEUE_CRON,
  JOB_REMINDERS,
  JOB_ANALYTICS,
} from '../queue/cron-queue.constants';
import { RemindersService } from './reminders.service';
import { AnalyticsService } from './analytics.service';

/**
 * Bull consumer for the job-tracker crons (reminders + monthly analytics).
 * Registered as a provider ONLY when QUEUE_ENABLED=true (see
 * job-tracker.module.ts). Shares the single 'cron' queue with the other domains,
 * handling only its own job names, and just calls the extracted methods so
 * queued and inline paths do identical work.
 */
@Processor(QUEUE_CRON)
export class JobTrackerCronProcessor {
  private readonly logger = new Logger(JobTrackerCronProcessor.name);

  constructor(
    private readonly reminders: RemindersService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Process(JOB_REMINDERS)
  async handleReminders() {
    this.logger.debug('Processing reminders cron job');
    return this.reminders.runRemindersOnce();
  }

  @Process(JOB_ANALYTICS)
  async handleAnalytics() {
    this.logger.debug('Processing analytics cron job');
    return this.analytics.runAnalyticsOnce();
  }
}
