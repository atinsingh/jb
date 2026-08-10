import { MonitorScheduler } from './monitor.scheduler';
import { MonitorCronProcessor } from './monitor.cron.processor';
import { JOB_MONITORS, JOBID_MONITORS, CRON_MONITORS } from '../queue/cron-queue.constants';

/**
 * Cron → Bull repeatable-job conversion for the hourly job monitors.
 * Verifies: extracted method does the work; @Cron early-returns when queues own
 * scheduling and runs the method otherwise; onModuleInit registers the
 * repeatable job only when a queue is present; the processor calls the method.
 */
describe('MonitorScheduler cron/queue conversion', () => {
  const ORIG_QUEUE = process.env.QUEUE_ENABLED;
  const ORIG_DISABLE = process.env.MONITORS_CRON_DISABLE;

  const makeDeps = () => ({
    greenhouse: { run: jest.fn().mockResolvedValue({ upserts: 1, newExternalIds: [] }) },
    lever: { run: jest.fn().mockResolvedValue({ upserts: 2, newExternalIds: [] }) },
    workday: { run: jest.fn().mockResolvedValue({ upserts: 3, newExternalIds: [] }) },
    appEvents: { recordEvent: jest.fn() },
  });

  afterEach(() => {
    if (ORIG_QUEUE === undefined) delete process.env.QUEUE_ENABLED;
    else process.env.QUEUE_ENABLED = ORIG_QUEUE;
    if (ORIG_DISABLE === undefined) delete process.env.MONITORS_CRON_DISABLE;
    else process.env.MONITORS_CRON_DISABLE = ORIG_DISABLE;
    jest.clearAllMocks();
  });

  it('runMonitorsOnce runs the three provider monitors', async () => {
    delete process.env.MONITORS_CRON_DISABLE;
    const d = makeDeps();
    const s = new MonitorScheduler(d.greenhouse as any, d.lever as any, d.workday as any, d.appEvents as any);
    await s.runMonitorsOnce();
    expect(d.greenhouse.run).toHaveBeenCalledTimes(1);
    expect(d.lever.run).toHaveBeenCalledTimes(1);
    expect(d.workday.run).toHaveBeenCalledTimes(1);
  });

  it('runMonitorsOnce honours MONITORS_CRON_DISABLE kill-switch', async () => {
    process.env.MONITORS_CRON_DISABLE = 'true';
    const d = makeDeps();
    const s = new MonitorScheduler(d.greenhouse as any, d.lever as any, d.workday as any, d.appEvents as any);
    await s.runMonitorsOnce();
    expect(d.greenhouse.run).not.toHaveBeenCalled();
  });

  it('@Cron handler runs the method when queues are OFF', async () => {
    delete process.env.QUEUE_ENABLED;
    delete process.env.MONITORS_CRON_DISABLE;
    const d = makeDeps();
    const s = new MonitorScheduler(d.greenhouse as any, d.lever as any, d.workday as any, d.appEvents as any);
    const spy = jest.spyOn(s, 'runMonitorsOnce').mockResolvedValue(undefined as any);
    await s.handleCron();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('@Cron handler early-returns (no work) when queues are ON', async () => {
    process.env.QUEUE_ENABLED = 'true';
    const d = makeDeps();
    const s = new MonitorScheduler(d.greenhouse as any, d.lever as any, d.workday as any, d.appEvents as any);
    const spy = jest.spyOn(s, 'runMonitorsOnce').mockResolvedValue(undefined as any);
    await s.handleCron();
    expect(spy).not.toHaveBeenCalled();
  });

  it('onModuleInit registers the repeatable job with a stable jobId when a queue is present', async () => {
    const d = makeDeps();
    const queue = { add: jest.fn().mockResolvedValue({ id: JOBID_MONITORS }) };
    const s = new MonitorScheduler(d.greenhouse as any, d.lever as any, d.workday as any, d.appEvents as any, queue as any);
    await s.onModuleInit();
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      JOB_MONITORS,
      {},
      { repeat: { cron: CRON_MONITORS }, jobId: JOBID_MONITORS },
    );
  });

  it('onModuleInit does nothing when no queue is injected', async () => {
    const d = makeDeps();
    const s = new MonitorScheduler(d.greenhouse as any, d.lever as any, d.workday as any, d.appEvents as any);
    await expect(s.onModuleInit()).resolves.toBeUndefined();
  });

  it('processor delegates to runMonitorsOnce', async () => {
    const scheduler = { runMonitorsOnce: jest.fn().mockResolvedValue('ok') } as any;
    const processor = new MonitorCronProcessor(scheduler);
    await processor.handleMonitors();
    expect(scheduler.runMonitorsOnce).toHaveBeenCalledTimes(1);
  });
});
