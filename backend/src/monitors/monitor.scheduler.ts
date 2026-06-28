import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GreenhouseMonitorService } from './providers/greenhouse-monitor.service';
import { LeverMonitorService } from './providers/lever-monitor.service';
import { WorkdayMonitorService } from './providers/workday-monitor.service';
import { ApplicationEventsService } from '../applications/application-events.service';
import { Types } from 'mongoose';

@Injectable()
export class MonitorScheduler {
  private readonly logger = new Logger(MonitorScheduler.name);

  constructor(
    private greenhouse: GreenhouseMonitorService,
    private lever: LeverMonitorService,
    private workday: WorkdayMonitorService,
    private appEvents: ApplicationEventsService,
  ) {}

  // Runs every hour by default; disable via MONITORS_CRON_DISABLE=true
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'job-monitors',
    timeZone: 'UTC',
  })
  async handleCron() {
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
