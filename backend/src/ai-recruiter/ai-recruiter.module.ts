import { Module } from '@nestjs/common';
import { EmployerPipelineModule } from '../employer-pipeline/employer-pipeline.module';
import { LLMModule } from '../llm/llm.module';
import { AiRecruiterController } from './ai-recruiter.controller';
import { AiRecruiterService } from './ai-recruiter.service';

/**
 * AiRecruiterModule
 *
 * Reuses the canonical EmployerApplicant model registered by
 * EmployerPipelineModule (which re-exports MongooseModule), so no duplicate
 * model is compiled on the connection. Imports LLMModule for the Claude-backed
 * routing + quota services powering the AI Recruiter features.
 */
@Module({
  imports: [EmployerPipelineModule, LLMModule],
  controllers: [AiRecruiterController],
  providers: [AiRecruiterService],
  exports: [AiRecruiterService],
})
export class AiRecruiterModule {}
