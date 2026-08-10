import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from '../jobs/jobs.module';
import { MonitorController } from './monitor.controller';
import { GreenhouseMonitorService } from './providers/greenhouse-monitor.service';
import { LeverMonitorService } from './providers/lever-monitor.service';
import { WorkdayMonitorService } from './providers/workday-monitor.service';
import { Job, JobSchema } from '../schemas/job.schema';
import { LoggerModule } from '../common/logger/logger.module';
import { ApplicationsModule } from '../applications/applications.module';
import { MonitorScheduler } from './monitor.scheduler';
import { MonitorCronProcessor } from './monitor.cron.processor';
import { GeographyModule } from '../geography/geography.module';
import { bullQueueImports } from '../queue/queue.config';
import { isQueueEnabled } from '../queue/queue.constants';
import { QUEUE_CRON } from '../queue/cron-queue.constants';

@Module({
  imports: [
    JobsModule,
    LoggerModule,
    ApplicationsModule,
    GeographyModule,
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    // Registers the shared 'cron' Bull queue only when QUEUE_ENABLED=true; []
    // otherwise, so MonitorScheduler's @Optional queue resolves to undefined.
    ...bullQueueImports(QUEUE_CRON),
  ],
  controllers: [MonitorController],
  providers: [
    GreenhouseMonitorService,
    LeverMonitorService,
    WorkdayMonitorService,
    MonitorScheduler,
    // Processor wired in only when queues are enabled.
    ...(isQueueEnabled() ? [MonitorCronProcessor] : []),
  ],
})
export class MonitorsModule {}
