import { LiteLlmVirtualKeyClient } from './litellm-virtual-key.client';

describe('LiteLlmVirtualKeyClient', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'LITELLM_BASE_URL') return 'http://litellm.test:4000/v1';
      if (key === 'LITELLM_MASTER_KEY') return 'sk-master-test';
      return fallback;
    }),
  };
  let originalFetch: typeof global.fetch;
  let fetchMock: jest.Mock;
  let client: LiteLlmVirtualKeyClient;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    client = new LiteLlmVirtualKeyClient(config as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates an employer-only virtual key with an authoritative USD budget and shared aliases', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ key: 'sk-employer-generated', key_name: 'hashed-key' }),
    });

    const result = await client.generate({
      ownerId: 'employer-1',
      keyAlias: 'jobocate-employer-employer-1',
      models: ['bedrock/nova-2-lite/low'],
      maxBudgetUsd: 1,
    });

    expect(result).toEqual({ key: 'sk-employer-generated', keyHash: 'hashed-key' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://litellm.test:4000/key/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-master-test' }),
        body: JSON.stringify({
          key_alias: 'jobocate-employer-employer-1',
          models: ['bedrock/nova-2-lite/low'],
          max_budget: 1,
          budget_duration: '1mo',
          max_parallel_requests: 1,
          metadata: {
            ownerId: 'employer-1',
            ownerType: 'employer',
            usageContext: 'employer_resume_assessment',
          },
        }),
      }),
    );
  });

  it('reads spend without exposing the virtual key in its result', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        info: {
          spend: 0.42,
          max_budget: 1,
          budget_reset_at: '2026-10-01T00:00:00.000Z',
        },
      }),
    });

    const result = await client.info('sk-employer-only');

    expect(result).toEqual({
      spendUsd: 0.42,
      limitUsd: 1,
      resetAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    expect(JSON.stringify(result)).not.toContain('sk-employer-only');
  });

  it('updates only the supplied employer key when its plan changes', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await client.update('sk-employer-only', {
      models: ['anthropic/claude-sonnet-4-5/high'],
      maxBudgetUsd: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://litellm.test:4000/key/update',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          key: 'sk-employer-only',
          models: ['anthropic/claude-sonnet-4-5/high'],
          max_budget: 10,
          budget_duration: '1mo',
          max_parallel_requests: 1,
        }),
      }),
    );
  });

  it('normalizes individual spend logs into request attribution only', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          request_id: 'chatcmpl-1',
          model: 'bedrock/nova-2-lite/low',
          spend: 0.03,
          prompt_tokens: 12,
          completion_tokens: 4,
          metadata: { user_api_key_alias: 'jobocate-employer-1' },
        },
      ],
    });

    const result = await client.spendLogs(
      new Date('2026-09-15T10:00:00Z'),
      new Date('2026-09-15T10:01:00Z'),
    );

    expect(result).toEqual([
      {
        requestId: 'chatcmpl-1',
        keyAlias: 'jobocate-employer-1',
        model: 'bedrock/nova-2-lite/low',
        costUsd: 0.03,
        promptTokens: 12,
        completionTokens: 4,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://litellm.test:4000/spend/logs?start_date=2026-09-15&end_date=2026-09-16&summarize=false',
      expect.any(Object),
    );
  });

  it('fails closed when virtual-key provisioning is not configured, even with a shared key', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'LITELLM_BASE_URL') return 'http://litellm.test:4000';
      if (key === 'LITELLM_MASTER_KEY') return '';
      if (key === 'RESUME_HARNESS_LITELLM_KEY') return 'sk-harness-shared';
      return fallback;
    });
    client = new LiteLlmVirtualKeyClient(config as any);

    await expect(client.generate({
      ownerId: 'employer-1',
      keyAlias: 'jobocate-employer-employer-1',
      models: ['bedrock/nova-2-lite/low'],
      maxBudgetUsd: 1,
    })).rejects.toThrow();
    await expect(client.info('sk-employer')).rejects.toThrow();
    await expect(client.update('sk-employer', {
      models: ['bedrock/nova-2-lite/low'],
      maxBudgetUsd: 1,
    })).rejects.toThrow();
    await expect(client.spendLogs(new Date(), new Date())).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when management rejects a request, even with a shared key', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'LITELLM_BASE_URL') return 'http://litellm.test:4000';
      if (key === 'LITELLM_MASTER_KEY') return 'sk-master-test';
      if (key === 'RESUME_HARNESS_LITELLM_KEY') return 'sk-harness-shared';
      return fallback;
    });
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    client = new LiteLlmVirtualKeyClient(config as any);

    await expect(client.generate({
      ownerId: 'employer-1',
      keyAlias: 'jobocate-employer-employer-1',
      models: ['bedrock/nova-2-lite/low'],
      maxBudgetUsd: 1,
    })).rejects.toThrow();
    await expect(client.info('sk-employer')).rejects.toThrow();
    await expect(client.update('sk-employer', { models: ['model'], maxBudgetUsd: 1 })).rejects.toThrow();
    await expect(client.spendLogs(new Date(), new Date())).rejects.toThrow();
  });

  it.each([null, '', -1, 'garbage'])('rejects invalid measured spend %s instead of reporting free usage', async (spend) => {
    config.get.mockImplementation((key: string, fallback?: string) => key === 'LITELLM_MASTER_KEY' ? 'sk-master-test' : fallback);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ info: { spend, max_budget: 1 } }) });
    await expect(client.info('sk-employer')).rejects.toThrow();
  });
});
