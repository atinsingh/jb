import { AgentRuntimeService } from './agent-runtime.service';
import { AgentRunProcessor } from './agent-run.processor';
import { ToolRegistry } from './tool-registry.service';
import { AgentDefinitionRegistry } from './agent-definition.registry';
import { LLMFeature } from '../llm/llm-routing.service';
import { JOB_AGENT_RUN } from '../queue/queue.constants';

function makeDoc(init: any) {
  const doc: any = { ...init, _id: 'run-1', steps: [], save: undefined };
  doc.save = jest.fn(async () => doc);
  doc.markModified = jest.fn();
  return doc;
}

function buildService(queue?: any) {
  const routing: any = {
    getProviderForFeature: jest.fn(),
    getFeatureConfig: jest.fn(),
  };
  const accounting: any = { recordUsage: jest.fn() };
  const quota: any = {
    enforceQuota: jest.fn(),
    recordUsageAndIncrement: jest.fn(),
  };
  const toolRegistry = new ToolRegistry();
  const defRegistry = new AgentDefinitionRegistry();
  defRegistry.register({
    agentType: 'demo',
    systemPrompt: 'x',
    feature: LLMFeature.AGENT_RUNTIME,
    toolNames: [],
  });
  const model = jest.fn().mockImplementation((init: any) => makeDoc(init));
  const service = new AgentRuntimeService(
    model as any,
    routing,
    accounting,
    quota,
    defRegistry,
    toolRegistry,
    queue,
  );
  return { service, model };
}

describe('AgentRuntimeService.enqueueRun (producer: queue vs inline)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enqueues a job and returns the runId when a queue is present', async () => {
    const queue = { add: jest.fn().mockResolvedValue({ id: 'j1' }) };
    const { service, model } = buildService(queue);
    // Must NOT run the loop inline when queued.
    const runSpy = jest.spyOn(service, 'run').mockResolvedValue({} as any);

    const result: any = await service.enqueueRun('demo', 'user1', { goal: 'g' });

    // A 'running' AgentRun was created up-front for polling.
    expect(model).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      JOB_AGENT_RUN,
      expect.objectContaining({ agentType: 'demo', userId: 'user1', runId: 'run-1' }),
    );
    expect(runSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ queued: true, runId: 'run-1', jobId: 'j1' });
  });

  it('runs inline when the queue is absent (dev/test default)', async () => {
    const { service } = buildService(undefined);
    const fakeRun = { _id: 'run-9', status: 'completed' };
    const runSpy = jest.spyOn(service, 'run').mockResolvedValue(fakeRun as any);

    const result: any = await service.enqueueRun('demo', 'user1', { goal: 'g' });

    expect(runSpy).toHaveBeenCalledWith('demo', 'user1', { goal: 'g' });
    expect(result).toEqual({ queued: false, run: fakeRun });
  });
});

describe('AgentRunProcessor', () => {
  it('delegates to runtime.run and returns runId + status', async () => {
    const runtime = {
      run: jest.fn().mockResolvedValue({ _id: 'run-1', status: 'completed' }),
    } as unknown as AgentRuntimeService;
    const processor = new AgentRunProcessor(runtime);
    const job: any = { id: 'j1', data: { agentType: 'demo', userId: 'u1', input: { goal: 'g' } } };

    const result = await processor.handleRun(job);

    expect((runtime as any).run).toHaveBeenCalledWith('demo', 'u1', { goal: 'g' });
    expect(result).toEqual({ runId: 'run-1', status: 'completed' });
  });
});
