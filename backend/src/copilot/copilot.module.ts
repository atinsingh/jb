import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { AgentRun, AgentRunSchema } from '../agent-runtime/schemas/agent-run.schema';
import { MatchingModule } from '../matching/matching.module';
import { LLMModule } from '../llm/llm.module';
import { ApplicationsModule } from '../applications/applications.module';
import { ApplyRunnerModule } from '../apply-runner/apply-runner.module';
import { UsersModule } from '../users/users.module';
import { CopilotController } from './copilot.controller';
import { CopilotRegistrar } from './copilot.registrar';

/**
 * Candidate Job-Search Copilot. Contributes its tools + agent definition to the
 * generic agent runtime (via CopilotRegistrar) and exposes the run API.
 *
 * NotificationsService comes from the @Global NotificationsModule (no import
 * needed). AgentRun is registered here for the controller's run-history queries.
 */
@Module({
  imports: [
    AgentRuntimeModule,
    MatchingModule,
    LLMModule,
    ApplicationsModule,
    ApplyRunnerModule,
    UsersModule,
    MongooseModule.forFeature([{ name: AgentRun.name, schema: AgentRunSchema }]),
  ],
  controllers: [CopilotController],
  providers: [CopilotRegistrar],
})
export class CopilotModule {}
