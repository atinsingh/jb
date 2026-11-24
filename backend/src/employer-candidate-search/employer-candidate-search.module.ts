import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import {
  CandidateAtsReviewSession,
  CandidateAtsReviewSessionSchema,
} from '../resume-builder/schemas/candidate-ats-review-session.schema';
import {
  ResumeHarnessSession,
  ResumeHarnessSessionSchema,
} from '../resume-harness/schemas/resume-harness-session.schema';
import { EmployerJobsModule } from '../employer-jobs/employer-jobs.module';
import { EmployerCandidateSearchController } from './employer-candidate-search.controller';
import { EmployerCandidateSearchService } from './employer-candidate-search.service';

@Module({
  imports: [
    EmployerJobsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: CandidateAtsReviewSession.name, schema: CandidateAtsReviewSessionSchema },
      { name: ResumeHarnessSession.name, schema: ResumeHarnessSessionSchema },
    ]),
  ],
  controllers: [EmployerCandidateSearchController],
  providers: [EmployerCandidateSearchService],
})
export class EmployerCandidateSearchModule {}
