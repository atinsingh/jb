import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplyRunnerService } from './apply-runner.service';
import { ApprovalQueueService } from './approval-queue.service';
import { PrepareSchedulerService } from './prepare-scheduler.service';
import { PreparedExpiryService } from './prepared-expiry.service';
import { JobProfile, JobProfileSchema } from '../schemas/job-profile.schema';
import { MatchingModule } from '../matching/matching.module';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { Job, JobSchema } from '../schemas/job.schema';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { LoggerModule } from '../common/logger/logger.module';
import { ApplyRunnerController } from './apply-runner.controller';
import { SelectorsController } from './selectors.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { UsersModule } from '../users/users.module';
import { CandidateMaterialsService } from './ats/candidate-materials.service';
import { AtsAdapterRegistry } from './ats/ats-adapter.registry';
import { AtsSubmitProcessor } from './ats-submit.processor';
import { bullQueueImports } from '../queue/queue.config';
import { isQueueEnabled, QUEUE_ATS } from '../queue/queue.constants';

@Module({
  imports: [
    forwardRef(() => ApplicationsModule),
    UsersModule,
    LoggerModule,
    // StorageService is provided by the @Global StorageModule (imported in AppModule).
    // ATS queue: registered only when QUEUE_ENABLED=true, else [] (no Redis).
    ...bullQueueImports(QUEUE_ATS),
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: User.name, schema: UserSchema },
      { name: JobProfile.name, schema: JobProfileSchema },
    ]),
    // EligibleJobsService supplies the auto-apply-safe, geo-gated candidates.
    forwardRef(() => MatchingModule),
  ],
  controllers: [ApplyRunnerController, SelectorsController],
  // The processor is registered ONLY when queues are enabled; the @Optional()
  // @InjectQueue in the controller resolves to undefined otherwise → inline path.
  providers: [
    ApplyRunnerService,
    ApprovalQueueService,
    PrepareSchedulerService,
    PreparedExpiryService,
    CandidateMaterialsService,
    AtsAdapterRegistry,
    ...(isQueueEnabled() ? [AtsSubmitProcessor] : []),
  ],
  exports: [ApplyRunnerService, ApprovalQueueService, CandidateMaterialsService],
})
export class ApplyRunnerModule {}
