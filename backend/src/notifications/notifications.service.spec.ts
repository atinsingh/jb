import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmployerNotification } from '../employer-notifications/schemas/employer-notification.schema';
import { CandidateNotification } from './schemas/candidate-notification.schema';

const query = (rows: any) => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(rows),
});

describe('NotificationsService', () => {
  let service: NotificationsService;

  const employerModel = {
    create: jest.fn(),
  };

  const candidateModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(EmployerNotification.name), useValue: employerModel },
        { provide: getModelToken(CandidateNotification.name), useValue: candidateModel },
      ],
    }).compile();

    service = moduleRef.get<NotificationsService>(NotificationsService);
    // silence expected error logs from swallowed failures
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('writes an EmployerNotification for audience "employer" with mapped fields', async () => {
      const doc = { _id: 'e1' };
      employerModel.create.mockResolvedValue(doc);

      const result = await service.create({
        audience: 'employer',
        userId: 'owner1',
        type: 'applicants',
        text: 'New applicant',
        href: '/x',
        tag: 'AB',
        ai: true,
        group: 'today',
      });

      expect(candidateModel.create).not.toHaveBeenCalled();
      expect(employerModel.create).toHaveBeenCalledWith({
        ownerId: 'owner1',
        type: 'applicants',
        text: 'New applicant',
        href: '/x',
        tag: 'AB',
        ai: true,
        group: 'today',
      });
      expect(result).toBe(doc);
    });

    it('writes a CandidateNotification for audience "candidate" with userId + defaults', async () => {
      const doc = { _id: 'c1' };
      candidateModel.create.mockResolvedValue(doc);

      const result = await service.create({
        audience: 'candidate',
        userId: 'user1',
        type: 'matches',
        text: '12 new matches',
      });

      expect(employerModel.create).not.toHaveBeenCalled();
      expect(candidateModel.create).toHaveBeenCalledWith({
        userId: 'user1',
        type: 'matches',
        text: '12 new matches',
        href: '',
        tag: '',
        ai: false,
        group: 'today',
      });
      expect(result).toBe(doc);
    });

    it('swallows a thrown model error and returns undefined (candidate)', async () => {
      candidateModel.create.mockRejectedValue(new Error('db down'));

      const result = await service.create({
        audience: 'candidate',
        userId: 'user1',
        type: 'applications',
        text: 'boom',
      });

      expect(result).toBeUndefined();
    });

    it('swallows a thrown model error and returns undefined (employer)', async () => {
      employerModel.create.mockRejectedValue(new Error('db down'));

      const result = await service.create({
        audience: 'employer',
        userId: 'owner1',
        type: 'offers',
        text: 'boom',
      });

      expect(result).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns candidate notifications with unread count and no type filter', async () => {
      const rows = [{ _id: 'c1' }, { _id: 'c2' }];
      candidateModel.find.mockReturnValue(query(rows));
      candidateModel.countDocuments.mockReturnValue(query(3));

      const result = await service.list('user1');

      expect(candidateModel.find).toHaveBeenCalledWith({ userId: 'user1' });
      expect(candidateModel.countDocuments).toHaveBeenCalledWith({
        userId: 'user1',
        read: false,
      });
      expect(result).toEqual({ notifications: rows, unread: 3 });
    });

    it('applies the type filter when a specific type is given', async () => {
      candidateModel.find.mockReturnValue(query([]));
      candidateModel.countDocuments.mockReturnValue(query(0));

      await service.list('user1', 'messages');

      expect(candidateModel.find).toHaveBeenCalledWith({
        userId: 'user1',
        type: 'messages',
      });
    });

    it('ignores the type filter when type is "all"', async () => {
      candidateModel.find.mockReturnValue(query([]));
      candidateModel.countDocuments.mockReturnValue(query(0));

      await service.list('user1', 'all');

      expect(candidateModel.find).toHaveBeenCalledWith({ userId: 'user1' });
    });
  });

  describe('markAllRead', () => {
    it('sets read=true on all unread candidate notifications and returns unread 0', async () => {
      candidateModel.updateMany.mockReturnValue(query({}));

      const result = await service.markAllRead('user1');

      expect(candidateModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user1', read: false },
        { $set: { read: true } },
      );
      expect(result).toEqual({ unread: 0 });
    });
  });

  describe('markRead', () => {
    it('marks a single notification read and saves it', async () => {
      const save = jest.fn().mockResolvedValue({ _id: 'c1', read: true });
      const doc: any = { _id: 'c1', read: false, save };
      candidateModel.findOne.mockReturnValue(query(doc));

      const result = await service.markRead('user1', 'c1');

      expect(candidateModel.findOne).toHaveBeenCalledWith({
        _id: 'c1',
        userId: 'user1',
      });
      expect(doc.read).toBe(true);
      expect(save).toHaveBeenCalled();
      expect(result).toEqual({ _id: 'c1', read: true });
    });

    it('throws NotFoundException when notification does not exist', async () => {
      candidateModel.findOne.mockReturnValue(query(null));

      await expect(service.markRead('user1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
