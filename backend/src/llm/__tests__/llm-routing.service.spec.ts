import { LLMRoutingService, LLMFeature } from '../llm-routing.service';

describe('owner-only feature routing', () => {
  const chat = jest.fn().mockResolvedValue({ content: 'ok' });
  const owner = { run: jest.fn(async (_id, _feature, task) => task({ alias: 'bedrock/test/low', provider: { chat, chatWithTools: chat } })) };
  let service: LLMRoutingService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new (LLMRoutingService as any)({ get: (key: string) => key === 'DEFAULT_AUTOMATIC_MODEL_ALIAS' ? 'bedrock/test/low' : undefined }, owner);
  });
  it('requires an authenticated owner before exposing a model provider', () => {
    expect(() => (service.getProviderForFeature as any)(LLMFeature.REWRITE_BULLETS)).toThrow(/owner/i);
  });
  it('runs with the owner key and tier-validated alias, never a shared fallback', async () => {
    const provider = (service.getProviderForFeature as any)(LLMFeature.REWRITE_BULLETS, 'candidate-1');
    await provider.chat({ messages: [{ role: 'user', content: 'test' }], model: 'old-provider-model' });
    expect(owner.run).toHaveBeenCalledWith('candidate-1', LLMFeature.REWRITE_BULLETS, expect.any(Function));
    expect(chat).toHaveBeenCalledWith(expect.objectContaining({ model: 'bedrock/test/low' }));
  });
});
