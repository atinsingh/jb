import { Injectable, OnModuleInit } from '@nestjs/common';
import { LLMFeature } from '../../llm/llm-routing.service';
import { AgentDefinitionRegistry } from '../agent-definition.registry';
import { ToolRegistry } from '../tool-registry.service';
import { AgentDefinition, AgentTool } from '../agent-runtime.types';

/**
 * DEMO ONLY — a trivial echo tool used to exercise/test the agent loop
 * end-to-end. The real Job-Search Copilot tools land in wave 3c and are
 * registered by their own feature module the same way this demo does.
 */
export const DEMO_ECHO_TOOL: AgentTool = {
  name: 'echo',
  description: 'DEMO: echoes back the arguments it is given.',
  parameters: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Anything to echo back.' },
    },
    required: [],
  },
  handler: async (_ctx, args: any) => args,
};

/** DEMO ONLY — an agent whose single capability is the echo tool. */
export const DEMO_ECHO_AGENT: AgentDefinition = {
  agentType: 'demo-echo',
  systemPrompt:
    'DEMO agent. You may call the `echo` tool to repeat input, then answer.',
  feature: LLMFeature.AGENT_RUNTIME,
  toolNames: ['echo'],
  maxSteps: 5,
  maxTokens: 5000,
};

/**
 * Registers the demo tool + agent at bootstrap. This mirrors exactly how a
 * real feature module (3c) will contribute its tools and agent definitions:
 * inject the two registries and register on init. Clearly labeled DEMO.
 */
@Injectable()
export class DemoAgentRegistrar implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly definitionRegistry: AgentDefinitionRegistry,
  ) {}

  onModuleInit(): void {
    this.toolRegistry.register(DEMO_ECHO_TOOL);
    this.definitionRegistry.register(DEMO_ECHO_AGENT);
  }
}
