import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerPipelineController } from './employer-pipeline.controller';
import { EmployerPipelineService } from './employer-pipeline.service';
import {
  EmployerApplicant,
  EmployerApplicantSchema,
} from './schemas/employer-applicant.schema';
import {
  ApplicationArtifact,
  ApplicationArtifactSchema,
} from '../schemas/application-artifact.schema';
import {
  EmployerJob,
  EmployerJobSchema,
} from '../employer-jobs/schemas/employer-job.schema';
import { EmployerResumeAssessmentService } from './employer-resume-assessment.service';
import { ResumeAiContentHeuristicService } from './resume-ai-content-heuristic.service';
import {
  EmployerAtsAssessmentGateway,
  EmployerAtsUnavailableGateway,
} from './employer-ats-assessment.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerApplicant.name, schema: EmployerApplicantSchema },
      { name: ApplicationArtifact.name, schema: ApplicationArtifactSchema },
      { name: EmployerJob.name, schema: EmployerJobSchema },
    ]),
  ],
  controllers: [EmployerPipelineController],
  providers: [
    EmployerPipelineService,
    EmployerResumeAssessmentService,
    ResumeAiContentHeuristicService,
    {
      provide: EmployerAtsAssessmentGateway,
      useClass: EmployerAtsUnavailableGateway,
    },
  ],
  exports: [EmployerPipelineService, MongooseModule],
})
export class EmployerPipelineModule {}
