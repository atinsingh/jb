import {
  AiBudgetExhaustedException,
  AiBudgetOperationInProgressException,
  AiBudgetUnavailableException,
} from './ai-budget.errors';
import { AiBudgetService } from './ai-budget.service';
import { budgetWorker } from './ai-budget-run-context';

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
        maxBudgetCredits: value === 'PRO' ? 400 : 50,
        budgetDuration: '1mo',
      })),
      lowRemainingRatio: jest.fn(() => 0.2),
      estimate: jest.fn(() => ({ kind: 'usage_based' })),
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
      usage: jest.fn(async () => ({ spendUsd, credits: Math.ceil(spendUsd * 100 - 1e-9) })),
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
      { getOrCreateSubscription: jest.fn().mockResolvedValue({ plan: 'free' }) } as any,
    );
    jest.spyOn(service as any, 'waitForUsage').mockResolvedValue(undefined);
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

  it('keeps a one-period credit grant in the provider limit across access refreshes', async () => {
    accountStore.account = {
      ...existingAccount(), bonusCredits: 500,
      bonusPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
    };
    await service.ensureCandidateAccess('candidate-1');
    expect(client.update).toHaveBeenCalledWith('sk-existing', expect.objectContaining({ maxBudgetUsd: 5.5 }));
    expect(accountStore.account?.appliedLimitUsd).toBe(5.5);
  });

  it('refuses an agent turn that may exceed the remaining credits before calling the model', async () => {
    accountStore.account = existingAccount();
    spendUsd = 0.4;
    policy.estimate.mockReturnValue({ kind: 'range', maxCredits: 30 });
    const run = jest.fn();
    await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('low-balance'), run))
      .rejects.toMatchObject({ code: 'AI_BUDGET_INSUFFICIENT' });
    expect(run).not.toHaveBeenCalled();
    expect(accountStore.account?.activeRunId).toBeUndefined();
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
      unit: 'credits',
      limit: 400,
      spent: 125,
      remaining: 275,
      status: 'healthy',
    });
  });

  it('reports low allowance from rounded operation credits', async () => {
    accountStore.account = existingAccount(); spendUsd = .30;
    client.usage.mockResolvedValue({ spendUsd: .30, credits: 41 });
    expect(await service.statusCandidate('candidate-1')).toMatchObject({ spent: 41, remaining: 9, status: 'low' });
  });

  it.each([
    [0.123456789, 'healthy', 13, 37],
    [0.4, 'low', 40, 10],
    [0.495, 'exhausted', 50, 0],
    [0.500001, 'exhausted', 51, 0],
  ])(
    'normalizes authoritative spend %s as %s without exposing a secret',
    async (spend, expectedStatus, expectedSpent, expectedRemaining) => {
      accountStore.account = existingAccount();
      spendUsd = spend;

      const snapshot = await service.statusCandidate('candidate-1');

      expect(snapshot).toEqual({
        unit: 'credits',
        tier: 'FREE',
        limit: 50,
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
        unit: 'credits',
        tier: 'FREE',
        limit: 50,
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

  it('reconciles a restarted worker before its lease expires without erasing spend', async () => {
    accountStore.account = {
      ...existingAccount(), activeRunId: 'interrupted',
      runLockUntil: new Date(NOW.getTime() + 15 * 60 * 1000),
      runWorkerHost: budgetWorker.host, runWorkerPid: budgetWorker.pid,
      runWorkerId: 'previous-process-incarnation', runSandboxIds: [],
      runSpendBeforeUsd: .05, runCreditsBefore: 5,
    };
    await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('replacement'), async () => 'recovered')).resolves.toBe('recovered');
    expect(accountStore.account?.creditsUsed).toBe(10);
    expect(accountStore.account?.activeRunId).toBeUndefined();
  });

  it('does not steal another host or this live worker lease', async () => {
    for (const host of [budgetWorker.host, 'another-pod']) {
      accountStore.account = { ...existingAccount(), activeRunId: 'live',
        runLockUntil: new Date(NOW.getTime() + 15 * 60 * 1000),
        runWorkerHost: host, runWorkerPid: budgetWorker.pid, runWorkerId: budgetWorker.id,
      };
      await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('blocked'), async () => 'wrong')).rejects.toBeInstanceOf(AiBudgetOperationInProgressException);
    }
  });

  it('retains the operation lock while LiteLLM flushes its final usage batch', async () => {
    (service as any).waitForUsage.mockRestore();
    accountStore.account = existingAccount();
    let entered!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const operation = service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('flush'), async () => { entered(); });
    await ready;
    await jest.advanceTimersByTimeAsync(1_000);
    expect(accountStore.account?.activeRunId).toBe('flush');
    await jest.advanceTimersByTimeAsync(15_000);
    await operation;
    expect(accountStore.account?.activeRunId).toBeUndefined();
  });

  it('renews a long-running operation so another request cannot steal its lease', async () => {
    accountStore.account = existingAccount();
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    let finish!: () => void;
    const held = new Promise<void>(resolve => { finish = resolve; });
    const first = service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('long'), async () => { started(); await held; });
    await ready;
    await jest.advanceTimersByTimeAsync(16 * 60 * 1000);
    await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('second'), async () => 'wrong')).rejects.toBeInstanceOf(AiBudgetOperationInProgressException);
    finish();
    await first;
  });

  it('deducts whole credits once per logical run, rounding a sub-cent run up', async () => {
    accountStore.account = existingAccount();
    await service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('first'), async () => {
      spendUsd = 0.101;
      client.usage.mockResolvedValue({ spendUsd, credits: 11 });
      return 'first';
    });
    expect((await service.statusCandidate('candidate-1')).spent).toBe(11);

    await service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('second'), async () => {
      spendUsd = 0.102;
      client.usage.mockResolvedValue({ spendUsd, credits: 12 });
      return 'second';
    });
    expect((await service.statusCandidate('candidate-1')).spent).toBe(12);
    expect(accountStore.account?.creditsUsed).toBe(12);
  });

  it('assigns delayed spend to its original logical operation rather than the following run', async () => {
    accountStore.account = existingAccount();
    spendUsd = .06;
    client.usage.mockResolvedValue({ spendUsd: .06, credits: 6 });
    await service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('first'), async () => undefined);
    spendUsd = .07;
    client.usage.mockResolvedValue({ spendUsd: .07, credits: 7 });
    await service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('second'), async () => {
      spendUsd = .14;
      client.usage.mockResolvedValue({ spendUsd: .14, credits: 14 });
    });
    expect((await service.statusCandidate('candidate-1')).spent).toBe(14);
    expect(client.usage).toHaveBeenCalled();
  });

  it('settles provider spend even when the logical operation fails', async () => {
    accountStore.account = existingAccount();
    await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('failed'), async () => {
      spendUsd += 0.021;
      throw new Error('provider interrupted');
    })).rejects.toThrow('provider interrupted');
    expect((await service.statusCandidate('candidate-1')).spent).toBe(13);
  });

  it('does not write a stale balance during a read-only status request', async () => {
    accountStore.account = existingAccount();
    await service.ensureCandidateAccess('candidate-1');
    accountStore.model.updateOne.mockClear();
    await service.statusCandidate('candidate-1');
    expect(accountStore.model.updateOne).not.toHaveBeenCalled();
  });

  it('reports reconciliation pending when its completion marker cannot be saved', async () => {
    accountStore.account = existingAccount();
    const update = accountStore.model.updateOne.getMockImplementation()!;
    accountStore.model.updateOne.mockImplementation((filter: any, change: any) => {
      if (change.$set?.settlementPending) return { exec: async () => { throw new Error('database unavailable'); } } as any;
      return update(filter, change);
    });
    await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('marker-failed'), async () => 'saved result')).rejects.toMatchObject({ code: 'AI_USAGE_RECONCILING' });
    expect(accountStore.account?.activeRunId).toBe('marker-failed');
  });

  it('preserves unresolved settlement so another run cannot start unaccounted', async () => {
    accountStore.account = existingAccount();
    await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('pending'), async () => {
      infoFailure = true;
      return 'generated';
    })).rejects.toThrow();
    expect(accountStore.account?.activeRunId).toBe('pending');
    expect(accountStore.account?.settlementPending).toBe(true);
  });

  it('recovers a pending settlement once without losing per-operation rounding', async () => {
    accountStore.account = existingAccount();
    await expect(service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('recover'), async () => {
      spendUsd = 0.101;
      infoFailure = true;
    })).rejects.toThrow();
    infoFailure = false;
    expect((await service.statusCandidate('candidate-1')).spent).toBe(11);
    expect((await service.statusCandidate('candidate-1')).spent).toBe(11);
    expect(accountStore.account?.activeRunId).toBeUndefined();
  });

  it('uses the new period spend when a run crosses the monthly reset', async () => {
    accountStore.account = existingAccount();
    await service.withCandidateLease('candidate-1', 'resume_agent_turn', attribution('reset'), async () => {
      client.info.mockResolvedValue({ spendUsd: 0.015, limitUsd: 0.5, resetAt: new Date('2026-11-01T00:00:00Z') });
      client.usage.mockResolvedValue({ spendUsd: 0.015, credits: 2 });
    });
    expect((await service.statusCandidate('candidate-1')).spent).toBe(2);
  });

  it('creates an employer key and allowance without consulting the candidate tier', async () => {
    (service as any).employerBilling = { getOrCreateSubscription: jest.fn().mockResolvedValue({ plan: 'free' }) };
    client.info.mockResolvedValue({ spendUsd: 0, limitUsd: 1 });
    await (service as any).ensureOwnerAccess('employer', 'employer-1');
    expect(modelAliases.tierFor).not.toHaveBeenCalled();
    expect(client.generate).toHaveBeenCalledWith(expect.objectContaining({
      ownerType: 'employer', ownerId: 'employer-1', pool: 'employer-ai', maxBudgetUsd: 1,
    }));
    expect(accountStore.model.findOne).toHaveBeenCalledWith({ ownerType: 'employer', ownerId: 'employer-1' });
  });

  it('keeps both workspace pools separate for the same user', async () => {
    const accounts = new Map<string, any>();
    const limits = new Map<string, number>();
    const spent = new Map<string, number>();
    const query = (read: () => any) => ({ select: () => ({ exec: async () => read() }), exec: async () => read() });
    const model = {
      findOne: jest.fn((filter: any) => query(() => accounts.get(filter.ownerType + ':' + filter.ownerId) || null)),
      create: jest.fn(async (value: any) => {
        const account = { _id: value.keyAlias, ...value };
        accounts.set(value.keyAlias, account);
        return account;
      }),
      updateOne: jest.fn((filter: any, update: any) => query(() => {
        Object.assign(accounts.get(filter._id), update.$set);
        return { modifiedCount: 1 };
      })),
    };
    client.generate.mockImplementation(async (options: any) => {
      limits.set(options.keyAlias, options.maxBudgetUsd);
      return { key: options.keyAlias, keyId: options.keyAlias };
    });
    client.update.mockImplementation(async (key: string, options: any) => { limits.set(key, options.maxBudgetUsd); });
    client.info.mockImplementation(async (key: string) => ({ limitUsd: limits.get(key), spendUsd: (spent.get(key) || 0) / 100, resetAt: new Date('2026-10-01T00:00:00.000Z') }));
    client.usage.mockImplementation(async (key: string) => ({ spendUsd: (spent.get(key) || 0) / 100, credits: spent.get(key) || 0 }));
    service = new AiBudgetService(model as any, policy, client, codec, modelAliases, { getOrCreateSubscription: jest.fn().mockResolvedValue({ plan: 'free' }) } as any);

    expect(await service.statusCandidate('same-user')).toMatchObject({ limit: 50, remaining: 50 });
    expect(await service.statusOwner('employer', 'same-user')).toMatchObject({ limit: 100, remaining: 100 });
    expect(accounts.size).toBe(2);
    spent.set('candidate:same-user', 5);
    expect(await service.statusCandidate('same-user')).toMatchObject({ limit: 50, spent: 5, remaining: 45 });
    expect(await service.statusOwner('employer', 'same-user')).toMatchObject({ limit: 100, spent: 0, remaining: 100 });
    spent.set('employer:same-user', 50);
    expect(await service.statusOwner('employer', 'same-user')).toMatchObject({ limit: 100, remaining: 50 });
    expect(await service.statusCandidate('same-user')).toMatchObject({ remaining: 45 });
  });

  it('keeps the employer allowance when management is temporarily unavailable', async () => {
    infoFailure = true;
    expect(await service.statusOwner('employer', 'employer-1')).toMatchObject({ limit: 100, remaining: 0, status: 'unavailable' });
  });

  it('revokes a losing provisioning key and reuses the concurrently created account', async () => {
    const winning = existingAccount();
    const q = (value: any) => ({ select: () => ({ exec: async () => value }) });
    accountStore.model.findOne.mockReturnValueOnce(q(null) as any).mockReturnValue(q(winning) as any);
    accountStore.model.create.mockRejectedValueOnce({ code: 11000 });
    const access = await service.ensureCandidateAccess('candidate-1');
    expect(access.apiKey).toBe('sk-existing');
    expect(client.revoke).toHaveBeenCalledWith('sk-candidate-1');
    expect(client.generate).toHaveBeenCalledTimes(1);
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
    findOne: jest.fn(() => query(() => account ? structuredClone(account) : null)),
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
        return structuredClone(account);
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
