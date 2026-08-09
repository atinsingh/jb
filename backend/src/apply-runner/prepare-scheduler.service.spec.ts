import { PrepareSchedulerService } from './prepare-scheduler.service';

const CAND = '507f1f77bcf86cd799439011';
const PROFILE = '507f1f77bcf86cd799439012';

const chain = (val: any) => ({ exec: jest.fn().mockResolvedValue(val) });

const job = (over: any = {}) => ({
  id: 'job1',
  matchScore: 90,
  source: 'greenhouse',
  eligibility: { autoApplySafe: true },
  ...over,
});

function build(
  overrides: {
    profiles?: any[];
    jobs?: any[];
    hasCapacity?: boolean | boolean[];
    todayCount?: number;
    existingApplication?: any;
  } = {},
) {
  const profiles = overrides.profiles ?? [
    { _id: PROFILE, userId: CAND, active: true, autoApply: true, minMatchScore: 75 },
  ];

  const created: any[] = [];
  const applicationModel: any = {
    findOne: jest.fn(() => chain(overrides.existingApplication ?? null)),
    countDocuments: jest.fn(() => chain(overrides.todayCount ?? 0)),
    create: jest.fn((doc: any) => {
      const row = { _id: `app-${created.length + 1}`, ...doc };
      created.push(row);
      return Promise.resolve(row);
    }),
  };

  const profileModel: any = { find: jest.fn(() => ({ lean: () => Promise.resolve(profiles) })) };

  const eligibleJobs: any = {
    getEligibleJobs: jest.fn().mockResolvedValue({ jobs: overrides.jobs ?? [job()] }),
  };

  const capacity = overrides.hasCapacity ?? true;
  const capacityQueue = Array.isArray(capacity) ? [...capacity] : null;
  const runner: any = {
    hasPrepareCapacity: jest.fn(async () =>
      capacityQueue ? (capacityQueue.length ? capacityQueue.shift() : false) : capacity,
    ),
    prepareOne: jest.fn().mockResolvedValue({ id: 'app-1', status: 'awaiting_approval' }),
  };

  const service = new PrepareSchedulerService(applicationModel, profileModel, eligibleJobs, runner);
  return { service, applicationModel, profileModel, eligibleJobs, runner, created };
}

describe('PrepareSchedulerService', () => {
  describe('gate 1 — profile selection', () => {
    it('only considers active profiles with auto-apply switched on', async () => {
      const { service, profileModel } = build();

      await service.runSweep();

      expect(profileModel.find).toHaveBeenCalledWith({ active: true, autoApply: true });
    });

    it('does nothing when no profile opts in', async () => {
      const { service, runner } = build({ profiles: [] });

      const res = await service.runSweep();

      expect(res.prepared).toBe(0);
      expect(runner.prepareOne).not.toHaveBeenCalled();
    });
  });

  describe('gate 2 — match threshold', () => {
    it('skips a job below the profile threshold', async () => {
      const { service, runner } = build({ jobs: [job({ matchScore: 60 })] });

      await service.runSweep();

      expect(runner.prepareOne).not.toHaveBeenCalled();
    });

    it('uses the PROFILE threshold, not a global one', async () => {
      const { service, runner } = build({
        profiles: [{ _id: PROFILE, userId: CAND, active: true, autoApply: true, minMatchScore: 95 }],
        jobs: [job({ matchScore: 90 })],
      });

      await service.runSweep();

      expect(runner.prepareOne).not.toHaveBeenCalled();
    });
  });

  describe('gate 3 — geography', () => {
    // autoApplySafe already folds in "inside the profile's target countries",
    // so a job failing it must never be prepared however good the match is.
    it('skips a job that is not auto-apply safe even at a perfect match', async () => {
      const { service, runner } = build({
        jobs: [job({ matchScore: 100, eligibility: { autoApplySafe: false } })],
      });

      await service.runSweep();

      expect(runner.prepareOne).not.toHaveBeenCalled();
    });

    it('asks for eligible jobs scoped to the driving profile', async () => {
      const { service, eligibleJobs } = build();

      await service.runSweep();

      expect(eligibleJobs.getEligibleJobs).toHaveBeenCalledWith(
        CAND,
        expect.objectContaining({ profileId: PROFILE }),
      );
    });
  });

  describe('gate 4 — unreviewed-prepare ceiling', () => {
    it('prepares nothing when the candidate is already at the ceiling', async () => {
      const { service, runner, eligibleJobs } = build({ hasCapacity: false });

      await service.runSweep();

      expect(runner.prepareOne).not.toHaveBeenCalled();
      // Checked before any matching work — the ceiling is the cheap gate.
      expect(eligibleJobs.getEligibleJobs).not.toHaveBeenCalled();
    });

    it('stops mid-batch as soon as capacity runs out', async () => {
      const { service, runner } = build({
        jobs: [job({ id: 'j1' }), job({ id: 'j2' }), job({ id: 'j3' })],
        // capacity for the profile check, then one job, then exhausted
        hasCapacity: [true, true, false],
      });

      await service.runSweep();

      expect(runner.prepareOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('daily cap', () => {
    it('prepares nothing once the daily application cap is reached', async () => {
      const { service, runner } = build({ todayCount: 20 });

      await service.runSweep();

      expect(runner.prepareOne).not.toHaveBeenCalled();
    });
  });

  describe('application rows', () => {
    it('creates one marked auto-applied and pending, so prepare can claim it', async () => {
      const { service, created } = build();

      await service.runSweep();

      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({
        autoApplied: true,
        status: 'pending',
        appliedBy: 'ai',
        matchScore: 90,
      });
      expect(String(created[0].profileId)).toBe(PROFILE);
    });

    it('never applies twice to the same job', async () => {
      const { service, runner, applicationModel } = build({
        existingApplication: { _id: 'existing' },
      });

      await service.runSweep();

      expect(applicationModel.create).not.toHaveBeenCalled();
      expect(runner.prepareOne).not.toHaveBeenCalled();
    });
  });

  describe('resilience', () => {
    it('keeps going when one profile throws', async () => {
      const { service, runner, eligibleJobs } = build({
        profiles: [
          { _id: 'p1', userId: CAND, active: true, autoApply: true, minMatchScore: 75 },
          { _id: 'p2', userId: CAND, active: true, autoApply: true, minMatchScore: 75 },
        ],
      });
      eligibleJobs.getEligibleJobs
        .mockRejectedValueOnce(new Error('matching down'))
        .mockResolvedValueOnce({ jobs: [job()] });

      const res = await service.runSweep();

      expect(res.prepared).toBe(1);
      expect(runner.prepareOne).toHaveBeenCalledTimes(1);
    });
  });
});
