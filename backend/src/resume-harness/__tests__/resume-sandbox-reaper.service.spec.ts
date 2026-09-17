import { ResumeSandboxReaperService } from '../resume-sandbox-reaper.service';
import { Types } from 'mongoose';

describe('ResumeSandboxReaperService', () => {
  it('ends only active sessions whose labelled sandboxes were reaped', async () => {
    const sessions = [
      {
        _id: '507f1f77bcf86cd799439011',
        status: 'active',
        sandboxId: 'sandbox-reaped',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        status: 'active',
        sandboxId: 'sandbox-live',
      },
      {
        _id: '507f1f77bcf86cd799439013',
        status: 'ended',
        sandboxId: undefined,
      },
    ];
    const sessionModel = {
      updateMany: jest.fn(async (filter: any, update: any) => {
        if (
          filter._id.$in.some(
            (sessionId: string) => !Types.ObjectId.isValid(sessionId),
          )
        ) {
          throw new Error('Cast to ObjectId failed');
        }
        for (const session of sessions) {
          if (
            filter.status === session.status &&
            filter._id.$in.includes(session._id)
          ) {
            Object.assign(session, update.$set);
            for (const key of Object.keys(update.$unset)) delete (session as any)[key];
          }
        }
        return { modifiedCount: 1 };
      }),
    };
    const sandbox = {
      sweepExpired: jest.fn(async () => [
        {
          sandboxId: 'sandbox-reaped',
          sessionId: '507f1f77bcf86cd799439011',
        },
        { sandboxId: 'orphan', sessionId: 'not-an-object-id' },
      ]),
    };
    const reaper = new ResumeSandboxReaperService(
      sessionModel as any,
      sandbox as any,
      { reapIdleSessions: jest.fn() } as any,
    );

    await reaper.sweepExpiredSandboxes();

    expect(sessions[0]).toMatchObject({
      _id: '507f1f77bcf86cd799439011',
      status: 'ended',
      endedAt: expect.any(Date),
    });
    expect(sessions[0].sandboxId).toBeUndefined();
    expect(sessions[1]).toEqual({
      _id: '507f1f77bcf86cd799439012',
      status: 'active',
      sandboxId: 'sandbox-live',
    });
    expect(sessions[2]).toEqual({
      _id: '507f1f77bcf86cd799439013',
      status: 'ended',
      sandboxId: undefined,
    });
  });

  it('keeps cron failures best-effort', async () => {
    const reaper = new ResumeSandboxReaperService({} as any, {
      sweepExpired: jest.fn(async () => {
        throw new Error('docker unavailable');
      }),
    } as any, { reapIdleSessions: jest.fn() } as any);

    await expect(reaper.handleSweep()).resolves.toBeUndefined();
  });
});
