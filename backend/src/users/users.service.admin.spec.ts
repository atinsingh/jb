import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../schemas/user.schema';
import { EmailService } from '../common/services/email.service';
import { AppLoggerService } from '../common/logger/logger.service';

// Chainable find(...).select().sort().skip().limit().exec() helper.
const query = (rows: any) => ({
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(rows),
});

describe('UsersService (admin console)', () => {
  let service: UsersService;

  const userModel: any = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const emailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  };

  const logger = {
    setContext: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: EmailService, useValue: emailService },
        { provide: AppLoggerService, useValue: logger },
      ],
    }).compile();

    service = moduleRef.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('adminList', () => {
    it('builds a role/plan/isActive/q filter and paginates', async () => {
      const rows = [{ email: 'a@x.io' }];
      userModel.find.mockReturnValue(query(rows));
      userModel.countDocuments.mockResolvedValue(42);

      const chain = query(rows);
      userModel.find.mockReturnValue(chain);

      const res = await service.adminList({
        role: 'ROLE_EMPLOYER',
        plan: 'PRO',
        isActive: 'true',
        q: 'ada',
        page: '2',
        limit: '10',
      });

      const filter = userModel.find.mock.calls[0][0];
      expect(filter.role).toBe('ROLE_EMPLOYER');
      expect(filter.currentPlanType).toBe('PRO');
      expect(filter.isActive).toBe(true);
      // q → case-insensitive regex on email + name
      expect(filter.$or).toHaveLength(2);
      expect(filter.$or[0].email).toBeInstanceOf(RegExp);
      expect(filter.$or[0].email.flags).toContain('i');
      expect(filter.$or[1].name).toBeInstanceOf(RegExp);

      // pagination: page 2 @ limit 10 → skip 10, limit 10, newest first
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(userModel.countDocuments).toHaveBeenCalledWith(filter);

      expect(res).toEqual({ users: rows, total: 42, page: 2, limit: 10 });
    });

    it('defaults page=1 limit=20 and empty filter when no params', async () => {
      const chain = query([]);
      userModel.find.mockReturnValue(chain);
      userModel.countDocuments.mockResolvedValue(0);

      const res = await service.adminList({});

      expect(userModel.find.mock.calls[0][0]).toEqual({});
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(res).toEqual({ users: [], total: 0, page: 1, limit: 20 });
    });

    it('treats isActive=false as a boolean false filter', async () => {
      userModel.find.mockReturnValue(query([]));
      userModel.countDocuments.mockResolvedValue(0);

      await service.adminList({ isActive: 'false' });

      expect(userModel.find.mock.calls[0][0].isActive).toBe(false);
    });
  });

  describe('adminSetRole', () => {
    it('rejects an invalid role', async () => {
      await expect(service.adminSetRole('u1', 'ROLE_HACKER')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('updates a valid role and returns the user', async () => {
      const updated = { _id: 'u1', role: 'ROLE_ADMIN' };
      userModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(updated),
      });

      const res = await service.adminSetRole('u1', 'ROLE_ADMIN');

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        { $set: { role: 'ROLE_ADMIN' } },
        expect.objectContaining({ new: true }),
      );
      expect(res).toBe(updated);
    });

    it('throws NotFound when the user does not exist', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await expect(service.adminSetRole('missing', 'ROLE_AGENT')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('adminSuspend', () => {
    it('sets suspended:true, isActive:false, reason + timestamp', async () => {
      const updated = { _id: 'u1', suspended: true };
      userModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(updated),
      });

      const res = await service.adminSuspend('u1', 'spam');

      const set = userModel.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(set.suspended).toBe(true);
      expect(set.isActive).toBe(false);
      expect(set.suspendedReason).toBe('spam');
      expect(set.suspendedAt).toBeInstanceOf(Date);
      expect(res).toBe(updated);
    });

    it('throws NotFound when user missing', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      await expect(service.adminSuspend('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('adminReactivate', () => {
    it('flips suspended:false, isActive:true and clears reason/timestamp', async () => {
      const updated = { _id: 'u1', suspended: false };
      userModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockResolvedValue(updated),
      });

      const res = await service.adminReactivate('u1');

      const update = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(update.$set).toEqual({ suspended: false, isActive: true });
      expect(update.$unset).toEqual({ suspendedReason: 1, suspendedAt: 1 });
      expect(res).toBe(updated);
    });
  });
});
