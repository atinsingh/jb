import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { QUEUE_CRON, JOB_MONITORS } from '../queue/cron-queue.constants';
import { MonitorScheduler } from './monitor.scheduler';

/**
 * Bull consumer for the hourly job-monitors cron. Registered as a provider ONLY
 * when QUEUE_ENABLED=true (see monitors.module.ts). Its body just calls the same
 * extracted method the @Cron handler would, so queued and inline paths do the
 * exact same work.
 */
@Processor(QUEUE_CRON)
export class MonitorCronProcessor {
  private readonly logger = new Logger(MonitorCronProcessor.name);

  constructor(private readonly scheduler: MonitorScheduler) {}

  @Process(JOB_MONITORS)
  async handleMonitors() {
    this.logger.debug('Processing monitors cron job');
    return this.scheduler.runMonitorsOnce();
  }
}
