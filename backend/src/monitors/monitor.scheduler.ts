import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { GreenhouseMonitorService } from './providers/greenhouse-monitor.service';
import { LeverMonitorService } from './providers/lever-monitor.service';
import { WorkdayMonitorService } from './providers/workday-monitor.service';
import { ApplicationEventsService } from '../applications/application-events.service';
import { Types } from 'mongoose';
import { isQueueEnabled } from '../queue/queue.constants';
import {
  QUEUE_CRON,
  JOB_MONITORS,
  JOBID_MONITORS,
  CRON_MONITORS,
} from '../queue/cron-queue.constants';

@Injectable()
export class MonitorScheduler implements OnModuleInit {
  private readonly logger = new Logger(MonitorScheduler.name);

  constructor(
    private greenhouse: GreenhouseMonitorService,
    private lever: LeverMonitorService,
    private workday: WorkdayMonitorService,
    private appEvents: ApplicationEventsService,
    // Present only when QUEUE_ENABLED=true (see monitors.module.ts). When absent
    // (@Optional → undefined) the plain @Cron handler owns scheduling as before.
    @Optional() @InjectQueue(QUEUE_CRON) private readonly cronQueue?: Queue,
  ) {}

  /**
   * When queues own scheduling, register a single repeatable job with a STABLE
   * jobId so duplicate registrations across replicas collapse to one schedule.
   */
  async onModuleInit(): Promise<void> {
    if (!this.cronQueue) return;
    await this.cronQueue.add(
      JOB_MONITORS,
      {},
      { repeat: { cron: CRON_MONITORS }, jobId: JOBID_MONITORS },
    );
  }

  // Runs every hour by default; disable via MONITORS_CRON_DISABLE=true
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'job-monitors',
    timeZone: 'UTC',
  })
  async handleCron() {
    // Queues own scheduling when enabled → decorator no-ops to avoid double run.
    if (isQueueEnabled()) return;
    return this.runMonitorsOnce();
  }

  /**
   * The actual work — called by both the @Cron handler (queues off) and the Bull
   * processor (queues on). Keeps the MONITORS_CRON_DISABLE kill-switch inside so
   * it applies on both paths.
   */
  async runMonitorsOnce() {
    if (process.env.MONITORS_CRON_DISABLE === 'true') {
      this.logger.debug('Job monitors cron disabled');
      return;
    }

    this.logger.log('Running scheduled job monitors');
    const greenhouse = await this.greenhouse.run();
    const lever = await this.lever.run();
    const workday = await this.workday.run();

    await this.emitNewJobEvents(greenhouse.newExternalIds || []);
    await this.emitNewJobEvents(lever.newExternalIds || []);
    await this.emitNewJobEvents(workday.newExternalIds || []);

    this.logger.log(
      `Monitors complete GH:${greenhouse.upserts} LV:${lever.upserts} WD:${workday.upserts}`,
    );
  }

  private async emitNewJobEvents(externalIds: string[]) {
    const systemUserId = process.env.MONITORS_SYSTEM_USER_ID;
    if (!systemUserId) {
      this.logger.debug('MONITORS_SYSTEM_USER_ID not set; skipping event emission');
      return;
    }
    const userId = new Types.ObjectId(systemUserId);
    for (const externalId of externalIds) {
      await this.appEvents.recordEvent({
        applicationId: undefined,
        userId,
        type: 'new_job_ingested',
        message: `New job ingested ${externalId}`,
        meta: { externalId },
      });
    }
  }
}
