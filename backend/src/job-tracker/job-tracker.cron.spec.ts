import { RemindersService } from './reminders.service';
import { AnalyticsService } from './analytics.service';
import { JobTrackerCronProcessor } from './job-tracker.cron.processor';
import {
  JOB_REMINDERS,
  JOB_ANALYTICS,
  JOBID_REMINDERS,
  JOBID_ANALYTICS,
  CRON_REMINDERS,
  CRON_ANALYTICS,
} from '../queue/cron-queue.constants';

describe('Job-tracker cron/queue conversion', () => {
  const ORIG_QUEUE = process.env.QUEUE_ENABLED;
  afterEach(() => {
    if (ORIG_QUEUE === undefined) delete process.env.QUEUE_ENABLED;
    else process.env.QUEUE_ENABLED = ORIG_QUEUE;
    jest.clearAllMocks();
  });

  describe('RemindersService', () => {
    // reminderModel.find({...}).populate().exec() → []
    const reminderModel = {
      find: jest.fn(() => ({ populate: () => ({ exec: () => Promise.resolve([]) }) })),
    };
    const make = (queue?: any) =>
      new RemindersService(reminderModel as any, {} as any, queue);

    it('runRemindersOnce queries + processes due reminders', async () => {
      await make().runRemindersOnce();
      expect(reminderModel.find).toHaveBeenCalledTimes(1);
    });

    it('@Cron processDueReminders runs the method when queues OFF, early-returns when ON', async () => {
      const s = make();
      const run = jest.spyOn(s, 'runRemindersOnce').mockResolvedValue(undefined as any);

      delete process.env.QUEUE_ENABLED;
      await s.processDueReminders();
      expect(run).toHaveBeenCalledTimes(1);

      run.mockClear();
      process.env.QUEUE_ENABLED = 'true';
      await s.processDueReminders();
      expect(run).not.toHaveBeenCalled();
    });

    it('onModuleInit registers the repeatable reminders job only when a queue is present', async () => {
      const queue = { add: jest.fn().mockResolvedValue({}) };
      await make(queue).onModuleInit();
      expect(queue.add).toHaveBeenCalledWith(
        JOB_REMINDERS,
        {},
        { repeat: { cron: CRON_REMINDERS }, jobId: JOBID_REMINDERS },
      );
      await expect(make(undefined).onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('AnalyticsService', () => {
    // applicationModel.distinct('candidateId').exec() → []
    const applicationModel = {
      distinct: jest.fn(() => ({ exec: () => Promise.resolve([]) })),
    };
    const make = (queue?: any) =>
      new AnalyticsService(applicationModel as any, {} as any, queue);

    it('runAnalyticsOnce iterates users for aggregation', async () => {
      await make().runAnalyticsOnce();
      expect(applicationModel.distinct).toHaveBeenCalledWith('candidateId');
    });

    it('@Cron aggregateMonthlyAnalytics runs the method when queues OFF, early-returns when ON', async () => {
      const s = make();
      const run = jest.spyOn(s, 'runAnalyticsOnce').mockResolvedValue(undefined as any);

      delete process.env.QUEUE_ENABLED;
      await s.aggregateMonthlyAnalytics();
      expect(run).toHaveBeenCalledTimes(1);

      run.mockClear();
      process.env.QUEUE_ENABLED = 'true';
      await s.aggregateMonthlyAnalytics();
      expect(run).not.toHaveBeenCalled();
    });

    it('onModuleInit registers the repeatable analytics job only when a queue is present', async () => {
      const queue = { add: jest.fn().mockResolvedValue({}) };
      await make(queue).onModuleInit();
      expect(queue.add).toHaveBeenCalledWith(
        JOB_ANALYTICS,
        {},
        { repeat: { cron: CRON_ANALYTICS }, jobId: JOBID_ANALYTICS },
      );
      await expect(make(undefined).onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('JobTrackerCronProcessor', () => {
    it('delegates reminders + analytics to the extracted methods', async () => {
      const reminders = { runRemindersOnce: jest.fn().mockResolvedValue(undefined) } as any;
      const analytics = { runAnalyticsOnce: jest.fn().mockResolvedValue(undefined) } as any;
      const p = new JobTrackerCronProcessor(reminders, analytics);
      await p.handleReminders();
      await p.handleAnalytics();
      expect(reminders.runRemindersOnce).toHaveBeenCalledTimes(1);
      expect(analytics.runAnalyticsOnce).toHaveBeenCalledTimes(1);
    });
  });
});
