import { SupabaseUserSyncService } from './supabase-user-sync.service';
import { AuthController } from './auth.controller';
import { UserSchema } from '../schemas/user.schema';

describe('verified platform login history', () => {
  it('records each verified session once, including concurrent requests, and hides session identifiers', async () => {
    const user: any = { _id: 'user-1', loginHistory: [], unmarkModified: jest.fn() };
    const stored = new Set<string>();
    const updateOne = jest.fn(async (filter, update) => {
      const id = filter['loginHistory.sessionId'].$ne;
      if (stored.has(id)) return { modifiedCount: 0 };
      stored.add(id);
      return { modifiedCount: 1 };
    });
    const service = new SupabaseUserSyncService({ updateOne } as any, { setContext: jest.fn() } as any);
    const signedInAt = new Date('2026-01-02T14:00:00Z');
    const claims = { session_id: 'session-1', app_metadata: { provider: 'google' }, amr: [{ method: 'oauth', timestamp: signedInAt.getTime() / 1000 }, { method: 'totp' }] };
    await Promise.all([
      (service as any).recordLogin(user, claims),
      (service as any).recordLogin({ ...user, loginHistory: [] }, claims),
    ]);
    await (service as any).recordLogin(user, { ...claims, iat: 999 });
    await (service as any).recordLogin(user, {});
    expect(stored.size).toBe(1);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'user-1', 'loginHistory.sessionId': { $ne: 'session-1' } },
      expect.objectContaining({ $push: { loginHistory: { $each: [{ sessionId: 'session-1', at: signedInAt, method: 'google' }], $slice: -100 } } }),
    );
    await (service as any).recordLogin(user, { ...claims, session_id: 'session-2', amr: [{ method: 'password' }] });
    expect(stored.size).toBe(2);
    const history = await (new AuthController(service) as any).getLoginHistory({ user });
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ at: expect.any(Date), method: 'password' });
    expect(JSON.stringify(history)).not.toContain('session-');
    const json: any = { loginHistory: [{ sessionId: 'private', at: new Date(), method: 'google' }] };
    (UserSchema.get('toJSON') as any).transform(null, json);
    expect(JSON.stringify(json)).not.toContain('private');
  });
});
