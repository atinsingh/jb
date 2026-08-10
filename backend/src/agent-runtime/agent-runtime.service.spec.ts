import { ForbiddenException } from '@nestjs/common';
import { MockProvider } from '../llm/providers/mock.provider';
import { LLMFeature } from '../llm/llm-routing.service';
import { LLMToolCall } from '../llm/interfaces/llm-provider.interface';
import { AgentRuntimeService } from './agent-runtime.service';
import { ToolRegistry } from './tool-registry.service';
import { AgentDefinitionRegistry } from './agent-definition.registry';
import { AgentDefinition, AgentTool } from './agent-runtime.types';

/**
 * In-memory AgentRun document. `new model(init)` returns this object; the
 * service mutates it (steps/stepsUsed/tokensUsed/status) in place, so the same
 * object is inspectable after `run()`.
 */
function makeDoc(init: any) {
  const doc: any = {
    ...init,
    _id: 'run-1',
    steps: init.steps ? [...init.steps] : [],
    stepsUsed: init.stepsUsed ?? 0,
    tokensUsed: init.tokensUsed ?? 0,
    budget: init.budget,
  };
  doc.save = jest.fn(async () => doc);
  doc.markModified = jest.fn();
  return doc;
}

function toolCall(name: string, args: any = {}, id = 'c1'): LLMToolCall {
  return { id, name, arguments: args };
}

interface Harness {
  service: AgentRuntimeService;
  provider: MockProvider;
  quota: { enforceQuota: jest.Mock; recordUsageAndIncrement: jest.Mock };
  accounting: { recordUsage: jest.Mock };
  toolRegistry: ToolRegistry;
  defRegistry: AgentDefinitionRegistry;
  model: jest.Mock;
  lastDoc: () => any;
}

function build(): Harness {
  const provider = new MockProvider();
  const routing: any = {
    getProviderForFeature: jest.fn().mockReturnValue(provider),
    getFeatureConfig: jest
      .fn()
      .mockReturnValue({ model: 'm', temperature: 0.4, maxTokens: 4000 }),
  };
  const accounting = { recordUsage: jest.fn().mockResolvedValue(undefined) };
  const quota = {
    enforceQuota: jest.fn().mockResolvedValue(undefined),
    recordUsageAndIncrement: jest.fn().mockResolvedValue(undefined),
  };
  const toolRegistry = new ToolRegistry();
  const defRegistry = new AgentDefinitionRegistry();
  const created: any[] = [];
  const model = jest.fn().mockImplementation((init: any) => {
    const doc = makeDoc(init);
    created.push(doc);
    return doc;
  });

  const service = new AgentRuntimeService(
    model as any,
    routing,
    accounting as any,
    quota as any,
    defRegistry,
    toolRegistry,
    undefined,
  );

  return {
    service,
    provider,
    quota,
    accounting,
    toolRegistry,
    defRegistry,
    model,
    lastDoc: () => created[created.length - 1],
  };
}

const AGENT: AgentDefinition = {
  agentType: 'demo',
  systemPrompt: 'demo',
  feature: LLMFeature.AGENT_RUNTIME,
  toolNames: ['echo'],
  maxSteps: 5,
  maxTokens: 5000,
};

const echoTool: AgentTool = {
  name: 'echo',
  description: 'echo',
  parameters: { type: 'object', properties: {} },
  handler: jest.fn(async (_ctx, args) => args),
};

describe('AgentRuntimeService.run', () => {
  beforeEach(() => jest.clearAllMocks());

  it('executes a scripted tool call then terminates → completed with steps persisted', async () => {
    const h = build();
    h.toolRegistry.register(echoTool);
    h.defRegistry.register(AGENT);
    h.provider.setScriptedToolTurns([[toolCall('echo', { message: 'hi' })]], 'All done');

    const run: any = await h.service.run('demo', 'user1', { goal: 'do the thing' });

    expect(run.status).toBe('completed');
    // Full trace: llm(tool turn) → tool_call → tool_result → llm(terminal) → final.
    const types = run.steps.map((s: any) => s.type);
    expect(types).toEqual(['llm', 'tool_call', 'tool_result', 'llm', 'final']);

    // Handler actually ran and its output was captured + set as the run result.
    expect(echoTool.handler).toHaveBeenCalledTimes(1);
    const toolResult = run.steps.find((s: any) => s.type === 'tool_result');
    expect(toolResult.output).toEqual({ message: 'hi' });
    expect(run.result).toBe('All done');
    expect(run.stepsUsed).toBe(1);
    expect(run.save).toHaveBeenCalled();

    // Per-turn telemetry recorded (2 LLM turns), credit charged exactly once.
    expect(h.accounting.recordUsage).toHaveBeenCalledTimes(2);
    expect(h.quota.recordUsageAndIncrement).toHaveBeenCalledTimes(1);
  });

  it('rejects a disallowed/unknown tool without executing its handler', async () => {
    const h = build();
    const secretHandler = jest.fn(async () => ({ secret: true }));
    // 'secret' is registered globally but NOT in the agent's allow-list.
    h.toolRegistry.register(echoTool);
    h.toolRegistry.register({
      name: 'secret',
      description: 'secret',
      parameters: { type: 'object', properties: {} },
      handler: secretHandler,
    });
    h.defRegistry.register(AGENT); // toolNames: ['echo'] only
    h.provider.setScriptedToolTurns([[toolCall('secret', { x: 1 })]], 'done');

    const run: any = await h.service.run('demo', 'user1', {});

    expect(secretHandler).not.toHaveBeenCalled();
    const toolResult = run.steps.find((s: any) => s.type === 'tool_result');
    expect(toolResult.output.error).toContain('not available');
    // Run still completes to a terminal answer afterwards.
    expect(run.status).toBe('completed');
  });

  it('stops (partial) when the maxSteps budget is exhausted without a final answer', async () => {
    const h = build();
    h.toolRegistry.register(echoTool);
    h.defRegistry.register({ ...AGENT, maxSteps: 2 });
    // Never-terminating: always returns a tool call.
    h.provider.setScriptedToolTurns(
      [
        [toolCall('echo', {})],
        [toolCall('echo', {})],
        [toolCall('echo', {})],
      ],
      'unreached',
    );

    const run: any = await h.service.run('demo', 'user1', {});

    expect(run.status).toBe('stopped');
    expect(run.stepsUsed).toBe(2);
    expect(run.steps.some((s: any) => s.type === 'final')).toBe(false);
    // No credit charged for a partial run.
    expect(h.quota.recordUsageAndIncrement).not.toHaveBeenCalled();
  });

  it('fails cleanly (no crash) when quota enforcement throws ForbiddenException', async () => {
    const h = build();
    h.toolRegistry.register(echoTool);
    h.defRegistry.register(AGENT);
    h.quota.enforceQuota.mockRejectedValueOnce(
      new ForbiddenException('Quota exceeded'),
    );
    const chatSpy = jest.spyOn(h.provider, 'chatWithTools');

    const run: any = await h.service.run('demo', 'user1', {});

    expect(run.status).toBe('failed');
    expect(run.error).toContain('Quota exceeded');
    expect(chatSpy).not.toHaveBeenCalled();
    // Failed-on-quota must NOT charge a credit.
    expect(h.quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    expect(run.steps.some((s: any) => s.type === 'error')).toBe(true);
  });

  it('fails cleanly for an unknown agent type', async () => {
    const h = build();
    const run: any = await h.service.run('nope', 'user1', {});
    expect(run.status).toBe('failed');
    expect(run.error).toContain('Unknown agent type');
    expect(h.quota.enforceQuota).not.toHaveBeenCalled();
  });

  it('charges exactly one credit on completion (metering charges once per run)', async () => {
    const h = build();
    h.toolRegistry.register(echoTool);
    h.defRegistry.register(AGENT);
    // Two tool turns then terminal — still a single credit.
    h.provider.setScriptedToolTurns(
      [[toolCall('echo', {})], [toolCall('echo', {})]],
      'done',
    );

    const run: any = await h.service.run('demo', 'user1', {});

    expect(run.status).toBe('completed');
    expect(h.quota.recordUsageAndIncrement).toHaveBeenCalledTimes(1);
  });
});
