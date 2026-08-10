// IngestionScheduler imports IngestionRunner only for DI metadata, but that
// pulls in the normalizer → sanitize-html (ESM-only) chain that ts-jest cannot
// transform. Auto-mock the runner so the deep import tree is never loaded; the
// tests inject their own runner stub anyway.
jest.mock('./ingestion.runner', () => ({ IngestionRunner: class IngestionRunner {} }));

import { IngestionScheduler } from './ingestion.scheduler';
import { ExpirationService } from './expiration.service';
import { IngestionCronProcessor } from './ingestion.cron.processor';
import {
  JOB_INGESTION_POLL,
  JOB_INGESTION_EXPIRY,
  JOBID_INGESTION_POLL,
  JOBID_INGESTION_EXPIRY,
  CRON_INGESTION_POLL,
  CRON_INGESTION_EXPIRY,
} from '../../queue/cron-queue.constants';

const makeLogger = () => ({
  setContext: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
});

const cfg = (map: Record<string, any> = {}) => ({ get: (k: string) => map[k] });

describe('Ingestion cron/queue conversion', () => {
  const ORIG_QUEUE = process.env.QUEUE_ENABLED;
  afterEach(() => {
    if (ORIG_QUEUE === undefined) delete process.env.QUEUE_ENABLED;
    else process.env.QUEUE_ENABLED = ORIG_QUEUE;
    jest.clearAllMocks();
  });

  describe('IngestionScheduler (poll)', () => {
    const make = (queue?: any, config = cfg()) =>
      new IngestionScheduler({} as any, { runSource: jest.fn() } as any, config as any, makeLogger() as any, queue);

    it('runPollOnce selects due sources and runs them (kill-switch off)', async () => {
      const s = make();
      const selectSpy = jest.spyOn(s, 'selectDueSources').mockResolvedValue([] as any);
      await s.runPollOnce();
      expect(selectSpy).toHaveBeenCalledTimes(1);
    });

    it('runPollOnce honours INGESTION_CRON_DISABLE kill-switch', async () => {
      const s = make(undefined, cfg({ INGESTION_CRON_DISABLE: 'true' }));
      const selectSpy = jest.spyOn(s, 'selectDueSources').mockResolvedValue([] as any);
      await s.runPollOnce();
      expect(selectSpy).not.toHaveBeenCalled();
    });

    it('@Cron handlePoll runs the method when queues OFF, early-returns when ON', async () => {
      const s = make();
      const run = jest.spyOn(s, 'runPollOnce').mockResolvedValue(undefined);

      delete process.env.QUEUE_ENABLED;
      await s.handlePoll();
      expect(run).toHaveBeenCalledTimes(1);

      run.mockClear();
      process.env.QUEUE_ENABLED = 'true';
      await s.handlePoll();
      expect(run).not.toHaveBeenCalled();
    });

    it('onModuleInit registers the repeatable poll job only when a queue is present', async () => {
      const queue = { add: jest.fn().mockResolvedValue({}) };
      await make(queue).onModuleInit();
      expect(queue.add).toHaveBeenCalledWith(
        JOB_INGESTION_POLL,
        {},
        { repeat: { cron: CRON_INGESTION_POLL }, jobId: JOBID_INGESTION_POLL },
      );

      const noQueue = { add: jest.fn() };
      await make(undefined).onModuleInit();
      expect(noQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('ExpirationService', () => {
    const make = (queue?: any, config = cfg()) =>
      new ExpirationService({} as any, {} as any, config as any, { gauge: jest.fn() } as any, makeLogger() as any, queue);

    it('runExpiryOnce expires + verifies when kill-switch off', async () => {
      const s = make();
      const exp = jest.spyOn(s, 'expirePastDue').mockResolvedValue(2);
      const ver = jest.spyOn(s, 'verifyBatch').mockResolvedValue({ checked: 5, archived: 1 });
      await s.runExpiryOnce();
      expect(exp).toHaveBeenCalledTimes(1);
      expect(ver).toHaveBeenCalledTimes(1);
    });

    it('runExpiryOnce honours INGESTION_CRON_DISABLE kill-switch', async () => {
      const s = make(undefined, cfg({ INGESTION_CRON_DISABLE: 'true' }));
      const exp = jest.spyOn(s, 'expirePastDue').mockResolvedValue(0);
      await s.runExpiryOnce();
      expect(exp).not.toHaveBeenCalled();
    });

    it('@Cron handleExpiry runs the method when queues OFF, early-returns when ON', async () => {
      const s = make();
      const run = jest.spyOn(s, 'runExpiryOnce').mockResolvedValue(undefined);

      delete process.env.QUEUE_ENABLED;
      await s.handleExpiry();
      expect(run).toHaveBeenCalledTimes(1);

      run.mockClear();
      process.env.QUEUE_ENABLED = 'true';
      await s.handleExpiry();
      expect(run).not.toHaveBeenCalled();
    });

    it('onModuleInit registers the repeatable expiry job only when a queue is present', async () => {
      const queue = { add: jest.fn().mockResolvedValue({}) };
      await make(queue).onModuleInit();
      expect(queue.add).toHaveBeenCalledWith(
        JOB_INGESTION_EXPIRY,
        {},
        { repeat: { cron: CRON_INGESTION_EXPIRY }, jobId: JOBID_INGESTION_EXPIRY },
      );

      await expect(make(undefined).onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('IngestionCronProcessor', () => {
    it('delegates poll + expiry to the extracted methods', async () => {
      const scheduler = { runPollOnce: jest.fn().mockResolvedValue(undefined) } as any;
      const expiration = { runExpiryOnce: jest.fn().mockResolvedValue(undefined) } as any;
      const p = new IngestionCronProcessor(scheduler, expiration);
      await p.handlePoll();
      await p.handleExpiry();
      expect(scheduler.runPollOnce).toHaveBeenCalledTimes(1);
      expect(expiration.runExpiryOnce).toHaveBeenCalledTimes(1);
    });
  });
});
