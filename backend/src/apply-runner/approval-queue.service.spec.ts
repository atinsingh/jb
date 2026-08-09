import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalQueueService } from './approval-queue.service';
import { WorkAuthStatus } from '../schemas/answer-profile.schema';

const CAND = '507f1f77bcf86cd799439011';
const APP = '507f1f77bcf86cd799439012';

const chain = (val: any) => ({ exec: jest.fn().mockResolvedValue(val) });

const future = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const past = () => new Date(Date.now() - 60 * 1000);

function build(overrides: { app?: any; queue?: any[] } = {}) {
  const app =
    'app' in overrides
      ? overrides.app
      : {
          _id: APP,
          candidateId: CAND,
          status: 'awaiting_approval',
          prepared: { blockers: [], answers: [], expiresAt: future() },
        };

  const applicationModel: any = {
    find: jest.fn(() => ({ sort: () => ({ lean: () => Promise.resolve(overrides.queue ?? []) }) })),
    findOne: jest.fn(() => chain(app)),
    updateOne: jest.fn(() => chain({})),
  };
  const jobModel: any = {
    find: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve([]) }) })),
  };
  const answers: any = { learnFromCandidate: jest.fn().mockResolvedValue(undefined) };
  const profiles: any = {
    setWorkAuthorization: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  };
  const events: any = { recordEvent: jest.fn().mockResolvedValue({}) };

  const service = new ApprovalQueueService(applicationModel, jobModel, answers, profiles, events);
  return { service, applicationModel, answers, profiles, events };
}

describe('ApprovalQueueService', () => {
  const originalFlag = process.env.AUTO_APPLICATION_ENABLED;
  afterEach(() => {
    process.env.AUTO_APPLICATION_ENABLED = originalFlag;
  });

  describe('list', () => {
    it('marks a card clean when nothing is waiting on the human', async () => {
      const { service } = build({
        queue: [
          {
            _id: APP,
            jobId: 'j1',
            status: 'awaiting_approval',
            prepared: { blockers: [], answers: [], expiresAt: future() },
          },
        ],
      });

      const [item] = await service.list(CAND);

      expect(item.isClean).toBe(true);
      expect(item.isExpired).toBe(false);
    });

    // The bulk-approve rule: AI drafts are rendered inline to be read, not
    // treated as blockers. Requiring a detour for every "why us?" would make
    // the bulk path unusable, since nearly every form asks one.
    it('stays clean when the only machine-written answer is prose', async () => {
      const { service } = build({
        queue: [
          {
            _id: APP,
            jobId: 'j1',
            prepared: {
              blockers: [],
              answers: [{ fieldName: 'why', source: 'ai_draft', value: 'Because…' }],
              expiresAt: future(),
            },
          },
        ],
      });

      const [item] = await service.list(CAND);

      expect(item.isClean).toBe(true);
      expect(item.aiDraftCount).toBe(1);
    });

    it('is not clean while a blocker is outstanding', async () => {
      const { service } = build({
        queue: [
          {
            _id: APP,
            jobId: 'j1',
            prepared: { blockers: [{ questionKey: 'work-authorization' }], answers: [], expiresAt: future() },
          },
        ],
      });

      const [item] = await service.list(CAND);

      expect(item.isClean).toBe(false);
    });

    it('is not clean once expired', async () => {
      const { service } = build({
        queue: [{ _id: APP, jobId: 'j1', prepared: { blockers: [], answers: [], expiresAt: past() } }],
      });

      const [item] = await service.list(CAND);

      expect(item.isExpired).toBe(true);
      expect(item.isClean).toBe(false);
    });
  });

  describe('approve', () => {
    it('records an approvalId', async () => {
      const { service, applicationModel } = build();

      const res = await service.approve(CAND, APP);

      expect(res.approved).toBe(true);
      expect(res.approvalId).toMatch(/^[0-9a-f-]{36}$/);

      const set = applicationModel.updateOne.mock.calls[0][1].$set;
      expect(set['prepared.approvalId']).toBe(res.approvalId);
      expect(set['prepared.approvedAt']).toBeInstanceOf(Date);
    });

    it('refuses while blockers remain', async () => {
      const { service } = build({
        app: {
          _id: APP,
          candidateId: CAND,
          status: 'awaiting_approval',
          prepared: { blockers: [{ questionKey: 'work-authorization' }], expiresAt: future() },
        },
      });

      await expect(service.approve(CAND, APP)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an expired preparation rather than submitting stale answers', async () => {
      const { service } = build({
        app: {
          _id: APP,
          candidateId: CAND,
          status: 'awaiting_approval',
          prepared: { blockers: [], expiresAt: past() },
        },
      });

      await expect(service.approve(CAND, APP)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an application that is not awaiting approval', async () => {
      const { service } = build({
        app: { _id: APP, candidateId: CAND, status: 'submitted', prepared: {} },
      });

      await expect(service.approve(CAND, APP)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an application belonging to someone else', async () => {
      const { service } = build({ app: null });

      await expect(service.approve(CAND, APP)).rejects.toBeInstanceOf(NotFoundException);
    });

    // Honesty: approving must not imply the application went out while
    // submission is switched off.
    it('reports submitted:false and says so when submission is disabled', async () => {
      delete process.env.AUTO_APPLICATION_ENABLED;
      const { service } = build();

      const res = await service.approve(CAND, APP);

      expect(res.submitted).toBe(false);
      expect(res.message).toMatch(/not switched on/i);
    });

    it('says it is queued when submission is enabled', async () => {
      process.env.AUTO_APPLICATION_ENABLED = 'true';
      const { service } = build();

      const res = await service.approve(CAND, APP);

      expect(res.message).toMatch(/queued/i);
    });
  });

  describe('answerBlocker', () => {
    const withBlocker = () => ({
      _id: APP,
      candidateId: CAND,
      status: 'awaiting_approval',
      prepared: {
        answers: [],
        expiresAt: future(),
        blockers: [
          {
            fieldName: 'work_auth',
            questionKey: 'work-authorization',
            label: 'Are you authorized to work in Canada?',
            answerType: 'select',
            profileField: 'workAuthorization',
          },
        ],
      },
    });

    it('remembers the answer for every future application', async () => {
      const { service, answers } = build({ app: withBlocker() });

      await service.answerBlocker(CAND, APP, {
        questionKey: 'work-authorization',
        value: WorkAuthStatus.AUTHORIZED,
        country: 'CA',
      });

      expect(answers.learnFromCandidate).toHaveBeenCalledWith(
        expect.objectContaining({ userId: CAND, questionKey: 'work-authorization' }),
      );
    });

    it('writes an attestation through to the profile, scoped to the country', async () => {
      const { service, profiles } = build({ app: withBlocker() });

      await service.answerBlocker(CAND, APP, {
        questionKey: 'work-authorization',
        value: WorkAuthStatus.AUTHORIZED,
        country: 'CA',
      });

      expect(profiles.setWorkAuthorization).toHaveBeenCalledWith(CAND, 'CA', WorkAuthStatus.AUTHORIZED);
    });

    it('clears the blocker and adds it to the answers', async () => {
      const { service, applicationModel } = build({ app: withBlocker() });

      const res = await service.answerBlocker(CAND, APP, {
        questionKey: 'work-authorization',
        value: WorkAuthStatus.AUTHORIZED,
        country: 'CA',
      });

      expect(res.remainingBlockers).toBe(0);
      const set = applicationModel.updateOne.mock.calls[0][1].$set;
      expect(set['prepared.blockers']).toHaveLength(0);
      expect(set['prepared.answers']).toHaveLength(1);
      expect(set['prepared.answers'][0].source).toBe('candidate');
    });

    it('rejects an empty answer', async () => {
      const { service } = build({ app: withBlocker() });

      await expect(
        service.answerBlocker(CAND, APP, { questionKey: 'work-authorization', value: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a question that is not on this application', async () => {
      const { service } = build({ app: withBlocker() });

      await expect(
        service.answerBlocker(CAND, APP, { questionKey: 'nope', value: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('decline', () => {
    it('marks it declined, not rejected', async () => {
      const { service, applicationModel } = build();

      const res = await service.decline(CAND, APP, 'wrong seniority');

      expect(res.status).toBe('declined');
      expect(applicationModel.updateOne.mock.calls[0][1].$set.status).toBe('declined');
    });
  });
});
