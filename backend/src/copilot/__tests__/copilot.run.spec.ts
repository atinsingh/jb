import { MockProvider } from '../../llm/providers/mock.provider';
import { LLMToolCall } from '../../llm/interfaces/llm-provider.interface';
import { AgentRuntimeService } from '../../agent-runtime/agent-runtime.service';
import { ToolRegistry } from '../../agent-runtime/tool-registry.service';
import { AgentDefinitionRegistry } from '../../agent-runtime/agent-definition.registry';
import { buildCopilotTools } from '../copilot.tools';
import { JOB_SEARCH_COPILOT, JOB_SEARCH_COPILOT_TYPE } from '../copilot.definition';

/** In-memory AgentRun doc mirroring the runtime spec's harness. */
function makeDoc(init: any) {
  const doc: any = {
    ...init,
    _id: 'run-copilot-1',
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

describe('Job-Search Copilot run (integration over the agent runtime)', () => {
  it('drives find_matches → apply → terminal; AgentRun completed with steps', async () => {
    const provider = new MockProvider();
    const routing: any = {
      getProviderForFeature: jest.fn().mockReturnValue(provider),
      getFeatureConfig: jest.fn().mockReturnValue({ model: 'claude-opus-4-8', temperature: 0.4, maxTokens: 4000 }),
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

    // Wire the real copilot tools to mocked feature services.
    const eligibleJobs = {
      getEligibleJobs: jest.fn().mockResolvedValue({
        jobs: [
          {
            id: 'job-1',
            title: 'Engineer',
            companyName: 'Acme',
            matchScore: 90,
            eligibility: { status: 'ELIGIBLE', autoApplySafe: true, confidence: 0.95 },
            matchedSkills: [],
            missingSkills: [],
          },
        ],
        total: 1,
      }),
    };
    const applicationAgent = { canApplyMore: jest.fn().mockResolvedValue({ canApply: true, remaining: 5 }) };
    const applications = { createApplication: jest.fn().mockResolvedValue({ _id: 'app-1' }) };
    const applyRunner = { submitOne: jest.fn().mockResolvedValue({ id: 'app-1', status: 'submitted' }) };
    const tools = buildCopilotTools({
      eligibleJobs,
      applicationAgent,
      applications,
      applyRunner,
      coverLetters: { generateCoverLetter: jest.fn() },
      notifications: { create: jest.fn() },
    } as any);
    tools.forEach((t) => toolRegistry.register(t));
    defRegistry.register(JOB_SEARCH_COPILOT);

    provider.setScriptedToolTurns(
      [
        [toolCall('find_matches', {}, 'c1')],
        [toolCall('apply', { jobId: 'job-1', matchScore: 90 }, 'c2')],
      ],
      'Found 1 strong match and applied to it.',
    );

    const run: any = await service.run(JOB_SEARCH_COPILOT_TYPE, 'user-1', {
      goal: 'apply for me',
      candidate: { name: 'Ada', email: 'ada@x.com', skills: ['ts'] },
    });

    expect(run.status).toBe('completed');

    // Both tools actually executed via the loop.
    expect(eligibleJobs.getEligibleJobs).toHaveBeenCalledTimes(1);
    expect(applications.createApplication).toHaveBeenCalledWith('user-1', 'job-1', undefined, 90, true);
    expect(applyRunner.submitOne).toHaveBeenCalledWith('app-1');

    // Trace records both tool calls + results and a final answer.
    const toolCalls = run.steps.filter((s: any) => s.type === 'tool_call').map((s: any) => s.tool);
    expect(toolCalls).toEqual(['find_matches', 'apply']);
    const applyResult = run.steps.find((s: any) => s.type === 'tool_result' && s.tool === 'apply');
    expect(applyResult.output).toMatchObject({ applied: true, status: 'submitted' });
    expect(run.steps.some((s: any) => s.type === 'final')).toBe(true);

    // Exactly one credit charged for the whole run.
    expect(quota.recordUsageAndIncrement).toHaveBeenCalledTimes(1);
  });
});
