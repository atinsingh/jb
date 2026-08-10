import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InterviewBuddyService } from './interview-buddy.service';

const USER = '507f1f77bcf86cd799439011';
const SESSION = '507f1f77bcf86cd799439012';

const chain = (val: any) => ({ exec: jest.fn().mockResolvedValue(val) });

/**
 * Session lifecycle: create → consent → start → complete.
 *
 * The module README documented these endpoints from the beginning and they were
 * never built, which left the richer interview engine unreachable.
 *
 * Two rules carry real weight here:
 *   - Consent is recorded explicitly, and withholding it is an error rather
 *     than a quiet no-op. `LiveSessionService.start` refuses without it.
 *   - Retention defaults to OFF, and completing a session actually deletes the
 *     turns when it was not opted into. Raw audio never existed to delete; the
 *     transcript is the thing that has to be honoured.
 */
function build(overrides: { session?: any; deletedCount?: number } = {}) {
  const session =
    'session' in overrides
      ? overrides.session
      : { _id: SESSION, userId: USER, mode: 'CONSENT', retainTranscript: false };

  const created: any = {
    _id: SESSION,
    mode: 'CONSENT',
    status: 'CREATED',
    roleTitle: 'Senior Backend Engineer',
    save: jest.fn().mockResolvedValue({}),
  };

  const interviewSessionModel: any = {
    create: jest.fn().mockResolvedValue(created),
    findOne: jest.fn(() => chain(session)),
    updateOne: jest.fn(() => chain({})),
  };
  const interviewTurnModel: any = {
    deleteMany: jest.fn(() => chain({ deletedCount: overrides.deletedCount ?? 3 })),
  };
  const contextBuilder: any = {
    buildContextPack: jest.fn().mockResolvedValue({ role: 'Senior Backend Engineer' }),
  };

  const service = new InterviewBuddyService(
    {} as any,
    {} as any,
    {} as any,
    interviewSessionModel,
    interviewTurnModel,
    {} as any,
    contextBuilder,
  );

  return { service, interviewSessionModel, interviewTurnModel, contextBuilder, created };
}

describe('Interview session lifecycle', () => {
  describe('create', () => {
    it('builds the context pack once, at creation', async () => {
      const { service, contextBuilder, created } = build();

      await service.createSession(USER, { mode: 'CONSENT', roleTitle: 'Senior Backend Engineer' });

      // Built here rather than per question — rebuilding mid-interview would
      // spend the latency budget the copilot exists to protect.
      expect(contextBuilder.buildContextPack).toHaveBeenCalledTimes(1);
      expect(created.save).toHaveBeenCalled();
    });

    it('starts with consent unacknowledged and retention off', async () => {
      const { service, interviewSessionModel } = build();

      await service.createSession(USER, { mode: 'CONSENT', roleTitle: 'Engineer' });

      const doc = interviewSessionModel.create.mock.calls[0][0];
      expect(doc.retainTranscript).toBe(false);
      expect(doc.consentAcknowledgedAt).toBeUndefined();
    });

    it('marks a notes-only session as capturing no audio', async () => {
      const { service, interviewSessionModel } = build();

      await service.createSession(USER, { mode: 'LIVE_NOTES', roleTitle: 'Engineer' });

      expect(interviewSessionModel.create.mock.calls[0][0].captureMode).toBe('none');
    });
  });

  describe('consent', () => {
    it('records the acknowledgement with a timestamp', async () => {
      const { service, interviewSessionModel } = build();

      const res = await service.acknowledgeConsent(SESSION, USER, { acknowledged: true });

      expect(res.consentAcknowledged).toBe(true);
      expect(interviewSessionModel.updateOne.mock.calls[0][1].$set.consentAcknowledgedAt)
        .toBeInstanceOf(Date);
    });

    // Withholding consent must be a refusal, not a silent no-op.
    it('rejects when the candidate does not acknowledge', async () => {
      const { service } = build();

      await expect(
        service.acknowledgeConsent(SESSION, USER, { acknowledged: false }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('defaults retention to off when unspecified', async () => {
      const { service, interviewSessionModel } = build();

      await service.acknowledgeConsent(SESSION, USER, { acknowledged: true });

      expect(interviewSessionModel.updateOne.mock.calls[0][1].$set.retainTranscript).toBe(false);
    });

    it('honours an explicit opt-in', async () => {
      const { service, interviewSessionModel } = build();

      await service.acknowledgeConsent(SESSION, USER, {
        acknowledged: true,
        retainTranscript: true,
      });

      expect(interviewSessionModel.updateOne.mock.calls[0][1].$set.retainTranscript).toBe(true);
    });

    it('refuses for a session that is not the caller\'s', async () => {
      const { service } = build({ session: null });

      await expect(
        service.acknowledgeConsent(SESSION, USER, { acknowledged: true }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('complete', () => {
    // This is where "we do not keep your transcript" stops being a promise and
    // becomes a delete.
    it('deletes the turns when retention was not opted into', async () => {
      const { service, interviewTurnModel } = build({
        session: { _id: SESSION, userId: USER, retainTranscript: false },
      });

      const res = await service.completeSession(SESSION, USER);

      expect(interviewTurnModel.deleteMany).toHaveBeenCalled();
      expect(res.transcriptRetained).toBe(false);
      expect(res.discardedTurns).toBe(3);
    });

    it('keeps the turns when the candidate opted in', async () => {
      const { service, interviewTurnModel } = build({
        session: { _id: SESSION, userId: USER, retainTranscript: true },
      });

      const res = await service.completeSession(SESSION, USER);

      expect(interviewTurnModel.deleteMany).not.toHaveBeenCalled();
      expect(res.transcriptRetained).toBe(true);
    });

    it('marks the session completed either way', async () => {
      const { service, interviewSessionModel } = build();

      await service.completeSession(SESSION, USER);

      const set = interviewSessionModel.updateOne.mock.calls.at(-1)[1].$set;
      expect(set.status).toBe('COMPLETED');
      expect(set.endedAt).toBeInstanceOf(Date);
    });

    it('refuses for someone else\'s session', async () => {
      const { service } = build({ session: null });

      await expect(service.completeSession(SESSION, USER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('start', () => {
    it('moves the session to IN_PROGRESS', async () => {
      const { service, interviewSessionModel } = build();

      const res = await service.startSession(SESSION, USER);

      expect(res.status).toBe('IN_PROGRESS');
      expect(interviewSessionModel.updateOne.mock.calls[0][1].$set.startedAt).toBeInstanceOf(Date);
    });
  });
});
