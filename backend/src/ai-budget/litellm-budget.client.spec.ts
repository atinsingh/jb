import { AiBudgetUnavailableException } from './ai-budget.errors';
import { LiteLlmBudgetClient } from './litellm-budget.client';

describe('LiteLlmBudgetClient', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'LITELLM_BASE_URL') return 'http://litellm.test:4000/v1';
      if (key === 'LITELLM_MASTER_KEY') return 'sk-master-test';
      if (key === 'RESUME_HARNESS_LITELLM_KEY') return 'sk-shared-forbidden';
      return fallback;
    }),
  };
  let originalFetch: typeof global.fetch;
  let fetchMock: jest.Mock;
  let client: LiteLlmBudgetClient;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    config.get.mockClear();
    client = new LiteLlmBudgetClient(config as any);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates a strict owner key with one monthly USD budget', async () => {
    fetchMock.mockResolvedValue(
      response({ key: 'sk-candidate-generated', key_name: 'key-id-1' }),
    );

    const generated = await client.generate({
      ownerType: 'candidate',
      ownerId: 'candidate-1',
      pool: 'candidate-ai',
      keyAlias: 'jobocate-candidate-candidate-1',
      models: ['bedrock/nova-2-lite/low'],
      maxBudgetUsd: 0.5,
    });

    expect(generated).toEqual({
      key: 'sk-candidate-generated',
      keyId: 'key-id-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://litellm.test:4000/key/generate',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer sk-master-test',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key_alias: 'jobocate-candidate-candidate-1',
          models: ['bedrock/nova-2-lite/low'],
          max_budget: 0.5,
          budget_duration: '1mo',
          max_parallel_requests: 1,
          metadata: {
            ownerType: 'candidate',
            ownerId: 'candidate-1',
            pool: 'candidate-ai',
          },
        }),
      }),
    );
  });

  it('updates, reads, and revokes only the supplied virtual key', async () => {
    fetchMock
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(
        response({
          info: {
            spend: 0.42,
            max_budget: 4,
            budget_reset_at: '2026-10-01T00:00:00.000Z',
          },
        }),
      )
      .mockResolvedValueOnce(response({}));

    await client.update('sk-candidate-only', {
      models: ['anthropic/claude-haiku-4-5/low'],
      maxBudgetUsd: 4,
    });
    const info = await client.info('sk-candidate-only');
    await client.revoke('sk-candidate-only');

    expect(info).toEqual({
      spendUsd: 0.42,
      limitUsd: 4,
      resetAt: new Date('2026-10-01T00:00:00.000Z'),
    });
    expect(JSON.stringify(info)).not.toContain('sk-candidate-only');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://litellm.test:4000/key/update',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          key: 'sk-candidate-only',
          models: ['anthropic/claude-haiku-4-5/low'],
          max_budget: 4,
          budget_duration: '1mo',
          max_parallel_requests: 1,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://litellm.test:4000/key/info?key=sk-candidate-only',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://litellm.test:4000/key/delete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ keys: ['sk-candidate-only'] }),
      }),
    );
  });

  it('fails closed without a master key even when a shared proxy key exists', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'LITELLM_MASTER_KEY') return '';
      if (key === 'RESUME_HARNESS_LITELLM_KEY') return 'sk-shared-forbidden';
      return fallback;
    });
    client = new LiteLlmBudgetClient(config as any);

    await expect(
      client.generate({
        ownerType: 'candidate',
        ownerId: 'candidate-1',
        pool: 'candidate-ai',
        keyAlias: 'jobocate-candidate-candidate-1',
        models: ['bedrock/nova-2-lite/low'],
        maxBudgetUsd: 0.5,
      }),
    ).rejects.toMatchObject({ code: 'AI_BUDGET_UNAVAILABLE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['network failure', () => Promise.reject(new Error('offline'))],
    ['non-2xx response', () => Promise.resolve(response({}, false, 503))],
    [
      'malformed response',
      () => Promise.resolve(response({ key: 'missing-id' })),
    ],
  ])(
    'returns the same typed unavailable response for %s',
    async (_name, reply) => {
      fetchMock.mockImplementation(reply);

      let error: unknown;
      try {
        await client.generate({
          ownerType: 'candidate',
          ownerId: 'candidate-1',
          pool: 'candidate-ai',
          keyAlias: 'jobocate-candidate-candidate-1',
          models: ['bedrock/nova-2-lite/low'],
          maxBudgetUsd: 0.5,
        });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(AiBudgetUnavailableException);
      expect((error as AiBudgetUnavailableException).getResponse()).toEqual({
        statusCode: 503,
        code: 'AI_BUDGET_UNAVAILABLE',
        message:
          'AI budget is temporarily unavailable. No AI work was started.',
      });
    },
  );
});

function response(body: unknown, ok = true, status = 200): Partial<Response> {
  return { ok, status, json: async () => body };
}
