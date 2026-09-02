import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SupabaseUserSyncService } from './supabase-user-sync.service';
import { User } from '../schemas/user.schema';
import { AppLoggerService } from '../common/logger/logger.service';

/**
 * Two concurrent first requests from the same brand-new account.
 *
 * The SPA issues more than one authenticated call as it mounts, so both reach
 * the lazy upsert before either has inserted. Both see `findOne` return null,
 * both call `create`, and the second loses to the unique index on `email` —
 * which surfaced to the browser as a 500 from `GET /api/auth/me` on the very
 * first page a new user ever loads.
 *
 * The loser of that race must read the winner's document and carry on. It has
 * no reason to fail: the user it wanted created does exist by then.
 */
describe('SupabaseUserSyncService — concurrent first sign-in', () => {
  let service: SupabaseUserSyncService;

  const EXISTING = {
    _id: 'u1',
    email: 'racer@example.com',
    supabaseUserId: 'sb-1',
    role: 'ROLE_CANDIDATE',
  };

  /** Mongo's duplicate-key error, as the driver actually raises it. */
  const duplicateKey = () =>
    Object.assign(new Error('E11000 duplicate key error collection: users index: email_1'), {
      code: 11000,
      keyPattern: { email: 1 },
    });

  const userModel: any = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseUserSyncService,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: AppLoggerService,
          useValue: { setContext: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(SupabaseUserSyncService);
  });

  const claim = () =>
    (service as any).claimOrCreate('sb-1', EXISTING.email, {}, {
      emailVerified: true,
      provider: 'google',
    });

  it('returns the winner’s document instead of 500ing on duplicate key', async () => {
    // First lookup: nothing yet. Second lookup, after the insert lost: the row
    // the other request just committed.
    userModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(EXISTING);
    userModel.create.mockRejectedValueOnce(duplicateKey());

    const result = await claim();

    expect(result).toEqual(EXISTING);
    expect(userModel.create).toHaveBeenCalledTimes(1);
    // It re-read rather than retrying the insert, which would just lose again.
    expect(userModel.findOne).toHaveBeenCalledTimes(2);
  });

  it('still surfaces a create failure that is not a duplicate key', async () => {
    userModel.findOne.mockResolvedValueOnce(null);
    userModel.create.mockRejectedValueOnce(new Error('connection reset'));

    await expect(claim()).rejects.toThrow('connection reset');
  });

  it('does not swallow a duplicate key that leaves nothing to read', async () => {
    // A duplicate on some other unique index, with no matching row to fall back
    // to. Returning undefined here would strand the caller with no user.
    userModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    userModel.create.mockRejectedValueOnce(duplicateKey());

    await expect(claim()).rejects.toThrow(/duplicate key/i);
  });
});
