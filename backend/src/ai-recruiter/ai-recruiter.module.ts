import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerPipelineModule } from '../employer-pipeline/employer-pipeline.module';
import { LLMModule } from '../llm/llm.module';
import { EmployerInterviewsModule } from '../employer-interviews/employer-interviews.module';
import { EmployerMessagesModule } from '../employer-messages/employer-messages.module';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { AiRecruiterController } from './ai-recruiter.controller';
import { AiRecruiterService } from './ai-recruiter.service';
import { EmployerAiActionsService } from './employer-ai-actions.service';
import { AutopilotRulesService } from './autopilot-rules.service';
import { RecruiterCopilotRegistrar } from './copilot/recruiter-copilot.registrar';
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
 * (the proposed-action activity log) on this connection.
 *
 * Imports EmployerInterviewsModule and EmployerMessagesModule so
 * EmployerAiActionsService can execute approved proposals (schedule_interview,
 * send_message) against the real interviews/messages services.
 */
@Module({
  imports: [
    EmployerPipelineModule,
    LLMModule,
    EmployerInterviewsModule,
    EmployerMessagesModule,
    AgentRuntimeModule,
    MongooseModule.forFeature([
      { name: EmployerAutopilotConfig.name, schema: EmployerAutopilotConfigSchema },
      { name: AiProposedAction.name, schema: AiProposedActionSchema },
    ]),
  ],
  controllers: [AiRecruiterController],
  providers: [
    AiRecruiterService,
    EmployerAiActionsService,
    AutopilotRulesService,
    RecruiterCopilotRegistrar,
  ],
  exports: [AiRecruiterService, EmployerAiActionsService, AutopilotRulesService],
})
export class AiRecruiterModule {}
