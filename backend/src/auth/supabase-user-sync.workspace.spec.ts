import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { SupabaseUserSyncService } from './supabase-user-sync.service';
import { User } from '../schemas/user.schema';
import { AppLoggerService } from '../common/logger/logger.service';

describe('SupabaseUserSyncService — workspace switching', () => {
  let service: SupabaseUserSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseUserSyncService,
        { provide: getModelToken(User.name), useValue: {} },
        {
          provide: AppLoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SupabaseUserSyncService);
  });

  it.each([
    ['ROLE_CANDIDATE', 'ROLE_EMPLOYER'],
    ['ROLE_EMPLOYER', 'ROLE_CANDIDATE'],
  ] as const)('persists a switch from %s to %s', async (currentRole, requestedRole) => {
    const user = {
      email: 'both@example.com',
      role: currentRole,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const result = await (service as any).switchWorkspaceRole(user, requestedRole);

    expect(result).toBe(user);
    expect(user.role).toBe(requestedRole);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it.each(['ROLE_AGENT', 'ROLE_ADMIN'] as const)(
    'does not let a %s account self-select another workspace',
    async (currentRole) => {
      const user = {
        email: 'privileged@example.com',
        role: currentRole,
        save: jest.fn().mockResolvedValue(undefined),
      };

      await expect(
        (service as any).switchWorkspaceRole(user, 'ROLE_CANDIDATE'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.role).toBe(currentRole);
      expect(user.save).not.toHaveBeenCalled();
    },
  );

  it('rejects a privileged target even for a candidate account', async () => {
    const user = {
      email: 'candidate@example.com',
      role: 'ROLE_CANDIDATE',
      save: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      (service as any).switchWorkspaceRole(user, 'ROLE_ADMIN'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(user.role).toBe('ROLE_CANDIDATE');
    expect(user.save).not.toHaveBeenCalled();
  });
});
