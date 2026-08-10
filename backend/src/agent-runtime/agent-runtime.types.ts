import { LLMFeature } from '../llm/llm-routing.service';
import { AgentRunDocument } from './schemas/agent-run.schema';

/**
 * Execution context handed to a tool's handler on each invocation. Kept
 * deliberately small; feature modules can close over their own services when
 * building an {@link AgentTool}.
 */
export interface AgentToolContext {
  /** The user the run belongs to. */
  userId: string;
  /** The live, persisted run document (readable for prior steps/state). */
  run: AgentRunDocument;
}

/**
 * A tool the agent may call. Registered into the {@link ToolRegistry} by a
 * feature module (e.g. the Job-Search Copilot in wave 3c). `parameters` is a
 * JSON Schema advertised to the model; `handler` performs the actual work.
 */
export interface AgentTool {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  parameters: Record<string, any>;
  handler(ctx: AgentToolContext, args: any): Promise<any>;
}

/**
 * Declarative definition of an agent: which system prompt drives it, which LLM
 * feature (routing/quota) it bills against, and which registered tools it is
 * allowed to call. Registered into the {@link AgentDefinitionRegistry}.
 */
export interface AgentDefinition {
  agentType: string;
  systemPrompt: string;
  feature: LLMFeature;
  /** Allow-list of tool names this agent may invoke. */
  toolNames: string[];
  /** Optional per-run overrides of the default step/token budget. */
  maxSteps?: number;
  maxTokens?: number;
}

/** Default budgets applied when an AgentDefinition does not override them. */
export const DEFAULT_MAX_STEPS = 20;
export const DEFAULT_MAX_TOKENS = 60000;
