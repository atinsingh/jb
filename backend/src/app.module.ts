import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { existsSync } from 'fs';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResumeModule } from './resume/resume.module';
import { JobProfilesModule } from './job-profiles/job-profiles.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { ApplicationsModule } from './applications/applications.module';
import { AgentsModule } from './agents/agents.module';
import { AiServicesModule } from './ai-services/ai-services.module';
import { CoverLettersModule } from './cover-letters/cover-letters.module';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { BillingModule } from './billing/billing.module';
import { EntitlementModule } from './entitlement/entitlement.module';
import { LLMModule } from './llm/llm.module';
import { JobTrackerModule } from './job-tracker/job-tracker.module';
import { InterviewBuddyModule } from './interview-buddy/interview-buddy.module';
import { MonitorsModule } from './monitors/monitors.module';
import { ApplyRunnerModule } from './apply-runner/apply-runner.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { LoggerModule } from './common/logger/logger.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Determine the correct .env file path
function getEnvFilePath(): string {
  // Try multiple possible locations
  const possiblePaths = [
    join(process.cwd(), '.env'),           // From backend directory
    join(__dirname, '..', '.env'),         // Relative to compiled code (dist/)
    join(__dirname, '..', '..', '.env'),   // If running from src/
    join(process.cwd(), 'backend', '.env'), // If running from project root
    '.env',                                 // Current working directory
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Return the most likely path anyway - ConfigModule will handle missing file gracefully
  return join(process.cwd(), '.env');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: getEnvFilePath(),
      expandVariables: true,
    }),
    ScheduleModule.forRoot(),
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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuthModule,
    UsersModule,
    ResumeModule,
    JobProfilesModule,
    JobsModule,
    MatchingModule,
    ApplicationsModule,
    AgentsModule,
    AiServicesModule,
    CoverLettersModule,
    ResumeBuilderModule,
    BillingModule,
    EntitlementModule,
    LLMModule,
    JobTrackerModule,
    InterviewBuddyModule,
    MonitorsModule,
    ApplyRunnerModule,
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
