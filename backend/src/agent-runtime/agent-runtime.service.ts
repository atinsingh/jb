import {
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import {
  LLMChatMessage,
  LLMToolCall,
  LLMToolDef,
} from '../llm/interfaces/llm-provider.interface';
import { LLMRoutingService } from '../llm/llm-routing.service';
import { LLMAccountingService } from '../llm/llm-accounting.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { QUEUE_AGENT, JOB_AGENT_RUN } from '../queue/queue.constants';
import { AgentDefinitionRegistry } from './agent-definition.registry';
import { ToolRegistry } from './tool-registry.service';
import {
  AgentDefinition,
  DEFAULT_MAX_STEPS,
  DEFAULT_MAX_TOKENS,
} from './agent-runtime.types';
import {
  AgentRun,
  AgentRunDocument,
  AgentRunStatus,
  AgentRunStep,
} from './schemas/agent-run.schema';

/** Payload for a queued agent run. */
export interface AgentRunJobData {
  agentType: string;
  userId: string;
  input: any;
}

/**
 * Generic AI agent runtime — a reusable planner/executor loop over the
 * tool-use provider support. Resolves an {@link AgentDefinition}, drives a
 * tool-calling conversation against the routed LLM provider, records each step
 * to an {@link AgentRun}, enforces step/token budgets and a tool allow-list,
 * and meters exactly one credit per completed run.
 *
 * This is the generic `agent-runtime` domain — NOT the human-concierge
 * `agents/` / `application-agent` domain.
 */
@Injectable()
export class AgentRuntimeService {
  private readonly logger = new Logger(AgentRuntimeService.name);

  constructor(
    @InjectModel(AgentRun.name)
    private readonly agentRunModel: Model<AgentRunDocument>,
    private readonly routingService: LLMRoutingService,
    private readonly accountingService: LLMAccountingService,
    private readonly quotaService: LLMQuotaService,
    private readonly definitionRegistry: AgentDefinitionRegistry,
    private readonly toolRegistry: ToolRegistry,
    // Background agent queue. `@Optional()` → undefined unless QUEUE_ENABLED=true.
    @Optional()
    @InjectQueue(QUEUE_AGENT)
    private readonly agentQueue?: Queue,
  ) {}

  /**
   * Producer: enqueue a run when the background queue is registered, else run
   * it inline. When queued, a `running` AgentRun is created up-front so the
   * caller gets a runId to poll.
   */
  async enqueueRun(
    agentType: string,
    userId: string,
    input: any,
  ): Promise<
    | { queued: true; runId: string; jobId?: string | number }
    | { queued: false; run: AgentRunDocument }
  > {
    if (this.agentQueue) {
      const def = this.definitionRegistry.get(agentType);
      const run = await this.createRun(agentType, userId, input, def);
      const job = await this.agentQueue.add(JOB_AGENT_RUN, {
        agentType,
        userId,
        input,
        runId: String(run._id),
      });
      return { queued: true, runId: String(run._id), jobId: job.id };
    }
    const run = await this.run(agentType, userId, input);
    return { queued: false, run };
  }

  /**
   * Execute an agent run to a terminal state and return the persisted document.
   * Never throws for expected failure modes (unknown agent, quota denial,
   * missing tool-use support) — those resolve to a `failed` run.
   */
  async run(
    agentType: string,
    userId: string,
    input: any,
  ): Promise<AgentRunDocument> {
    const def = this.definitionRegistry.get(agentType);
    const run = await this.createRun(agentType, userId, input, def);

    if (!def) {
      return this.failRun(run, `Unknown agent type: ${agentType}`);
    }

    // 1) Quota — enforced ONCE at run start. A ForbiddenException fails the run
    //    cleanly (no 500, no credit charged) rather than propagating.
    try {
      await this.quotaService.enforceQuota(userId, def.feature);
    } catch (err) {
      if (err instanceof ForbiddenException) {
        return this.failRun(run, `Quota exceeded: ${err.message}`);
      }
      return this.failRun(run, this.errorMessage(err));
    }

    // 2) Provider must support tool use.
    const provider = this.routingService.getProviderForFeature(def.feature);
    if (!provider.chatWithTools) {
      return this.failRun(
        run,
        `Provider for feature ${def.feature} does not support tool use`,
      );
    }

    const config = this.routingService.getFeatureConfig(def.feature);
    const tools = this.toolRegistry.list(def.toolNames);
    const toolDefs: LLMToolDef[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
    const allowed = new Set(def.toolNames);

    const messages: LLMChatMessage[] = [
      { role: 'system', content: def.systemPrompt },
      { role: 'user', content: run.goal ?? JSON.stringify(input) },
    ];

    let finalReached = false;

    try {
      while (run.stepsUsed < run.budget.maxSteps && run.tokensUsed < run.budget.maxTokens) {
        const res = await provider.chatWithTools({
          messages,
          tools: toolDefs,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          toolChoice: 'auto',
        });

        const turnTokens = res.usage?.totalTokens ?? 0;
        run.tokensUsed += turnTokens;

        // Per-turn token telemetry ONLY (no credit increment here).
        await this.accountingService.recordUsage(
          userId,
          def.feature,
          provider.getName(),
          config.model,
          res.usage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          { agentType, runId: String(run._id) },
        );

        await this.pushStep(run, {
          type: 'llm',
          text: res.content,
          tokens: turnTokens,
          at: new Date(),
        });

        if (res.toolCalls && res.toolCalls.length > 0) {
          // Record the assistant turn that requested the tools before answering.
          messages.push({
            role: 'assistant',
            content: res.content ?? '',
            toolCalls: res.toolCalls,
          });

          for (const call of res.toolCalls) {
            await this.executeToolCall(run, def, allowed, call, userId, messages);
          }
          run.stepsUsed += 1;
          await this.persist(run);
        } else {
          // No tool calls → terminal answer.
          await this.pushStep(run, {
            type: 'final',
            text: res.content,
            at: new Date(),
          });
          run.result = res.content;
          run.markModified('result');
          finalReached = true;
          break;
        }
      }
    } catch (err) {
      await this.pushStep(run, {
        type: 'error',
        text: this.errorMessage(err),
        at: new Date(),
      });
      return this.finish(run, 'failed', this.errorMessage(err));
    }

    if (!finalReached) {
      // Budget exhausted without a final answer → partial/stopped.
      return this.finish(run, 'stopped', 'Budget exhausted before completion');
    }

    // 3) Charge exactly ONE credit for the whole run — only on success.
    await this.chargeOneCredit(run, def, userId);
    return this.finish(run, 'completed');
  }

  /**
   * Resolve, allow-list check and execute a single tool call, appending both
   * the trace steps and the `role:'tool'` result message. A disallowed/unknown
   * tool never runs its handler — it produces a tool_result error instead.
   */
  private async executeToolCall(
    run: AgentRunDocument,
    def: AgentDefinition,
    allowed: Set<string>,
    call: LLMToolCall,
    userId: string,
    messages: LLMChatMessage[],
  ): Promise<void> {
    await this.pushStep(run, {
      type: 'tool_call',
      tool: call.name,
      args: call.arguments,
      at: new Date(),
    });

    const tool = allowed.has(call.name) ? this.toolRegistry.get(call.name) : undefined;

    if (!tool) {
      const errorMsg = `Tool "${call.name}" is not available to agent "${def.agentType}"`;
      await this.pushStep(run, {
        type: 'tool_result',
        tool: call.name,
        output: { error: errorMsg },
        at: new Date(),
      });
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        content: JSON.stringify({ error: errorMsg }),
      });
      return;
    }

    try {
      const output = await tool.handler({ userId, run }, call.arguments);
      await this.pushStep(run, {
        type: 'tool_result',
        tool: call.name,
        output,
        at: new Date(),
      });
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        content: JSON.stringify(output ?? null),
      });
    } catch (err) {
      const errorMsg = this.errorMessage(err);
      await this.pushStep(run, {
        type: 'tool_result',
        tool: call.name,
        output: { error: errorMsg },
        at: new Date(),
      });
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        content: JSON.stringify({ error: errorMsg }),
      });
    }
  }

  /** Create + persist a fresh `running` AgentRun with resolved budgets. */
  private async createRun(
    agentType: string,
    userId: string,
    input: any,
    def?: AgentDefinition,
  ): Promise<AgentRunDocument> {
    const maxSteps = def?.maxSteps ?? DEFAULT_MAX_STEPS;
    const maxTokens = def?.maxTokens ?? DEFAULT_MAX_TOKENS;
    const goal =
      input && typeof input === 'object' && typeof input.goal === 'string'
        ? input.goal
        : undefined;

    const run = new this.agentRunModel({
      userId,
      agentType,
      status: 'running',
      goal,
      input,
      steps: [],
      budget: { maxSteps, maxTokens },
      stepsUsed: 0,
      tokensUsed: 0,
      feature: def?.feature,
    });
    return run.save();
  }

  /** Append a step to the trace and persist. */
  private async pushStep(
    run: AgentRunDocument,
    step: AgentRunStep & { error?: string },
  ): Promise<void> {
    run.steps.push(step as AgentRunStep);
    run.markModified('steps');
    await this.persist(run);
  }

  private async persist(run: AgentRunDocument): Promise<void> {
    await run.save();
  }

  /** Charge exactly one credit (increment path) with aggregated telemetry. */
  private async chargeOneCredit(
    run: AgentRunDocument,
    def: AgentDefinition,
    userId: string,
  ): Promise<void> {
    // The per-turn telemetry rows already captured real token usage; this single
    // increment-path call bumps the credit counter exactly once for the whole
    // N-step run (zero-token marker to avoid double-counting tokens).
    await this.quotaService.recordUsageAndIncrement(
      userId,
      def.feature,
      'agent-runtime',
      def.agentType,
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      { agentType: def.agentType, runId: String(run._id), aggregatedTokens: run.tokensUsed },
    );
  }

  /** Terminal helper for the failure fast-paths (no credit charged). */
  private async failRun(
    run: AgentRunDocument,
    error: string,
  ): Promise<AgentRunDocument> {
    await this.pushStep(run, { type: 'error', text: error, at: new Date() });
    return this.finish(run, 'failed', error);
  }

  private async finish(
    run: AgentRunDocument,
    status: AgentRunStatus,
    error?: string,
  ): Promise<AgentRunDocument> {
    run.status = status;
    if (error) {
      run.error = error;
    }
    return this.persist(run).then(() => run);
  }

  private errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
