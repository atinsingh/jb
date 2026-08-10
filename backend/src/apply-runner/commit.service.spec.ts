import { ApplyRunnerService } from './apply-runner.service';

const APP_ID = '507f1f77bcf86cd799439011';

const chain = (val: any) => ({ exec: jest.fn().mockResolvedValue(val) });
const future = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const past = () => new Date(Date.now() - 60 * 1000);

/**
 * The commit pass: re-drive the form, prove nothing changed, then submit.
 *
 * These tests hold the four conditions that must ALL be true before anything is
 * sent in a candidate's name. Each one exists because violating it produces a
 * specific, unrecoverable harm: submitting without consent, submitting an
 * answer the candidate never saw, submitting twice, or submitting into a form
 * that has since changed.
 */
function build(
  overrides: {
    claimed?: any;
    fingerprint?: string;
    adapter?: any;
    submitResult?: any;
    coverage?: number;
  } = {},
) {
  const claimed =
    'claimed' in overrides
      ? overrides.claimed
      : {
          _id: APP_ID,
          jobId: 'job1',
          candidateId: 'cand1',
          atsType: 'greenhouse',
          prepared: {
            fingerprint: 'fp-approved',
            approvalId: 'approval-1',
            expiresAt: future(),
            answers: [{ fieldName: 'email', value: 'a@b.c' }],
          },
        };

  const submitSpy = jest.fn().mockResolvedValue(
    overrides.submitResult ?? { ok: true, screenshots: [], confirmationText: 'Thanks!' },
  );

  const adapter =
    'adapter' in overrides
      ? overrides.adapter
      : {
          atsType: 'greenhouse',
          capabilities: {
            headlessPrepare: true,
            headlessSubmit: true,
            requiresAccount: false,
            multiPage: false,
          },
          matches: () => true,
          introspect: jest.fn().mockResolvedValue({
            fields: [],
            fingerprint: overrides.fingerprint ?? 'fp-approved',
            url: 'https://boards.greenhouse.io/acme/jobs/1',
          }),
          fill: jest
            .fn()
            .mockResolvedValue({ filled: ['email'], skipped: [], coverage: overrides.coverage ?? 1 }),
          submit: submitSpy,
        };

  const applicationModel: any = {
    find: jest.fn(() => ({ limit: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([]) })),
    findOneAndUpdate: jest.fn(() => chain(claimed)),
    updateOne: jest.fn(() => chain({})),
    countDocuments: jest.fn(() => chain(0)),
  };

  const jobModel: any = {
    findById: jest.fn(() => chain({ originalApplyUrl: 'https://boards.greenhouse.io/acme/jobs/1' })),
  };

  const applicationsService: any = { updateApplicationStatus: jest.fn().mockResolvedValue({}) };
  const events: any = { recordEvent: jest.fn().mockResolvedValue({}) };

  const service = new ApplyRunnerService(
    applicationModel,
    jobModel,
    applicationsService,
    events,
    { assembleMaterials: jest.fn().mockResolvedValue({}) } as any,
    {
      put: jest.fn().mockResolvedValue({ key: 'k', url: 'http://cdn/x' }),
      getSignedUrl: jest.fn().mockResolvedValue('http://s/x'),
      getDriverName: jest.fn().mockReturnValue('local'),
    } as any,
    { resolve: jest.fn().mockReturnValue(adapter) } as any,
    { resolve: jest.fn() } as any,
  );

  const launch = jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({ screenshot: jest.fn().mockResolvedValue(Buffer.from('x')) }),
    close: jest.fn().mockResolvedValue(undefined),
  });
  (service as any).launchBrowser = launch;

  return { service, applicationModel, applicationsService, events, adapter, submitSpy, launch };
}

describe('ApplyRunnerService.commitOne', () => {
  const original = process.env.AUTO_APPLICATION_ENABLED;

  beforeEach(() => {
    process.env.AUTO_APPLICATION_ENABLED = 'true';
  });
  afterEach(() => {
    process.env.AUTO_APPLICATION_ENABLED = original;
  });

  describe('gate 1 — the feature flag', () => {
    it('submits nothing while AUTO_APPLICATION_ENABLED is off', async () => {
      delete process.env.AUTO_APPLICATION_ENABLED;
      const { service, submitSpy, launch } = build();

      const res = await service.commitOne(APP_ID);

      expect(res.status).toBe('skipped');
      expect(launch).not.toHaveBeenCalled();
      expect(submitSpy).not.toHaveBeenCalled();
    });
  });

  // ======================================================== AC3.2 ========
  describe('gate 2 — explicit approval', () => {
    it('requires an approvalId in the claim query, so an unapproved application can never be picked up', async () => {
      const { service, applicationModel } = build();

      await service.commitOne(APP_ID);

      const query = applicationModel.findOneAndUpdate.mock.calls[0][0];
      expect(query.status).toBe('awaiting_approval');
      expect(query['prepared.approvalId']).toEqual({ $exists: true, $ne: null });
    });

    it('does nothing when the claim matches no approved application', async () => {
      const { service, submitSpy, launch } = build({ claimed: null });

      const res = await service.commitOne(APP_ID);

      expect(res.status).toBe('skipped');
      expect(launch).not.toHaveBeenCalled();
      expect(submitSpy).not.toHaveBeenCalled();
    });
  });

  // ======================================================== AC3.3 ========
  describe('gate 3 — idempotency', () => {
    it('claims on committedAt so a second delivery cannot submit twice', async () => {
      const { service, applicationModel } = build();

      await service.commitOne(APP_ID);

      const query = applicationModel.findOneAndUpdate.mock.calls[0][0];
      const update = applicationModel.findOneAndUpdate.mock.calls[0][1];
      expect(query['atsMetadata.committedAt']).toEqual({ $exists: false });
      expect(update.$set['atsMetadata.committedAt']).toBeInstanceOf(Date);
    });
  });

  // ======================================================== AC3.1 ========
  describe('gate 4 — the form has not changed', () => {
    it('refuses to submit when the fingerprint no longer matches', async () => {
      const { service, submitSpy } = build({ fingerprint: 'fp-CHANGED' });

      const res = await service.commitOne(APP_ID);

      expect(res.status).toBe('preparing');
      expect(res.failReason).toMatch(/form changed/i);
      expect(submitSpy).not.toHaveBeenCalled();
    });

    it('discards the stale approval so a changed form cannot inherit consent', async () => {
      const { service, applicationModel } = build({ fingerprint: 'fp-CHANGED' });

      await service.commitOne(APP_ID);

      const update = applicationModel.updateOne.mock.calls[0][1];
      expect(update.$set.status).toBe('pending');
      // Array form: these are literal dotted Mongo keys, not nested paths.
      expect(update.$unset).toHaveProperty(['prepared']);
      expect(update.$unset).toHaveProperty(['atsMetadata.committedAt']);
      expect(update.$unset).toHaveProperty(['atsMetadata.claimedAt']);
    });

    it('tells the candidate why nothing was sent', async () => {
      const { service, events } = build({ fingerprint: 'fp-CHANGED' });

      await service.commitOne(APP_ID);

      expect(events.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ats_requeued', message: expect.stringMatching(/changed this form/i) }),
      );
    });

    it('submits when the fingerprint matches', async () => {
      const { service, submitSpy } = build();

      const res = await service.commitOne(APP_ID);

      expect(submitSpy).toHaveBeenCalled();
      expect(res.status).toBe('submitted');
    });
  });

  describe('expiry', () => {
    it('refuses an expired preparation and requeues it', async () => {
      const { service, submitSpy } = build({
        claimed: {
          _id: APP_ID,
          jobId: 'job1',
          candidateId: 'cand1',
          prepared: { fingerprint: 'fp-approved', approvalId: 'a1', expiresAt: past() },
        },
      });

      const res = await service.commitOne(APP_ID);

      expect(res.status).toBe('expired');
      expect(submitSpy).not.toHaveBeenCalled();
    });
  });

  describe('routing', () => {
    it('sends an adapter that cannot submit headlessly to needs_human', async () => {
      const { service, applicationsService } = build({
        adapter: {
          atsType: 'workday',
          capabilities: {
            headlessPrepare: false,
            headlessSubmit: false,
            requiresAccount: true,
            multiPage: true,
          },
          matches: () => true,
          introspect: jest.fn(),
          fill: jest.fn(),
          submit: jest.fn(),
        },
      });

      const res = await service.commitOne(APP_ID);

      expect(res.status).toBe('needs_human');
      expect(applicationsService.updateApplicationStatus).toHaveBeenCalledWith(
        APP_ID,
        'needs_human',
        expect.stringMatching(/your browser/i),
      );
    });
  });

  // ======================================================== AC3.4 ========
  describe('submit outcomes', () => {
    it('maps an unconfirmed submit to needs_human, never to failed', async () => {
      // failed would be retried, risking a duplicate application.
      const { service } = build({
        submitResult: { ok: false, needsHuman: true, screenshots: [], failReason: 'no confirmation' },
      });

      const res = await service.commitOne(APP_ID);

      expect(res.status).toBe('needs_human');
    });

    it('maps a hard failure to failed', async () => {
      const { service } = build({
        submitResult: { ok: false, screenshots: [], failReason: 'submit button missing' },
      });

      expect((await service.commitOne(APP_ID)).status).toBe('failed');
    });

    it('records failed when the adapter throws', async () => {
      const { service, adapter } = build();
      adapter.submit.mockRejectedValue(new Error('page crashed'));

      const res = await service.commitOne(APP_ID);

      expect(res.status).toBe('failed');
    });
  });

  // ======================================================== AC3.7 ========
  describe('fill-coverage alarm', () => {
    it('raises an error-level alarm below the floor', async () => {
      const { service } = build({ coverage: 0.4 });
      const spy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

      await service.commitOne(APP_ID);

      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/FILL COVERAGE ALARM/));
    });

    it('stays quiet at full coverage', async () => {
      const { service } = build({ coverage: 1 });
      const spy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

      await service.commitOne(APP_ID);

      expect(spy).not.toHaveBeenCalledWith(expect.stringMatching(/FILL COVERAGE ALARM/));
    });
  });
});

describe('ApplyRunnerService.commitApproved', () => {
  const original = process.env.AUTO_APPLICATION_ENABLED;
  afterEach(() => {
    process.env.AUTO_APPLICATION_ENABLED = original;
  });

  it('is a no-op while the flag is off', async () => {
    delete process.env.AUTO_APPLICATION_ENABLED;
    const { service, applicationModel } = build();

    const res = await service.commitApproved(5);

    expect(res).toMatchObject({ enabled: false, processed: 0 });
    expect(applicationModel.find).not.toHaveBeenCalled();
  });

  it('only picks up approved, uncommitted applications', async () => {
    process.env.AUTO_APPLICATION_ENABLED = 'true';
    const { service, applicationModel } = build();

    await service.commitApproved(5);

    const query = applicationModel.find.mock.calls[0][0];
    expect(query.status).toBe('awaiting_approval');
    expect(query['prepared.approvalId']).toEqual({ $exists: true, $ne: null });
    expect(query['atsMetadata.committedAt']).toEqual({ $exists: false });
  });
});
