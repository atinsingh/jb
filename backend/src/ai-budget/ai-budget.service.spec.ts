import {
  AiBudgetExhaustedException,
  AiBudgetOperationInProgressException,
  AiBudgetUnavailableException,
} from './ai-budget.errors';
import { AiBudgetService } from './ai-budget.service';

describe('AiBudgetService', () => {
  const NOW = new Date('2026-09-15T12:00:00.000Z');
  const aliases = [
    { alias: 'anthropic/claude-haiku-4-5/low' },
    { alias: 'bedrock/nova-2-lite/low' },
    { alias: 'openai/gpt-5.6-luna/low' },
  ];

  let accountStore: ReturnType<typeof createAccountStore>;
  let tier: string;
  let spendUsd: number;
  let infoFailure: boolean;
  let keySequence: number;
  let policy: any;
  let client: any;
  let codec: any;
  let modelAliases: any;
  let service: AiBudgetService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    accountStore = createAccountStore();
    tier = 'FREE';
    spendUsd = 0.1;
    infoFailure = false;
    keySequence = 0;
    policy = {
      tier: jest.fn((value: string) => ({
        maxBudgetUsd: value === 'PRO' ? 4 : 0.5,
        budgetDuration: '1mo',
      })),
      lowRemainingRatio: jest.fn(() => 0.2),
      service: jest.fn(() => ({
        id: 'resume_agent_turn',
        enabled: true,
        metered: true,
        ownerType: 'candidate',
        pool: 'candidate-ai',
      })),
    };
    client = {
      generate: jest.fn(async () => {
        keySequence += 1;
        return {
          key: `sk-candidate-${keySequence}`,
          keyId: `key-${keySequence}`,
        };
      }),
      update: jest.fn(async () => undefined),
      info: jest.fn(async () => {
        if (infoFailure) throw new AiBudgetUnavailableException();
        return {
          spendUsd,
          limitUsd: tier === 'PRO' ? 4 : 0.5,
          resetAt: new Date('2026-10-01T00:00:00.000Z'),
        };
      }),
      revoke: jest.fn(async () => undefined),
    };
    codec = {
      encrypt: jest.fn((value: string) => `encrypted:${value}`),
      decrypt: jest.fn((value: string) => value.replace('encrypted:', '')),
    };
    modelAliases = {
      tierFor: jest.fn(async () => tier),
      listForTier: jest.fn(async () => aliases),
    };
    service = new AiBudgetService(
      accountStore.model as any,
      policy,
      client,
      codec,
      modelAliases,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lazily creates one encrypted candidate key and reuses it across all harnesses', async () => {
    const seenKeys: string[] = [];

    for (const harness of ['claude-code', 'codex', 'opencode'] as const) {
      await service.withCandidateLease(
        'candidate-1',
        'resume_agent_turn',
        {
          harness,
          alias: aliases[0].alias,
          model: 'claude-haiku-4-5',
          effort: 'low',
          sessionId: `session-${harness}`,
          runId: `run-${harness}`,
        },
        async (access, tags) => {
          seenKeys.push(access.apiKey);
          expect(tags).toEqual(
            expect.arrayContaining([
              'ownerType=candidate',
              'ownerId=candidate-1',
              `harness=${harness}`,
              'usageContext=resume_agent_turn',
            ]),
          );
          return 'ok';
        },
      );
    }

    expect(client.generate).toHaveBeenCalledTimes(1);
    expect(client.generate).toHaveBeenCalledWith({
      ownerType: 'candidate',
      ownerId: 'candidate-1',
      pool: 'candidate-ai',
      keyAlias: 'candidate:candidate-1',
      models: aliases.map((item) => item.alias),
      maxBudgetUsd: 0.5,
    });
    expect(seenKeys).toEqual([
      'sk-candidate-1',
      'sk-candidate-1',
      'sk-candidate-1',
    ]);
    expect(accountStore.account?.encryptedKey).toBe('encrypted:sk-candidate-1');
    expect(JSON.stringify(accountStore.account)).not.toContain(
      '"encryptedKey":"sk-candidate-1"',
    );
  });

  it('updates the existing key when the candidate tier changes', async () => {
    accountStore.account = existingAccount();
    tier = 'PRO';
    spendUsd = 1.25;

    const access = await service.ensureCandidateAccess('candidate-1');

    expect(client.generate).not.toHaveBeenCalled();
    expect(client.update).toHaveBeenCalledWith('sk-existing', {
      models: aliases.map((item) => item.alias),
      maxBudgetUsd: 4,
    });
    expect(accountStore.account).toMatchObject({
      appliedTier: 'PRO',
      appliedLimitUsd: 4,
      budgetDuration: '1mo',
    });
    expect(access.snapshot).toMatchObject({
      tier: 'PRO',
      limit: 4,
      spent: 1.25,
      remaining: 2.75,
      status: 'healthy',
    });
  });

  it.each([
    [0.123456789, 'healthy', 0.123457, 0.376543],
    [0.4, 'low', 0.4, 0.1],
    [0.500001, 'exhausted', 0.500001, 0],
  ])(
    'normalizes authoritative spend %s as %s without exposing a secret',
    async (spend, expectedStatus, expectedSpent, expectedRemaining) => {
      accountStore.account = existingAccount();
      spendUsd = spend;

      const snapshot = await service.statusCandidate('candidate-1');

      expect(snapshot).toEqual({
        unit: 'USD',
        tier: 'FREE',
        limit: 0.5,
        spent: expectedSpent,
        remaining: expectedRemaining,
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-10-01T00:00:00.000Z',
        resetAt: '2026-10-01T00:00:00.000Z',
        status: expectedStatus,
        lastRefreshedAt: NOW.toISOString(),
      });
      expect(JSON.stringify(snapshot)).not.toContain('sk-existing');
      expect(JSON.stringify(snapshot)).not.toContain('encryptedKey');
    },
  );

  it('returns an unavailable snapshot while access fails closed', async () => {
    accountStore.account = existingAccount();
    infoFailure = true;

    await expect(
      service.ensureCandidateAccess('candidate-1'),
    ).rejects.toBeInstanceOf(AiBudgetUnavailableException);
    await expect(service.statusCandidate('candidate-1')).resolves.toMatchObject(
      {
        unit: 'USD',
        tier: 'FREE',
        limit: 0.5,
        spent: 0,
        remaining: 0,
        status: 'unavailable',
      },
    );
  });

  it('throws a typed payment-required error before returning exhausted access', async () => {
    accountStore.account = existingAccount();
    spendUsd = 0.5;

    let error: unknown;
    try {
      await service.ensureCandidateAccess('candidate-1');
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AiBudgetExhaustedException);
    expect((error as AiBudgetExhaustedException).getStatus()).toBe(402);
    expect((error as AiBudgetExhaustedException).getResponse()).toMatchObject({
      statusCode: 402,
      code: 'AI_BUDGET_EXHAUSTED',
    });
  });

  it('rejects a concurrent run and releases the lease after the first finishes', async () => {
    accountStore.account = existingAccount();
    let releaseFirst!: () => void;
    const held = new Promise<void>((resolve) => (releaseFirst = resolve));

    const first = service.withCandidateLease(
      'candidate-1',
      'resume_agent_turn',
      attribution('first'),
      async () => held,
    );
    await Promise.resolve();
    await Promise.resolve();

    await expect(
      service.withCandidateLease(
        'candidate-1',
        'resume_agent_turn',
        attribution('second'),
        async () => 'should-not-run',
      ),
    ).rejects.toBeInstanceOf(AiBudgetOperationInProgressException);

    releaseFirst();
    await first;
    expect(accountStore.account?.activeRunId).toBeUndefined();
    expect(accountStore.account?.runLockUntil).toBeUndefined();
  });

  it('recovers a lease whose 15-minute lock has expired', async () => {
    accountStore.account = {
      ...existingAccount(),
      activeRunId: 'abandoned-run',
      runLockUntil: new Date(NOW.getTime() - 1),
    };

    await expect(
      service.withCandidateLease(
        'candidate-1',
        'resume_agent_turn',
        attribution('replacement'),
        async () => 'recovered',
      ),
    ).resolves.toBe('recovered');
  });

  function existingAccount() {
    return {
      _id: 'account-1',
      ownerType: 'candidate',
      ownerId: 'candidate-1',
      keyId: 'key-existing',
      keyAlias: 'candidate:candidate-1',
      encryptedKey: 'encrypted:sk-existing',
      appliedTier: 'FREE',
      appliedLimitUsd: 0.5,
      budgetDuration: '1mo',
    };
  }

  function attribution(runId: string) {
    return {
      harness: 'opencode' as const,
      alias: aliases[2].alias,
      model: 'gpt-5.6-luna',
      effort: 'low',
      sessionId: 'session-1',
      runId,
    };
  }
});

function createAccountStore() {
  let account: any;
  const query = (read: () => any) => {
    const value: any = {
      select: () => value,
      exec: async () => read(),
    };
    return value;
  };
  const applyUpdate = (target: any, update: any) => {
    Object.assign(target, update.$set || {});
    for (const key of Object.keys(update.$unset || {})) delete target[key];
  };
  const model = {
    findOne: jest.fn(() => query(() => account || null)),
    create: jest.fn(async (value: any) => {
      account = { _id: 'account-1', ...value };
      return account;
    }),
    updateOne: jest.fn((filter: any, update: any) =>
      query(() => {
        if (
          account &&
          (!filter._id || filter._id === account._id) &&
          (!filter.activeRunId || filter.activeRunId === account.activeRunId)
        ) {
          applyUpdate(account, update);
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      }),
    ),
    findOneAndUpdate: jest.fn((_filter: any, update: any) =>
      query(() => {
        const lockExpired =
          !account?.activeRunId ||
          !account?.runLockUntil ||
          account.runLockUntil.getTime() < Date.now();
        if (!account || !lockExpired) return null;
        applyUpdate(account, update);
        return account;
      }),
    ),
  };

  return {
    model,
    get account() {
      return account;
    },
    set account(value: any) {
      account = value;
    },
  };
}
