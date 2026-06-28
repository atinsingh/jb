import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { JobMatch, JobMatchSchema } from '../schemas/job-match.schema';
import { Job, JobSchema } from '../schemas/job.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { AiServicesModule } from '../ai-services/ai-services.module';
import { JobProfilesModule } from '../job-profiles/job-profiles.module';
import { ApplicationsModule } from '../applications/applications.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobMatch.name, schema: JobMatchSchema },
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AiServicesModule,
    JobProfilesModule,
    forwardRef(() => ApplicationsModule),
    LoggerModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}

