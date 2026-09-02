import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { REPO_ROOT } from './load-env';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResumeModule } from './resume/resume.module';
import { JobProfilesModule } from './job-profiles/job-profiles.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { ApplicationsModule } from './applications/applications.module';
import { AgentsModule } from './agents/agents.module';
import { CoverLettersModule } from './cover-letters/cover-letters.module';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { ResumeHarnessModule } from './resume-harness/resume-harness.module';
import { BillingModule } from './billing/billing.module';
import { EntitlementModule } from './entitlement/entitlement.module';
import { LLMModule } from './llm/llm.module';
import { JobTrackerModule } from './job-tracker/job-tracker.module';
import { InterviewBuddyModule } from './interview-buddy/interview-buddy.module';
import { MonitorsModule } from './monitors/monitors.module';
import { ApplyRunnerModule } from './apply-runner/apply-runner.module';
import { EmployerJobsModule } from './employer-jobs/employer-jobs.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { EmployerPipelineModule } from './employer-pipeline/employer-pipeline.module';
import { EmployerInterviewsModule } from './employer-interviews/employer-interviews.module';
import { EmployerOffersModule } from './employer-offers/employer-offers.module';
import { EmployerOrgModule } from './employer-org/employer-org.module';
import { EmployerBillingModule } from './employer-billing/employer-billing.module';
import { AiRecruiterModule } from './ai-recruiter/ai-recruiter.module';
import { EmployerAuditModule } from './employer-audit/employer-audit.module';
import { EmployerIntegrationsModule } from './employer-integrations/employer-integrations.module';
import { EmployerDeveloperModule } from './employer-developer/employer-developer.module';
import { EmployerSecurityModule } from './employer-security/employer-security.module';
import { EmployerTalentModule } from './employer-talent/employer-talent.module';
import { EmployerDistributionModule } from './employer-distribution/employer-distribution.module';
import { EmployerNotificationsModule } from './employer-notifications/employer-notifications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeadsModule } from './leads/leads.module';
import { StorageModule } from './storage/storage.module';
import { EmployerApprovalsModule } from './employer-approvals/employer-approvals.module';
import { EmployerCompanyModule } from './employer-company/employer-company.module';
import { EmployerMessagesModule } from './employer-messages/employer-messages.module';
import { AdminModule } from './admin/admin.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { LoggerModule } from './common/logger/logger.module';
import { AgentRuntimeModule } from './agent-runtime/agent-runtime.module';
import { AnswersModule } from './answers/answers.module';
import { CopilotModule } from './copilot/copilot.module';
import { bullRootImports } from './queue/queue.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

/**
 * The one repo-wide env file, resolved by `load-env.ts` (which has already run
 * by the time this module is evaluated — it is the first import in main.ts).
 *
 * ConfigModule is given the same paths for completeness; it changes nothing in
 * practice, because dotenv never overwrites a variable that is already set.
 * This used to be a third copy of "guess where backend/.env might be", which
 * quietly resolved to a file that no longer exists.
 */
function getEnvFilePath(): string[] {
  return [join(REPO_ROOT, '.env.local'), join(REPO_ROOT, '.env')];
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
    // Background queues (Bull + Redis). Empty array when QUEUE_ENABLED !== 'true'
    // (dev default) → no Redis connection is attempted and producers run inline.
    ...bullRootImports(),
    LoggerModule,
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/jobocate',
    ),
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'short',
          ttl: 1000,
          limit: configService.get<number>('THROTTLE_LIMIT_SHORT', 10),
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: configService.get<number>('THROTTLE_LIMIT_MEDIUM', 50),
        },
        {
          name: 'long',
          ttl: 60000,
          limit: configService.get<number>('THROTTLE_LIMIT_LONG', 200),
        },
      ],
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ResumeModule,
    JobProfilesModule,
    JobsModule,
    MatchingModule,
    ApplicationsModule,
    AgentsModule,
    CoverLettersModule,
    ResumeBuilderModule,
    ResumeHarnessModule,
    BillingModule,
    EntitlementModule,
    LLMModule,
    JobTrackerModule,
    InterviewBuddyModule,
    MonitorsModule,
    ApplyRunnerModule,
    EmployerJobsModule,
    EmployerPipelineModule,
    EmployerInterviewsModule,
    EmployerOffersModule,
    EmployerOrgModule,
    EmployerBillingModule,
    AiRecruiterModule,
    EmployerAuditModule,
    EmployerIntegrationsModule,
    EmployerDeveloperModule,
    EmployerSecurityModule,
    EmployerTalentModule,
    EmployerDistributionModule,
    EmployerNotificationsModule,
    EmployerApprovalsModule,
    EmployerCompanyModule,
    EmployerMessagesModule,
    AdminModule,
    IngestionModule,
    NotificationsModule,
    LeadsModule,
    StorageModule,
    AgentRuntimeModule,
    AnswersModule,
    CopilotModule,
  ],
  controllers: [HealthController],
  providers: [
    HttpExceptionFilter,
    LoggingInterceptor,
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
