import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { User, UserSchema } from '../schemas/user.schema';
import { JobMatch, JobMatchSchema } from '../schemas/job-match.schema';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { JobProfile, JobProfileSchema } from '../schemas/job-profile.schema';
import { ApplicationsModule } from '../applications/applications.module';
import { MatchingModule } from '../matching/matching.module';
import { LoggerModule } from '../common/logger/logger.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: JobMatch.name, schema: JobMatchSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: JobProfile.name, schema: JobProfileSchema },
    ]),
    forwardRef(() => ApplicationsModule),
    forwardRef(() => MatchingModule),
    LoggerModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}

