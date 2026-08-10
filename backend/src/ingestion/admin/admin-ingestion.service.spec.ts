// Stub the runner module so importing the service does not transitively pull in
// the real IngestionRunner (which imports `uuid`, an ESM-only package jest's
// transform ignores). The stub class doubles as the DI injection token below.
jest.mock('../orchestration/ingestion.runner', () => ({
  IngestionRunner: class IngestionRunner {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { AdminIngestionService } from './admin-ingestion.service';
import { IngestionSource } from '../schemas/ingestion-source.schema';
import { IngestionRun } from '../schemas/ingestion-run.schema';
import { DeadLetter } from '../schemas/dead-letter.schema';
import { IngestionRunner } from '../orchestration/ingestion.runner';

/**
 * A chainable Mongoose query stub: every chain method returns `this`, and
 * `.exec()` resolves the provided rows. Lets us assert the filter/sort/limit
 * passed into find() without a real DB.
 */
function query(rows: any) {
  const q: any = {
    sort: jest.fn(() => q),
    limit: jest.fn(() => q),
    select: jest.fn(() => q),
    exec: jest.fn().mockResolvedValue(rows),
  };
  return q;
}

describe('AdminIngestionService', () => {
  let service: AdminIngestionService;

  const sourceModel = {
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
  };
  const runModel = {
    find: jest.fn(),
    aggregate: jest.fn(),
  };
  const dlqModel = {
    find: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
  };
  const runner = {
    runSource: jest.fn(),
    requestCancel: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminIngestionService,
        { provide: getModelToken(IngestionSource.name), useValue: sourceModel },
        { provide: getModelToken(IngestionRun.name), useValue: runModel },
        { provide: getModelToken(DeadLetter.name), useValue: dlqModel },
        { provide: IngestionRunner, useValue: runner },
      ],
    }).compile();

    service = moduleRef.get<AdminIngestionService>(AdminIngestionService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---- sources ----
  describe('listSources', () => {
    it('returns sources sorted by priority ascending (trusted first)', async () => {
      const rows = [{ sourceId: 'a' }];
      const q = query(rows);
      sourceModel.find.mockReturnValue(q);

      const out = await service.listSources();

      expect(sourceModel.find).toHaveBeenCalledWith();
      expect(q.sort).toHaveBeenCalledWith({ priority: 1 });
      expect(out).toBe(rows);
    });
  });

  describe('createSource', () => {
    it('creates a source from the dto', async () => {
      sourceModel.create.mockResolvedValue({ _id: 's1' });
      const dto = { sourceId: 'x', name: 'X' };

      const out = await service.createSource(dto as any);

      expect(sourceModel.create).toHaveBeenCalledWith(dto);
      expect(out).toEqual({ _id: 's1' });
    });
  });

  describe('updateSource', () => {
    it('$sets the dto and returns the updated doc', async () => {
      sourceModel.findByIdAndUpdate.mockReturnValue(query({ _id: 's1' }));

      await service.updateSource('s1', { name: 'Y' } as any);

      expect(sourceModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        { $set: { name: 'Y' } },
        { new: true },
      );
    });

    it('throws NotFound when the source is missing', async () => {
      sourceModel.findByIdAndUpdate.mockReturnValue(query(null));
      await expect(service.updateSource('nope', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteSource', () => {
    it('deletes and returns {deleted:true}', async () => {
      sourceModel.findByIdAndDelete.mockReturnValue(query({ _id: 's1' }));
      const out = await service.deleteSource('s1');
      expect(out).toEqual({ deleted: true });
    });

    it('throws NotFound when missing', async () => {
      sourceModel.findByIdAndDelete.mockReturnValue(query(null));
      await expect(service.deleteSource('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setEnabled', () => {
    it('sets enabled from a truthy value', async () => {
      sourceModel.findByIdAndUpdate.mockReturnValue(query({ enabled: true }));

      await service.setEnabled('s1', true);

      expect(sourceModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        { $set: { enabled: true } },
        { new: true },
      );
    });
  });

  describe('setEmergencyStop', () => {
    it('sets emergencyStopped from the stopped flag', async () => {
      sourceModel.findByIdAndUpdate.mockReturnValue(
        query({ emergencyStopped: true }),
      );

      await service.setEmergencyStop('s1', true);

      expect(sourceModel.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        { $set: { emergencyStopped: true } },
        { new: true },
      );
    });
  });

  describe('runSource', () => {
    it('delegates a forced manual run to the runner', async () => {
      runner.runSource.mockResolvedValue({ _id: 'run1' });

      const out = await service.runSource('s1');

      expect(runner.runSource).toHaveBeenCalledWith('s1', {
        trigger: 'manual',
        force: true,
      });
      expect(out).toEqual({ _id: 'run1' });
    });
  });

  // ---- runs ----
  describe('listRuns', () => {
    it('applies sourceId + status filter, newest-first, bounded limit', async () => {
      const q = query([{ _id: 'r1' }]);
      runModel.find.mockReturnValue(q);

      await service.listRuns({ sourceId: 's1', status: 'failed', limit: 10 });

      expect(runModel.find).toHaveBeenCalledWith({
        sourceId: 's1',
        status: 'failed',
      });
      expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(q.limit).toHaveBeenCalledWith(10);
    });

    it('defaults to an empty filter and limit 50', async () => {
      const q = query([]);
      runModel.find.mockReturnValue(q);

      await service.listRuns({});

      expect(runModel.find).toHaveBeenCalledWith({});
      expect(q.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('cancelRun', () => {
    it('requests cancellation via the runner', async () => {
      runner.requestCancel.mockResolvedValue(undefined);

      const out = await service.cancelRun('r1');

      expect(runner.requestCancel).toHaveBeenCalledWith('r1');
      expect(out).toEqual({ cancelRequested: true });
    });
  });

  // ---- dead letters ----
  describe('listDeadLetters', () => {
    it('filters by sourceId + reprocessed=false', async () => {
      const q = query([{ _id: 'd1' }]);
      dlqModel.find.mockReturnValue(q);

      await service.listDeadLetters({ sourceId: 's1', reprocessed: false });

      expect(dlqModel.find).toHaveBeenCalledWith({
        sourceId: 's1',
        reprocessed: false,
      });
      expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('omits reprocessed from the filter when undefined', async () => {
      const q = query([]);
      dlqModel.find.mockReturnValue(q);

      await service.listDeadLetters({});

      expect(dlqModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('reprocessDeadLetter', () => {
    it('re-runs the source with the item snapshot, then marks it reprocessed', async () => {
      const snapshot = { title: 'Engineer', company: 'Acme' };
      dlqModel.findById.mockReturnValue(
        query({ _id: 'd1', sourceId: 'src-obj-id', itemSnapshot: snapshot }),
      );
      dlqModel.updateOne.mockReturnValue(query({}));
      runner.runSource.mockResolvedValue({ _id: 'run9' });

      const out = await service.reprocessDeadLetter('d1');

      expect(runner.runSource).toHaveBeenCalledWith('src-obj-id', {
        trigger: 'reprocess',
        uploadedContent: JSON.stringify(snapshot),
      });
      expect(dlqModel.updateOne).toHaveBeenCalledWith(
        { _id: 'd1' },
        { $set: { reprocessed: true } },
      );
      expect(out).toEqual({ reprocessed: true, runId: 'run9' });
    });

    it('throws NotFound when the dead-letter is missing', async () => {
      dlqModel.findById.mockReturnValue(query(null));
      await expect(service.reprocessDeadLetter('nope')).rejects.toThrow(
        NotFoundException,
      );
      expect(runner.runSource).not.toHaveBeenCalled();
    });
  });

  // ---- metrics ----
  describe('getMetrics', () => {
    it('aggregates run counters, run status counts, and source health/enabled counts', async () => {
      runModel.aggregate
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 3,
            jobsCreated: 10,
            jobsUpdated: 4,
            jobsRejected: 2,
            deadLettered: 1,
          },
        ])
        .mockResolvedValueOnce([
          { _id: 'completed', count: 2 },
          { _id: 'failed', count: 1 },
        ]);
      sourceModel.aggregate.mockResolvedValueOnce([
        { _id: 'healthy', count: 5 },
        { _id: 'degraded', count: 1 },
      ]);
      sourceModel.countDocuments
        .mockReturnValueOnce(query(6))
        .mockReturnValueOnce(query(4));

      const out = await service.getMetrics();

      expect(out).toEqual({
        runs: {
          total: 3,
          byStatus: { completed: 2, failed: 1 },
          totals: {
            jobsCreated: 10,
            jobsUpdated: 4,
            jobsRejected: 2,
            deadLettered: 1,
          },
        },
        sources: {
          total: 6,
          enabled: 4,
          byHealth: { healthy: 5, degraded: 1 },
        },
      });
    });

    it('returns zeroed totals when there are no runs', async () => {
      runModel.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      sourceModel.aggregate.mockResolvedValueOnce([]);
      sourceModel.countDocuments
        .mockReturnValueOnce(query(0))
        .mockReturnValueOnce(query(0));

      const out = await service.getMetrics();

      expect(out.runs.total).toBe(0);
      expect(out.runs.totals.jobsCreated).toBe(0);
      expect(out.sources.total).toBe(0);
    });
  });
});
