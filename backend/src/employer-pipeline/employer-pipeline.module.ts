import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  EmployerAtsGateway,
} from './employer-ats-assessment.gateway';
import { AtsModule } from '../ats/ats.module';
import { ResumeHarnessModule } from '../resume-harness/resume-harness.module';
import { EmployerBillingModule } from '../employer-billing/employer-billing.module';
import {
  EmployerAtsRuntime,
  EmployerAtsRuntimeSchema,
} from './schemas/employer-ats-runtime.schema';
import { LLMUsage, LLMUsageSchema } from '../llm/schemas/llm-usage.schema';
import { EmployerAtsRuntimeService } from './employer-ats-runtime.service';
import { LiteLlmVirtualKeyClient } from './litellm-virtual-key.client';
import { EmployerAtsSecretCodec } from './employer-ats-secret.codec';

@Module({
  imports: [
    ConfigModule,
    AtsModule,
    ResumeHarnessModule,
    EmployerBillingModule,
    MongooseModule.forFeature([
      { name: EmployerApplicant.name, schema: EmployerApplicantSchema },
      { name: ApplicationArtifact.name, schema: ApplicationArtifactSchema },
      { name: EmployerJob.name, schema: EmployerJobSchema },
      { name: EmployerAtsRuntime.name, schema: EmployerAtsRuntimeSchema },
      { name: LLMUsage.name, schema: LLMUsageSchema },
    ]),
  ],
  controllers: [EmployerPipelineController],
  providers: [
    EmployerPipelineService,
    EmployerResumeAssessmentService,
    ResumeAiContentHeuristicService,
    EmployerAtsRuntimeService,
    LiteLlmVirtualKeyClient,
    EmployerAtsSecretCodec,
    {
      provide: EmployerAtsAssessmentGateway,
      useClass: EmployerAtsGateway,
    },
  ],
  exports: [EmployerPipelineService, MongooseModule],
})
export class EmployerPipelineModule {}
