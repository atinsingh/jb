import { createHash } from 'crypto';
import { Types } from 'mongoose';
import { EmployerAtsRuntimeService } from './employer-ats-runtime.service';

const OWNER = '64b000000000000000000001';
const q = (value: any) => ({
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('EmployerAtsRuntimeService', () => {
  const runtimeModel = {
    updateOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const usageModel = { updateOne: jest.fn() };
  const billing = { getOrCreateSubscription: jest.fn() };
  const aliases = {
    listForTier: jest.fn(),
    resolveAutomaticForTier: jest.fn(),
  };
  const keys = {
    generate: jest.fn(),
    update: jest.fn(),
    info: jest.fn(),
    spendLogs: jest.fn(),
  };
  const sandbox = {
    provision: jest.fn(),
    exec: jest.fn(),
    destroy: jest.fn(),
  };
  const secrets = {
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
    decrypt: jest.fn((value: string) => value.replace('encrypted:', '')),
  };
  const budget = { ensureOwnerAccess: jest.fn(), statusOwner: jest.fn() };
  let service: EmployerAtsRuntimeService;

  const account = (overrides: any = {}) => ({
    ownerId: new Types.ObjectId(OWNER),
    ownerType: 'employer',
    plan: 'free',
    modelTier: 'FREE',
    models: ['bedrock/nova-2-lite/low'],
    maxBudgetUsd: 1,
    keyAlias: `jobocate-employer-${OWNER}`,
    encryptedKey: 'encrypted:sk-employer-only',
    keyHash: createHash('sha256').update('sk-employer-only').digest('hex'),
    sandboxKeyHash: createHash('sha256').update('sk-employer-only').digest('hex'),
    sandboxLeaseId: 'page-lease-1',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    keys.info.mockReset();
    keys.spendLogs.mockReset();
    runtimeModel.updateOne.mockReturnValue(q({ modifiedCount: 1 }));
    runtimeModel.findOne.mockReturnValue(q(account({ sandboxId: 'employer-box-1' })));
    runtimeModel.findOneAndUpdate.mockReturnValue(q(account({ sandboxId: 'employer-box-1' })));
    usageModel.updateOne.mockReturnValue(q({ modifiedCount: 1, upsertedCount: 1 }));
    billing.getOrCreateSubscription.mockResolvedValue({ plan: 'free' });
    aliases.listForTier.mockResolvedValue([
      {
        alias: 'bedrock/nova-2-lite/low',
        provider: 'bedrock',
        model: 'nova-2-lite',
        effort: 'low',
        tier: 'FREE',
      },
    ]);
    aliases.resolveAutomaticForTier.mockResolvedValue({
      alias: 'bedrock/nova-2-lite/low',
      provider: 'bedrock',
      model: 'nova-2-lite',
      effort: 'low',
      tier: 'FREE',
    });
    keys.info.mockResolvedValue({
      spendUsd: 0.25,
      limitUsd: 1,
      resetAt: new Date('2026-10-01T00:00:00Z'),
    });
    keys.spendLogs.mockResolvedValue([]);
    sandbox.exec.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    sandbox.provision.mockResolvedValue({ sandboxId: 'employer-box-1' });
    sandbox.destroy.mockResolvedValue(undefined);
    budget.ensureOwnerAccess.mockResolvedValue({ apiKey: 'sk-employer-only', keyAlias: 'jobocate-employer-' + OWNER,
      snapshot: { tier: 'FREE', limit: 100, spent: 25, remaining: 75, resetAt: '2026-10-01T00:00:00Z' } });
    budget.statusOwner.mockResolvedValue({ tier: 'FREE', limit: 100, spent: 25, remaining: 75, status: 'healthy', resetAt: '2026-10-01T00:00:00Z' });
    service = new EmployerAtsRuntimeService(
      runtimeModel as any,
      usageModel as any,
      billing as any,
      aliases as any,
      keys as any,
      sandbox as any,
      secrets as any,
      budget as any,
    );
    jest.spyOn(service as any, 'waitForUsage').mockResolvedValue(undefined);
  });

  it('scopes every runtime lookup to the employer owner type and reuses its existing sandbox', async () => {
    const first = await service.prepare(OWNER, 'run-1');
    await service.finish(first as any, { succeeded: true });
    const second = await service.prepare(OWNER, 'run-2');

    expect(first).toEqual(
      expect.objectContaining({
        status: 'READY',
        sandboxId: 'employer-box-1',
        alias: 'bedrock/nova-2-lite/low',
        effort: 'low',
      }),
    );
    expect(second).toEqual(expect.objectContaining({ sandboxId: 'employer-box-1' }));
    expect(runtimeModel.findOne).toHaveBeenCalledWith({
      ownerId: new Types.ObjectId(OWNER),
      ownerType: 'employer',
    });
    expect(sandbox.provision).not.toHaveBeenCalled();
    expect(keys.generate).not.toHaveBeenCalled();
  });

  it('returns RUNNING before key or provider work when another logical run owns the lock', async () => {
    runtimeModel.findOneAndUpdate.mockReturnValueOnce(q(null));

    const result = await service.prepare(OWNER, 'run-2');

    expect(result).toEqual(
      expect.objectContaining({ status: 'RUNNING', reason: 'EMPLOYER_ATS_RUN_IN_PROGRESS' }),
    );
    expect(keys.info).not.toHaveBeenCalled();
    expect(sandbox.destroy).not.toHaveBeenCalled();
  });

  it('blocks provider dispatch at the authoritative LiteLLM limit while preserving budget details', async () => {
    keys.info.mockResolvedValue({
      spendUsd: 1,
      limitUsd: 1,
      resetAt: new Date('2026-10-01T00:00:00Z'),
    });

    const result = await service.prepare(OWNER, 'run-budget');

    expect(result).toEqual({
      status: 'BUDGET_EXHAUSTED',
      reason: 'EMPLOYER_BUDGET_EXHAUSTED',
      limitCredits: 100,
      spentCredits: 100,
      remainingCredits: 0,
      period: 'monthly',
      resetAt: new Date('2026-10-01T00:00:00Z'),
    });
    expect(sandbox.provision).not.toHaveBeenCalled();
  });

  it('provisions one employer sandbox with only the employer virtual key when none exists', async () => {
    runtimeModel.findOne.mockReturnValue(q(account({ sandboxId: undefined })));
    runtimeModel.findOneAndUpdate
      .mockReturnValueOnce(q(account({ sandboxId: undefined })))
      .mockReturnValueOnce(q(account({ sandboxId: undefined })));

    const result = await service.prepare(OWNER, 'run-new-box');

    expect(result).toEqual(expect.objectContaining({ status: 'READY', sandboxId: 'employer-box-1' }));
    expect(sandbox.provision).toHaveBeenCalledTimes(1);
    expect(sandbox.provision).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: `employer-${OWNER}`,
        harness: 'ats',
        env: expect.objectContaining({ JOBOCATE_LITELLM_API_KEY: 'sk-employer-only' }),
      }),
    );
    expect(JSON.stringify(sandbox.provision.mock.calls)).not.toContain('candidate');
  });

  it('prewarms an employer sandbox without starting an assessment run', async () => {
    runtimeModel.findOne.mockReturnValue(q(account({ sandboxId: undefined })));
    runtimeModel.findOneAndUpdate.mockReturnValue(q(account({ sandboxId: undefined })));

    const result = await (service as any).acquireSandbox(OWNER, 'page-lease-1');

    expect(result).toEqual({ ready: true, sandboxId: 'employer-box-1' });
    expect(sandbox.provision).toHaveBeenCalledTimes(1);
    expect(runtimeModel.updateOne.mock.calls).not.toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.anything(),
          expect.objectContaining({ $set: expect.objectContaining({ activeRunId: expect.anything() }) }),
        ]),
      ]),
    );
  });

  it('reads the shared employer credit account used by every employer model feature', async () => {
    const budget = { statusOwner: jest.fn().mockResolvedValue({ tier: 'FREE', limit: 100, spent: 41, remaining: 59, status: 'healthy', resetAt: '2026-10-01T00:00:00Z' }) };
    (service as any).budget = budget;
    expect(await service.budgetStatus(OWNER)).toMatchObject({ limitCredits: 100, spentCredits: 41, remainingCredits: 59 });
    expect(budget.statusOwner).toHaveBeenCalledWith('employer', OWNER);
  });

  it('waits for the final usage batch rather than recording a partial request total', async () => {
    jest.useFakeTimers();
    (service as any).waitForUsage.mockRestore();
    try {
      const prepared: any = await service.prepare(OWNER, 'delayed-batch');
      keys.spendLogs.mockResolvedValue([{ keyAlias: prepared.keyAlias, requestId: 'first', costUsd: 0.004 }]);
      let result: any;
      const pending = service.finish(prepared, { succeeded: true }).then(value => { result = value; });
      await jest.advanceTimersByTimeAsync(1000);
      expect(result).toBeUndefined();
      keys.spendLogs.mockResolvedValue([
        { keyAlias: prepared.keyAlias, requestId: 'first', costUsd: 0.004 },
        { keyAlias: prepared.keyAlias, requestId: 'second', costUsd: 0.003 },
      ]);
      await jest.advanceTimersByTimeAsync(15000);
      await pending;
      expect(result).toEqual({ costUsd: 0.007, requestIds: ['first', 'second'] });
    } finally { jest.useRealTimers(); }
  });

  it('does not maintain a second rounded balance in the ATS runtime', async () => {
    const prepared = await service.prepare(OWNER, 'subcent-run');
    await service.finish(prepared as any, { succeeded: true });
    expect(runtimeModel.updateOne.mock.calls.some(([, update]) => update.$set?.creditsUsed !== undefined)).toBe(false);
  });

  it('can read the shared balance while the first sandbox is provisioning', async () => {
    let startProvisioning!: () => void;
    let completeProvisioning!: () => void;
    const started = new Promise<void>((resolve) => { startProvisioning = resolve; });
    const provisioned = new Promise<void>((resolve) => { completeProvisioning = resolve; });
    let provisioning = false;
    const configured = {
      account: account({ sandboxId: 'employer-box-1' }),
      alias: { alias: 'bedrock/nova-2-lite/low', provider: 'bedrock', effort: 'low' },
      maxBudgetUsd: 1,
    };
    const ensureAccount = jest.spyOn(service as any, 'ensureAccount').mockImplementation(async () => {
      if (provisioning) throw new Error('Employer ATS key provisioning is in progress');
      provisioning = true;
      startProvisioning();
      await provisioned;
      provisioning = false;
      return configured;
    });

    const acquire = service.acquireSandbox(OWNER, 'page-lease-1');
    await started;
    const budget = service.budgetStatus(OWNER);
    completeProvisioning();

    await expect(acquire).resolves.toEqual({ ready: true, sandboxId: 'employer-box-1' });
    await expect(budget).resolves.toEqual(expect.objectContaining({ status: 'READY' }));
    expect(ensureAccount).toHaveBeenCalledTimes(1);
  });

  it('reaps an idle ATS sandbox but leaves an active assessment running', async () => {
    const now = new Date('2026-09-17T18:00:00Z');
    const idle = account({ sandboxId: 'idle-box', updatedAt: new Date('2026-09-17T17:40:00Z') });
    const active = account({ sandboxId: 'active-box', activeRunId: 'run-1', updatedAt: new Date('2026-09-17T17:40:00Z') });
    runtimeModel.find.mockReturnValue(q([idle, active]));
    runtimeModel.findOne
      .mockReturnValueOnce(q(idle))
      .mockReturnValueOnce(q(active));

    await expect(service.reapIdleSandboxes(now)).resolves.toBe(1);

    expect(sandbox.destroy).toHaveBeenCalledTimes(1);
    expect(sandbox.destroy).toHaveBeenCalledWith('idle-box');
    expect(runtimeModel.updateOne).toHaveBeenCalledWith(
      { ownerId: idle.ownerId, ownerType: 'employer', sandboxId: 'idle-box' },
      { $unset: { sandboxId: 1, sandboxLeaseId: 1 } },
    );
  });

  it('keeps a newly provisioned sandbox when its page releases during startup', async () => {
    let provisionStarted!: () => void;
    const started = new Promise<void>((resolve) => { provisionStarted = resolve; });
    let finishProvision!: (value: { sandboxId: string }) => void;
    let currentSandboxId: string | undefined;
    sandbox.provision.mockImplementationOnce(() => new Promise((resolve) => {
      finishProvision = (value) => {
        currentSandboxId = value.sandboxId;
        resolve(value);
      };
      provisionStarted();
    }));
    runtimeModel.findOne.mockImplementation(() => q(account({ sandboxId: currentSandboxId })));
    runtimeModel.findOneAndUpdate.mockReturnValue(q(account({ sandboxId: undefined })));

    const acquiring = service.acquireSandbox(OWNER, 'page-lease-1');
    await started;
    const releasing = service.releaseSandbox(OWNER, 'page-lease-1');
    finishProvision({ sandboxId: 'employer-box-1' });

    await expect(acquiring).resolves.toEqual({ ready: true, sandboxId: 'employer-box-1' });
    await expect(releasing).resolves.toEqual({ released: true });
    expect(sandbox.provision).toHaveBeenCalledTimes(1);
    expect(sandbox.destroy).not.toHaveBeenCalled();
  });

  it('uses the common owner key without creating another ATS key', async () => {
    const result = await service.prepare(OWNER, 'shared-key');
    expect(result).toMatchObject({ status: 'READY', virtualKey: 'sk-employer-only' });
    expect(budget.ensureOwnerAccess).toHaveBeenCalledWith('employer', OWNER);
    expect(keys.generate).not.toHaveBeenCalled();
    expect(JSON.stringify(runtimeModel.updateOne.mock.calls)).not.toContain('sk-employer-only');
  });

  it('resolves the automatic alias against the current employer tier', async () => {
    budget.ensureOwnerAccess.mockResolvedValue({ apiKey: 'sk-employer-only', keyAlias: 'jobocate-employer-' + OWNER,
      snapshot: { tier: 'PRO', limit: 400, spent: 25, remaining: 375, resetAt: '2026-10-01T00:00:00Z' } });
    await service.prepare(OWNER, 'upgraded');
    expect(aliases.resolveAutomaticForTier).toHaveBeenCalledWith('PRO');
    expect(keys.update).not.toHaveBeenCalled();
  });

  it('records only the actual LiteLLM spend delta once for a logical run', async () => {
    keys.info
      .mockResolvedValueOnce({ spendUsd: 0.25, limitUsd: 1 })
      .mockResolvedValueOnce({ spendUsd: 0.31, limitUsd: 1 });
    keys.spendLogs.mockResolvedValue([
      {
        requestId: 'chatcmpl-employer-1',
        keyAlias: `jobocate-employer-${OWNER}`,
        model: 'bedrock/nova-2-lite/low',
        costUsd: 0.06,
        promptTokens: 20,
        completionTokens: 10,
      },
    ]);
    const prepared = await service.prepare(OWNER, 'run-cost');

    const result = await service.finish(prepared as any, { succeeded: false });

    expect(result).toEqual({ costUsd: 0.06, requestIds: ['chatcmpl-employer-1'] });
    expect(usageModel.updateOne).toHaveBeenCalledWith(
      {
        userId: new Types.ObjectId(OWNER),
        feature: 'employerAts',
        requestId: 'ats:run-cost',
      },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          cost: 0.06,
          metadata: expect.objectContaining({
            ownerType: 'employer',
            harness: 'ats',
            logicalRunId: 'run-cost',
            litellmRequestIds: ['chatcmpl-employer-1'],
            succeeded: false,
          }),
        }),
      }),
      { upsert: true },
    );
  });

  it('waits briefly for LiteLLM to publish the authoritative spend delta', async () => {
    keys.info
      .mockResolvedValueOnce({ spendUsd: 0.25, limitUsd: 1 })
      .mockResolvedValueOnce({ spendUsd: 0.25, limitUsd: 1 })
      .mockResolvedValueOnce({ spendUsd: 0.25, limitUsd: 1 })
      .mockResolvedValueOnce({ spendUsd: 0.28, limitUsd: 1 });
    keys.spendLogs
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          requestId: 'chatcmpl-eventual',
          keyAlias: `jobocate-employer-${OWNER}`,
          costUsd: 0.03,
        },
      ]);
    const prepared = await service.prepare(OWNER, 'run-eventual-spend');

    const result = await service.finish(prepared as any, { succeeded: true });

    expect(result.costUsd).toBe(0.03);
    expect(keys.info).toHaveBeenCalledTimes(4);
  });

  it('releases the logical run lock when sandbox preparation fails', async () => {
    runtimeModel.findOne.mockReturnValue(q(account({ sandboxId: undefined })));
    runtimeModel.findOneAndUpdate
      .mockReturnValueOnce(q(account({ sandboxId: undefined })))
      .mockReturnValueOnce(q(account({ sandboxId: undefined })));
    sandbox.provision.mockRejectedValueOnce(new Error('sandbox unavailable'));

    await expect(service.prepare(OWNER, 'run-failed-box')).rejects.toThrow(
      'sandbox unavailable',
    );

    expect(runtimeModel.updateOne).toHaveBeenCalledWith(
      {
        ownerId: new Types.ObjectId(OWNER),
        ownerType: 'employer',
        activeRunId: 'run-failed-box',
      },
      { $unset: { activeRunId: 1, runLockUntil: 1 } },
    );
  });

  it('releases the logical run lock even when usage persistence fails', async () => {
    keys.info
      .mockResolvedValueOnce({ spendUsd: 0.25, limitUsd: 1 })
      .mockResolvedValueOnce({ spendUsd: 0.3, limitUsd: 1 });
    keys.spendLogs.mockResolvedValueOnce([
      {
        requestId: 'chatcmpl-usage-write',
        keyAlias: `jobocate-employer-${OWNER}`,
        costUsd: 0.05,
      },
    ]);
    usageModel.updateOne.mockReturnValueOnce({
      exec: jest.fn().mockRejectedValue(new Error('usage write failed')),
    });
    const prepared = await service.prepare(OWNER, 'run-usage-failure');

    await expect(
      service.finish(prepared as any, { succeeded: true }),
    ).rejects.toThrow('usage write failed');

    expect(runtimeModel.updateOne).toHaveBeenCalledWith(
      {
        ownerId: new Types.ObjectId(OWNER),
        ownerType: 'employer',
        activeRunId: 'run-usage-failure',
      },
      {
        $unset: { activeRunId: 1, runLockUntil: 1 },
      },
    );
  });

  it('releases a page lease while retaining its warm sandbox for the next preview', async () => {
    await service.releaseSandbox(OWNER, 'page-lease-1');
    const next = await service.prepare(OWNER, 'next-preview');

    expect(next).toEqual(expect.objectContaining({ status: 'READY', sandboxId: 'employer-box-1' }));
    expect(sandbox.destroy).not.toHaveBeenCalled();
    expect(sandbox.provision).not.toHaveBeenCalled();
    expect(runtimeModel.updateOne).toHaveBeenCalledWith(
      {
        ownerId: new Types.ObjectId(OWNER),
        ownerType: 'employer',
        sandboxLeaseId: 'page-lease-1',
      },
      { $unset: { sandboxLeaseId: 1 } },
    );
  });

  it('does not let an old page release the current page sandbox', async () => {
    runtimeModel.findOne.mockReturnValue(
      q(account({ sandboxId: 'employer-box-1', sandboxLeaseId: 'new-page' })),
    );

    const result = await (service as any).releaseSandbox(OWNER, 'old-page');

    expect(result).toEqual({ released: false });
    expect(sandbox.destroy).not.toHaveBeenCalled();
  });

  it('keeps an active preview running when its page lease is released', async () => {
    runtimeModel.findOne.mockReturnValue(
      q(account({ sandboxId: 'employer-box-1', activeRunId: 'run-live' })),
    );

    await service.releaseSandbox(OWNER, 'page-lease-1');

    expect(sandbox.destroy).not.toHaveBeenCalled();
    expect(runtimeModel.updateOne).toHaveBeenCalledWith(
      {
        ownerId: new Types.ObjectId(OWNER),
        ownerType: 'employer',
        sandboxLeaseId: 'page-lease-1',
      },
      { $unset: { sandboxLeaseId: 1 } },
    );
  });

  it('reclaims a leftover lock when the previous sandbox is already gone', async () => {
    runtimeModel.findOneAndUpdate
      .mockReturnValueOnce(q(null))
      .mockReturnValueOnce(q(account({ sandboxId: 'employer-box-1' })));
    runtimeModel.findOne.mockReturnValue(
      q(
        account({
          sandboxId: undefined,
          activeRunId: 'run-stale',
          interruptedRunId: 'run-stale',
        }),
      ),
    );

    const result = await service.prepare(OWNER, 'run-retry');

    expect(result).toEqual(expect.objectContaining({ status: 'READY' }));
    expect(runtimeModel.updateOne).toHaveBeenCalledWith(
      {
        ownerId: new Types.ObjectId(OWNER),
        ownerType: 'employer',
        activeRunId: 'run-stale',
      },
      { $unset: { activeRunId: 1, runLockUntil: 1 } },
    );
    expect(keys.info).toHaveBeenCalled();
  });

  it('reclaims a locked run and replaces its stopped sandbox', async () => {
    const stale = account({
      sandboxId: 'employer-box-1',
      activeRunId: 'run-stale',
      runLockUntil: new Date(Date.now() + 60_000),
    });
    runtimeModel.findOne.mockReturnValue(q(stale));
    runtimeModel.findOneAndUpdate
      .mockReturnValueOnce(q(null))
      .mockReturnValueOnce(q(stale))
      .mockReturnValueOnce(q(stale));
    sandbox.exec.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Error response from daemon: container employer-box-1 is not running',
    });

    const result = await service.prepare(OWNER, 'run-retry');

    expect(result).toEqual(expect.objectContaining({ status: 'READY' }));
    expect(sandbox.destroy).toHaveBeenCalledWith('employer-box-1');
    expect(sandbox.destroy.mock.invocationCallOrder[0]).toBeLessThan(
      sandbox.provision.mock.invocationCallOrder[0],
    );
  });

  it('reports whether a live run was interrupted by a client sandbox release', async () => {
    runtimeModel.findOne.mockReturnValue(
      q(account({ interruptedRunId: 'run-live' })),
    );

    await expect(service.wasReleasedDuring(OWNER, 'run-live')).resolves.toBe(
      true,
    );
    await expect(service.wasReleasedDuring(OWNER, 'other-run')).resolves.toBe(
      false,
    );
  });
});
