import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerPipelineModule } from '../employer-pipeline/employer-pipeline.module';
import { LLMModule } from '../llm/llm.module';
import { AiRecruiterController } from './ai-recruiter.controller';
import { AiRecruiterService } from './ai-recruiter.service';
import {
  EmployerAutopilotConfig,
  EmployerAutopilotConfigSchema,
} from './schemas/employer-autopilot-config.schema';
import {
  AiProposedAction,
  AiProposedActionSchema,
} from './schemas/ai-proposed-action.schema';

/**
 * AiRecruiterModule
 *
 * Reuses the canonical EmployerApplicant model registered by
 * EmployerPipelineModule (which re-exports MongooseModule), so no duplicate
 * model is compiled on the connection. Imports LLMModule for the Claude-backed
 * routing + quota services powering the AI Recruiter features. Registers
 * EmployerAutopilotConfig (persisted autopilot toggle) and AiProposedAction
 * (read-only here — the activity log) on this connection.
 */
@Module({
  imports: [
    EmployerPipelineModule,
    LLMModule,
    MongooseModule.forFeature([
      { name: EmployerAutopilotConfig.name, schema: EmployerAutopilotConfigSchema },
      { name: AiProposedAction.name, schema: AiProposedActionSchema },
    ]),
  ],
  controllers: [AiRecruiterController],
  providers: [AiRecruiterService],
  exports: [AiRecruiterService],
})
export class AiRecruiterModule {}
