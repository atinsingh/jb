import { ApplyRunnerService } from './apply-runner.service';
import { ApplyRunnerController } from './apply-runner.controller';

const APP_ID = '507f1f77bcf86cd799439011';

/** Wrap a resolved value in a `{ exec: () => Promise }` chainable. */
const chain = (val: any) => ({ exec: jest.fn().mockResolvedValue(val) });

function buildService(overrides: {
  claimed?: any;
  job?: any;
  adapter?: any;
} = {}) {
  const claimed =
    'claimed' in overrides
      ? overrides.claimed
      : { _id: APP_ID, jobId: 'job1', candidateId: 'cand1', atsType: '' };

  const applicationModel: any = {
    find: jest.fn(() => ({ limit: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([]) })),
    findOneAndUpdate: jest.fn(() => chain(claimed)),
    updateOne: jest.fn(() => chain({})),
  };
  const jobModel: any = { findById: jest.fn(() => chain(overrides.job ?? { originalApplyUrl: '' })) };
  const applicationsService: any = { updateApplicationStatus: jest.fn().mockResolvedValue({}) };
  const applicationEventsService: any = { recordEvent: jest.fn().mockResolvedValue({}) };
  const candidateMaterialsService: any = { assembleMaterials: jest.fn().mockResolvedValue({}) };
  const storageService: any = {
    put: jest.fn().mockResolvedValue({ key: 'proof/x.png', url: 'http://cdn/proof.png' }),
    getSignedUrl: jest.fn().mockResolvedValue('http://signed/proof.png'),
    getDriverName: jest.fn().mockReturnValue('local'),
  };
  const registry: any = { resolve: jest.fn().mockReturnValue(overrides.adapter) };
  const answers: any = {
    resolve: jest.fn().mockResolvedValue({ answers: [], blockers: [], unknownQuestions: [] }),
  };

  const service = new ApplyRunnerService(
    applicationModel,
    jobModel,
    applicationsService,
    applicationEventsService,
    candidateMaterialsService,
    storageService,
    registry,
    answers,
  );

  return {
    service,
    answers,
    applicationModel,
    jobModel,
    applicationsService,
    applicationEventsService,
    candidateMaterialsService,
    storageService,
    registry,
  };
}

describe('ApplyRunnerService', () => {
  const OLD_ENV = process.env.AUTO_APPLICATION_ENABLED;
  afterEach(() => {
    process.env.AUTO_APPLICATION_ENABLED = OLD_ENV;
    jest.clearAllMocks();
  });

  it('AUTO_APPLICATION_ENABLED off → process is a no-op, never launches a browser', async () => {
    delete process.env.AUTO_APPLICATION_ENABLED;
    const { service, applicationModel } = buildService();
    const launchSpy = jest.spyOn(service as any, 'launchBrowser');

    const result = await service.process(5);

    expect(result).toEqual({ enabled: false, processed: 0, results: [] });
    expect(applicationModel.find).not.toHaveBeenCalled();
    expect(launchSpy).not.toHaveBeenCalled();
  });

  it('non-greenhouse app → needs_human, no browser launched', async () => {
    process.env.AUTO_APPLICATION_ENABLED = 'true';
    const { service, applicationsService } = buildService({
      job: { originalApplyUrl: 'https://jobs.lever.co/acme/1' },
      adapter: undefined, // registry.resolve → undefined for lever
    });
    const launchSpy = jest.spyOn(service as any, 'launchBrowser');

    const outcome = await service.submitOne(APP_ID);

    expect(outcome.status).toBe('needs_human');
    expect(applicationsService.updateApplicationStatus).toHaveBeenCalledWith(
      APP_ID,
      'needs_human',
      expect.stringMatching(/Unsupported ATS/i),
    );
    expect(launchSpy).not.toHaveBeenCalled();
  });

  it('greenhouse happy path → submitted + proof persisted', async () => {
    process.env.AUTO_APPLICATION_ENABLED = 'true';
    const adapter = {
      atsType: 'greenhouse',
      matches: () => true,
      submit: jest.fn().mockResolvedValue({
        ok: true,
        confirmationText: 'Thanks',
        atsMetadata: { filledFields: 4 },
        screenshots: [
          { step: 'before-submit', buffer: Buffer.from('a') },
          { step: 'after-submit', buffer: Buffer.from('b') },
        ],
      }),
    };
    const ctx = buildService({
      job: { originalApplyUrl: 'https://boards.greenhouse.io/acme/jobs/1' },
      adapter,
    });
    const browser = { newPage: jest.fn().mockResolvedValue({ mock: 'page' }), close: jest.fn().mockResolvedValue(undefined) };
    jest.spyOn(ctx.service as any, 'launchBrowser').mockResolvedValue(browser);

    const outcome = await ctx.service.submitOne(APP_ID);

    expect(adapter.submit).toHaveBeenCalledTimes(1);
    expect(outcome.status).toBe('submitted');
    // proof persisted for both screenshots
    expect(ctx.storageService.put).toHaveBeenCalledTimes(2);
    // proofDocuments written back to the application
    const proofUpdate = ctx.applicationModel.updateOne.mock.calls.find(
      (c: any[]) => c[1]?.$set?.proofDocuments,
    );
    expect(proofUpdate).toBeTruthy();
    expect(proofUpdate[1].$set.proofDocuments).toHaveLength(2);
    expect(proofUpdate[1].$set.proofSubmittedAt).toBeInstanceOf(Date);
    // terminal status set + browser closed
    expect(ctx.applicationsService.updateApplicationStatus).toHaveBeenCalledWith(APP_ID, 'submitted', undefined);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('adapter throws → failed (browser still closed)', async () => {
    process.env.AUTO_APPLICATION_ENABLED = 'true';
    const adapter = {
      atsType: 'greenhouse',
      matches: () => true,
      submit: jest.fn().mockRejectedValue(new Error('page crashed')),
    };
    const ctx = buildService({
      job: { originalApplyUrl: 'https://boards.greenhouse.io/acme/jobs/1' },
      adapter,
    });
    const browser = { newPage: jest.fn().mockResolvedValue({}), close: jest.fn().mockResolvedValue(undefined) };
    jest.spyOn(ctx.service as any, 'launchBrowser').mockResolvedValue(browser);

    const outcome = await ctx.service.submitOne(APP_ID);

    expect(outcome.status).toBe('failed');
    expect(ctx.applicationsService.updateApplicationStatus).toHaveBeenCalledWith(
      APP_ID,
      'failed',
      expect.stringMatching(/page crashed/),
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('idempotency: an already-claimed application is skipped (no browser)', async () => {
    process.env.AUTO_APPLICATION_ENABLED = 'true';
    const ctx = buildService({ claimed: null }); // atomic claim returns null → already claimed
    const launchSpy = jest.spyOn(ctx.service as any, 'launchBrowser');

    const outcome = await ctx.service.submitOne(APP_ID);

    expect(outcome.status).toBe('skipped');
    expect(launchSpy).not.toHaveBeenCalled();
    expect(ctx.applicationsService.updateApplicationStatus).not.toHaveBeenCalled();
  });
});

describe('ApplyRunnerController (producer)', () => {
  afterEach(() => jest.clearAllMocks());

  it('enqueues when a queue is present', async () => {
    const runner: any = { process: jest.fn() };
    const queue: any = { add: jest.fn().mockResolvedValue({ id: 'job-9' }) };
    const controller = new ApplyRunnerController(runner, {} as any, queue);

    const res = await controller.process(7);

    expect(queue.add).toHaveBeenCalledWith('submit', { limit: 7 });
    expect(res).toEqual({ message: 'Enqueued', queued: true, jobId: 'job-9' });
    expect(runner.process).not.toHaveBeenCalled();
  });

  it('runs inline when no queue is registered', async () => {
    const runner: any = { process: jest.fn().mockResolvedValue({ enabled: true, processed: 0, results: [] }) };
    const controller = new ApplyRunnerController(runner, {} as any, undefined);

    const res = await controller.process(3);

    expect(runner.process).toHaveBeenCalledWith(3);
    expect(res.queued).toBe(false);
  });
});
