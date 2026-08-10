import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationAgentService } from './application-agent.service';
import { AgentAssignmentService } from './agent-assignment.service';
import { ApplicationEventsService } from './application-events.service';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { ApplicationEvent, ApplicationEventSchema } from '../schemas/application-event.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { Job, JobSchema } from '../schemas/job.schema';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { JobMatch, JobMatchSchema } from '../schemas/job-match.schema';
import { MatchingModule } from '../matching/matching.module';
import { LoggerModule } from '../common/logger/logger.module';
import { UsersModule } from '../users/users.module';
import { ApplyRunnerModule } from '../apply-runner/apply-runner.module';
import { EmployerPipelineModule } from '../employer-pipeline/employer-pipeline.module';
import { bullQueueImports } from '../queue/queue.config';
import { isQueueEnabled, QUEUE_AUTO_APPLY } from '../queue/queue.constants';
import { AutoApplyProcessor } from './auto-apply.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: JobMatch.name, schema: JobMatchSchema },
      { name: ApplicationEvent.name, schema: ApplicationEventSchema },
    ]),
    forwardRef(() => MatchingModule),
    forwardRef(() => ApplyRunnerModule),
    UsersModule,
    LoggerModule,
    EmployerPipelineModule,
    // Registers the auto-apply Bull queue only when QUEUE_ENABLED=true, else [].
    ...bullQueueImports(QUEUE_AUTO_APPLY),
  ],
  controllers: [ApplicationsController],
  // AutoApplyProcessor consumes the queue only when enabled; otherwise the
  // @Optional() @InjectQueue in ApplicationAgentService resolves to undefined
  // and the producer runs auto-apply inline (dev/test default).
  providers: [
    ApplicationsService,
    ApplicationAgentService,
    AgentAssignmentService,
    ApplicationEventsService,
    ...(isQueueEnabled() ? [AutoApplyProcessor] : []),
  ],
  exports: [ApplicationsService, ApplicationAgentService, AgentAssignmentService, ApplicationEventsService],
})
export class ApplicationsModule {}
