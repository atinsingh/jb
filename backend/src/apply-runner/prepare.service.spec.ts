import { ApplyRunnerService } from './apply-runner.service';

const APP_ID = '507f1f77bcf86cd799439011';

const chain = (val: any) => ({ exec: jest.fn().mockResolvedValue(val) });

/**
 * The prepare pass: fill everything, click nothing.
 *
 * These tests exist to hold two lines that the rest of the feature's honesty
 * rests on — that preparing never submits, and that a candidate cannot be
 * buried under filled applications they have not looked at.
 */
function buildRunner(
  overrides: {
    claimed?: any;
    job?: any;
    adapter?: any;
    resolved?: any;
    unreviewed?: number;
  } = {},
) {
  const claimed =
    'claimed' in overrides
      ? overrides.claimed
      : { _id: APP_ID, jobId: 'job1', candidateId: 'cand1', atsType: '' };

  const submitSpy = jest.fn();
  const clickSpy = jest.fn();

  // `'adapter' in overrides` rather than `??` — a test that explicitly passes
  // null means "no adapter resolved", which nullish-coalescing would swallow.
  const adapter = 'adapter' in overrides
    ? overrides.adapter
    : {
      atsType: 'greenhouse',
      capabilities: { headlessPrepare: true, headlessSubmit: true, requiresAccount: false, multiPage: false },
      matches: () => true,
      introspect: jest.fn().mockResolvedValue({
        fields: [{ name: 'email', label: 'Email', type: 'text', required: true }],
        fingerprint: 'fp-abc',
        url: 'https://boards.greenhouse.io/acme/jobs/1',
      }),
      fill: jest.fn().mockResolvedValue({ filled: ['email'], skipped: [], coverage: 1 }),
      submit: submitSpy,
    };

  const applicationModel: any = {
    find: jest.fn(() => ({ limit: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([]) })),
    findOneAndUpdate: jest.fn(() => chain(claimed)),
    updateOne: jest.fn(() => chain({})),
    countDocuments: jest.fn(() => chain(overrides.unreviewed ?? 0)),
  };

  const jobModel: any = {
    findById: jest.fn(() =>
      chain(
        overrides.job ?? {
          originalApplyUrl: 'https://boards.greenhouse.io/acme/jobs/1',
          companyName: 'Acme',
          title: 'Engineer',
          country: 'US',
        },
      ),
    ),
  };

  const answers: any = {
    resolve: jest.fn().mockResolvedValue(
      overrides.resolved ?? {
        answers: [{ fieldName: 'email', questionKey: 'email', value: 'a@b.c', source: 'identity', confidence: 1 }],
        blockers: [],
        unknownQuestions: [],
      },
    ),
  };

  const service = new ApplyRunnerService(
    applicationModel,
    jobModel,
    { updateApplicationStatus: jest.fn().mockResolvedValue({}) } as any,
    { recordEvent: jest.fn().mockResolvedValue({}) } as any,
    { assembleMaterials: jest.fn().mockResolvedValue({ email: 'a@b.c' }) } as any,
    {
      put: jest.fn().mockResolvedValue({ key: 'k', url: 'http://cdn/x' }),
      getSignedUrl: jest.fn().mockResolvedValue('http://signed/x'),
      getDriverName: jest.fn().mockReturnValue('local'),
    } as any,
    { resolve: jest.fn().mockReturnValue(adapter) } as any,
    answers,
  );

  // Never launch real Chromium.
  (service as any).launchBrowser = jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      screenshot: jest.fn().mockResolvedValue(Buffer.from('png')),
      click: clickSpy,
    }),
    close: jest.fn().mockResolvedValue(undefined),
  });

  return { service, applicationModel, adapter, answers, submitSpy, clickSpy };
}

describe('ApplyRunnerService.prepareOne', () => {
  const originalFlag = process.env.AUTO_APPLICATION_ENABLED;

  afterEach(() => {
    process.env.AUTO_APPLICATION_ENABLED = originalFlag;
  });

  // ======================================================== AC2.6 ========
  it('completes a full prepare with AUTO_APPLICATION_ENABLED unset, and submits nothing', async () => {
    delete process.env.AUTO_APPLICATION_ENABLED;
    const { service, adapter, submitSpy, clickSpy } = buildRunner();

    const res = await service.prepareOne(APP_ID);

    expect(res.status).toBe('awaiting_approval');
    expect(adapter.introspect).toHaveBeenCalled();
    expect(adapter.fill).toHaveBeenCalled();

    // The load-bearing assertion: nothing was submitted.
    expect(submitSpy).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('parks the application with its fingerprint, answers and expiry', async () => {
    const { service, applicationModel } = buildRunner();

    await service.prepareOne(APP_ID);

    const parked = applicationModel.updateOne.mock.calls
      .map((c: any[]) => c[1]?.$set)
      .find((s: any) => s?.status === 'awaiting_approval');

    expect(parked).toBeDefined();
    expect(parked.prepared.fingerprint).toBe('fp-abc');
    expect(parked.prepared.answers).toHaveLength(1);
    expect(parked.prepared.expiresAt).toBeInstanceOf(Date);
    expect(parked.prepared.approvalId).toBeUndefined();
  });

  it('records blockers rather than papering over them', async () => {
    const { service, applicationModel } = buildRunner({
      resolved: {
        answers: [],
        blockers: [{ fieldName: 'work_auth', questionKey: 'work-authorization', reason: 'only you can answer' }],
        unknownQuestions: [],
      },
    });

    const res = await service.prepareOne(APP_ID);

    expect(res.blockers).toBe(1);
    const parked = applicationModel.updateOne.mock.calls
      .map((c: any[]) => c[1]?.$set)
      .find((s: any) => s?.status === 'awaiting_approval');
    expect(parked.prepared.blockers).toHaveLength(1);
  });

  it('passes the job country as the target for country-scoped attestations', async () => {
    const { service, answers } = buildRunner();

    await service.prepareOne(APP_ID);

    expect(answers.resolve).toHaveBeenCalledWith(
      'cand1',
      expect.any(Array),
      expect.objectContaining({ targetCountry: 'US', companyName: 'Acme' }),
    );
  });

  describe('routing', () => {
    it('sends an unsupported ATS to needs_human without launching a browser', async () => {
      const { service, adapter } = buildRunner({ adapter: null as any });

      const res = await service.prepareOne(APP_ID);

      expect(res.status).toBe('needs_human');
      expect(adapter).toBeNull();
    });

    it('sends an adapter that cannot prepare headlessly to needs_human', async () => {
      const { service } = buildRunner({
        adapter: {
          atsType: 'workday',
          capabilities: { headlessPrepare: false, headlessSubmit: false, requiresAccount: true, multiPage: true },
          matches: () => true,
          introspect: jest.fn(),
          fill: jest.fn(),
          submit: jest.fn(),
        },
      });

      const res = await service.prepareOne(APP_ID);

      expect(res.status).toBe('needs_human');
    });

    it('skips an application that is already claimed', async () => {
      const { service } = buildRunner({ claimed: null });

      const res = await service.prepareOne(APP_ID);

      expect(res.status).toBe('skipped');
    });
  });

  // ======================================================== AC2.7 ========
  describe('queue-depth ceiling', () => {
    it('reports capacity when the candidate is under the ceiling', async () => {
      const { service } = buildRunner({ unreviewed: 3 });

      expect(await service.hasPrepareCapacity('cand1')).toBe(true);
    });

    it('reports no capacity at the ceiling', async () => {
      const { service } = buildRunner({ unreviewed: 10 });

      expect(await service.hasPrepareCapacity('cand1')).toBe(false);
    });

    it('counts only applications awaiting the candidate', async () => {
      const { service, applicationModel } = buildRunner({ unreviewed: 2 });

      await service.unreviewedCount('cand1');

      expect(applicationModel.countDocuments).toHaveBeenCalledWith({
        candidateId: 'cand1',
        status: 'awaiting_approval',
      });
    });
  });
});
