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

@Module({
  imports: [
    JobsModule,
    LoggerModule,
    ApplicationsModule,
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
  ],
  controllers: [MonitorController],
  providers: [GreenhouseMonitorService, LeverMonitorService, WorkdayMonitorService, MonitorScheduler],
})
export class MonitorsModule {}
