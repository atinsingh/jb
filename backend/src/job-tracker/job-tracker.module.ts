import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { Job, JobSchema } from '../schemas/job.schema';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { ApplicationArtifact, ApplicationArtifactSchema } from '../schemas/application-artifact.schema';
import { Reminder, ReminderSchema } from '../schemas/reminder.schema';
import { MockInterviewSession, MockInterviewSessionSchema } from '../schemas/mock-interview-session.schema';
import { StoryBank, StoryBankSchema } from '../schemas/story-bank.schema';
import { PromptVersion, PromptVersionSchema } from '../schemas/prompt-version.schema';
import { LLMAuditLog, LLMAuditLogSchema } from '../schemas/llm-audit-log.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { JobIngestionService } from './job-ingestion.service';
import { JobTrackerService } from './job-tracker.service';
import { AssistedApplyService } from './assisted-apply.service';
import { InterviewPrepService } from './interview-prep.service';
import { StoryBankService } from './story-bank.service';
import { RemindersService } from './reminders.service';
import { AnalyticsService } from './analytics.service';
import { JobTrackerController } from './job-tracker.controller';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: ApplicationArtifact.name, schema: ApplicationArtifactSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: MockInterviewSession.name, schema: MockInterviewSessionSchema },
      { name: StoryBank.name, schema: StoryBankSchema },
      { name: PromptVersion.name, schema: PromptVersionSchema },
      { name: LLMAuditLog.name, schema: LLMAuditLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'job-ingestion',
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
      {
        name: 'llm-features',
        ttl: 60000,
        limit: 20, // 20 LLM requests per minute
      },
    ]),
    LLMModule,
  ],
  providers: [
    JobIngestionService,
    JobTrackerService,
    AssistedApplyService,
    InterviewPrepService,
    StoryBankService,
    RemindersService,
    AnalyticsService,
  ],
  controllers: [JobTrackerController],
  exports: [
    JobIngestionService,
    JobTrackerService,
    AssistedApplyService,
    InterviewPrepService,
    StoryBankService,
    RemindersService,
    AnalyticsService,
  ],
})
export class JobTrackerModule {}

