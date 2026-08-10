import { NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';

// Chainable find(...).sort().skip().limit().exec() helper.
const query = (rows: any) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(rows),
});

describe('JobsService (admin moderation)', () => {
  let service: JobsService;

  const jobModel: any = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  // Direct instantiation avoids a JobScraperService decorator-metadata cycle in
  // the DI test harness; the admin methods only touch jobModel.
  beforeEach(() => {
    service = new JobsService(jobModel, {} as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('adminList', () => {
    it('filters by lifecycle/moderationStatus/q WITHOUT hardcoding isActive', async () => {
      const rows = [{ title: 'Eng' }];
      const chain = query(rows);
      jobModel.find.mockReturnValue(chain);
      jobModel.countDocuments.mockResolvedValue(7);

      const res = await service.adminList({
        lifecycle: 'published',
        moderationStatus: 'needs_review',
        q: 'engineer',
        page: '3',
        limit: '5',
      });

      const filter = jobModel.find.mock.calls[0][0];
      expect(filter.lifecycle).toBe('published');
      expect(filter.moderationStatus).toBe('needs_review');
      expect(filter.isActive).toBeUndefined(); // key difference vs searchJobs
      expect(filter.$or[0].title).toBeInstanceOf(RegExp);
      expect(filter.$or[1].companyName).toBeInstanceOf(RegExp);

      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.skip).toHaveBeenCalledWith(10); // (3-1)*5
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(res).toEqual({ jobs: rows, total: 7, page: 3, limit: 5 });
    });

    it('defaults to empty filter, page 1, limit 20', async () => {
      const chain = query([]);
      jobModel.find.mockReturnValue(chain);
      jobModel.countDocuments.mockResolvedValue(0);

      const res = await service.adminList({});

      expect(jobModel.find.mock.calls[0][0]).toEqual({});
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
    });
  });

  describe('adminSetModeration', () => {
    it('sets moderationStatus and returns the job', async () => {
      const updated = { _id: 'j1', moderationStatus: 'approved' };
      jobModel.findByIdAndUpdate.mockResolvedValue(updated);

      const res = await service.adminSetModeration('j1', 'approved');

      expect(jobModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'j1',
        { $set: { moderationStatus: 'approved' } },
        expect.objectContaining({ new: true }),
      );
      expect(res).toBe(updated);
    });

    it('throws NotFound when job missing', async () => {
      jobModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.adminSetModeration('x', 'approved')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('adminSetLifecycle', () => {
    it('sets lifecycle and returns the job', async () => {
      const updated = { _id: 'j1', lifecycle: 'paused' };
      jobModel.findByIdAndUpdate.mockResolvedValue(updated);

      const res = await service.adminSetLifecycle('j1', 'paused');

      expect(jobModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'j1',
        { $set: { lifecycle: 'paused' } },
        expect.objectContaining({ new: true }),
      );
      expect(res).toBe(updated);
    });
  });

  describe('adminDeactivate', () => {
    it('sets isActive:false', async () => {
      const updated = { _id: 'j1', isActive: false };
      jobModel.findByIdAndUpdate.mockResolvedValue(updated);

      const res = await service.adminDeactivate('j1');

      expect(jobModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'j1',
        { $set: { isActive: false } },
        expect.objectContaining({ new: true }),
      );
      expect(res).toBe(updated);
    });

    it('throws NotFound when job missing', async () => {
      jobModel.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.adminDeactivate('x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
