import { OwnerLlmService } from './owner-llm.service';
import { LLMFeature } from './llm-routing.service';
import { LiteLLMProvider } from './providers/litellm.provider';

describe('owner-scoped model usage', () => {
  const provider = { chat: jest.fn(), chatWithTools: jest.fn() };
  let budget: any;
  let aliases: any;
  let service: OwnerLlmService;

  beforeEach(() => {
    budget = {
      ownerTier: jest.fn().mockResolvedValue('FREE'),
      withOwnerLease: jest.fn(async (_type, _id, _feature, _attribution, run) => run({ apiKey: 'sk-owner' }, ['ownerId=user-1'])),
    };
    aliases = { resolveAutomaticForTier: jest.fn().mockResolvedValue({ alias: 'bedrock/test/low', model: 'test', effort: 'low' }) };
    jest.spyOn(LiteLLMProvider, 'forOwner').mockReturnValue(provider as any);
    service = new OwnerLlmService(budget, aliases);
  });
  afterEach(() => jest.restoreAllMocks());

  it('groups nested calls in a logical run and pins the owner key and selected alias', async () => {
    await service.run('user-1', LLMFeature.AGENT_RUNTIME, async () => {
      await service.run('user-1', LLMFeature.REWRITE_BULLETS, async () => 'nested');
      await service.run('user-1', LLMFeature.TAILOR_RESUME, async () => 'nested');
    });
    expect(budget.withOwnerLease).toHaveBeenCalledTimes(1);
    expect(budget.withOwnerLease.mock.calls[0].slice(0, 2)).toEqual(['candidate', 'user-1']);
    expect(LiteLLMProvider.forOwner).toHaveBeenCalledWith('sk-owner', 'bedrock/test/low', ['ownerId=user-1']);
  });

  it('uses the employer pool and refuses cross-owner nesting', async () => {
    await service.run('employer-1', LLMFeature.RECRUITER_COPILOT, async () => {
      await expect(service.run('candidate-2', LLMFeature.REWRITE_BULLETS, async () => 'wrong')).rejects.toThrow(/owner/i);
    });
    expect(budget.withOwnerLease.mock.calls[0].slice(0, 2)).toEqual(['employer', 'employer-1']);
    expect(budget.withOwnerLease).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch when owner preflight fails', async () => {
    budget.withOwnerLease.mockRejectedValue(new Error('unavailable'));
    const dispatch = jest.fn();
    await expect(service.run('user-1', LLMFeature.REWRITE_BULLETS, dispatch)).rejects.toThrow('unavailable');
    expect(dispatch).not.toHaveBeenCalled();
    expect(LiteLLMProvider.forOwner).not.toHaveBeenCalled();
  });
});
