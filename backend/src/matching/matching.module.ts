import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { EligibleJobsService } from './eligible-jobs.service';
import { MatchScorerService } from './match-scorer.service';
import { JobMatch, JobMatchSchema } from '../schemas/job-match.schema';
import { Job, JobSchema } from '../schemas/job.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { UserPreferences, UserPreferencesSchema } from '../schemas/user-preferences.schema';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { JobProfile, JobProfileSchema } from '../schemas/job-profile.schema';
import { LLMModule } from '../llm/llm.module';
import { JobProfilesModule } from '../job-profiles/job-profiles.module';
import { ApplicationsModule } from '../applications/applications.module';
import { LoggerModule } from '../common/logger/logger.module';
import { GeographyModule } from '../geography/geography.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobMatch.name, schema: JobMatchSchema },
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },
      { name: UserPreferences.name, schema: UserPreferencesSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: JobProfile.name, schema: JobProfileSchema },
    ]),
    LLMModule,
    JobProfilesModule,
    forwardRef(() => ApplicationsModule),
    LoggerModule,
    GeographyModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService, EligibleJobsService, MatchScorerService],
  exports: [MatchingService, EligibleJobsService],
})
export class MatchingModule {}

