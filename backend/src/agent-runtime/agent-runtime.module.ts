import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LLMModule } from '../llm/llm.module';
import { bullQueueImports } from '../queue/queue.config';
import { isQueueEnabled, QUEUE_AGENT } from '../queue/queue.constants';
import { AgentRun, AgentRunSchema } from './schemas/agent-run.schema';
import { AgentRuntimeService } from './agent-runtime.service';
import { ToolRegistry } from './tool-registry.service';
import { AgentDefinitionRegistry } from './agent-definition.registry';
import { AgentRunProcessor } from './agent-run.processor';
import { DemoAgentRegistrar } from './demo/demo-agent';

/**
 * Generic reusable AI agent runtime (planner/executor loop) built on the
 * tool-use provider support. Feature modules (e.g. the wave-3c Job-Search
 * Copilot) import this module and register their tools/agents via the exported
 * ToolRegistry / AgentDefinitionRegistry.
 *
 * NOTE: distinct from the human-concierge `agents/` / `application-agent`
 * domain — this is the AI runtime.
 * 
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AgentRun.name, schema: AgentRunSchema }]),
    LLMModule,
    // Registers the agent queue only when QUEUE_ENABLED=true; otherwise the
    // @Optional() @InjectQueue in AgentRuntimeService resolves to undefined and
    // runs execute inline.
    ...bullQueueImports(QUEUE_AGENT),
  ],
  providers: [
    AgentRuntimeService,
    ToolRegistry,
    AgentDefinitionRegistry,
    // DEMO agent (echo tool) — proves the loop end-to-end; safe to keep.
    DemoAgentRegistrar,
    // Consumes the queue only when enabled.
    ...(isQueueEnabled() ? [AgentRunProcessor] : []),
  ],
  exports: [AgentRuntimeService, ToolRegistry, AgentDefinitionRegistry],
})
export class AgentRuntimeModule {}
