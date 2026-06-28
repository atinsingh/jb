import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobProfilesController } from './job-profiles.controller';
import { JobProfilesService } from './job-profiles.service';
import { JobProfile, JobProfileSchema } from '../schemas/job-profile.schema';
import { LoggerModule } from '../common/logger/logger.module';
import { ResumeModule } from '../resume/resume.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobProfile.name, schema: JobProfileSchema },
    ]),
    LoggerModule,
    ResumeModule,
  ],
  controllers: [JobProfilesController],
  providers: [JobProfilesService],
  exports: [JobProfilesService],
})
export class JobProfilesModule {}

