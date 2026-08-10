import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CopilotController } from '../copilot.controller';
import { JOB_SEARCH_COPILOT_TYPE } from '../copilot.definition';

function build() {
  const runtime = { enqueueRun: jest.fn() };
  const users = { getAutofillPayload: jest.fn() };
  const userPreferences = { getOrCreate: jest.fn() };
  const agentRunModel: any = { find: jest.fn(), findById: jest.fn() };
  const controller = new CopilotController(
    runtime as any,
    users as any,
    userPreferences as any,
    agentRunModel,
  );
  return { controller, runtime, users, userPreferences, agentRunModel };
}

const REQ = (id: string) => ({ user: { _id: id } });

describe('CopilotController', () => {
  afterEach(() => jest.clearAllMocks());

  describe('POST /run', () => {
    it('seeds candidate + preference context into the enqueued input', async () => {
      const { controller, runtime, users, userPreferences } = build();
      users.getAutofillPayload.mockResolvedValue({
        fullName: 'Ada Lovelace',
        email: 'ada@x.com',
        location: 'London',
      });
      userPreferences.getOrCreate.mockResolvedValue({
        skills: ['ts', 'node'],
        titles: ['Engineer'],
        remoteOnly: true,
        minMatchScore: 70,
      });
      runtime.enqueueRun.mockResolvedValue({ queued: true, runId: 'run-1' });

      const res = await controller.run(REQ('user-1') as any, { keywords: 'backend' });

      expect(runtime.enqueueRun).toHaveBeenCalledTimes(1);
      const [agentType, userId, input] = runtime.enqueueRun.mock.calls[0];
      expect(agentType).toBe(JOB_SEARCH_COPILOT_TYPE);
      expect(userId).toBe('user-1');
      expect(input.keywords).toBe('backend');
      expect(input.candidate).toMatchObject({
        name: 'Ada Lovelace',
        email: 'ada@x.com',
        location: 'London',
        skills: ['ts', 'node'],
      });
      expect(input.preferences).toMatchObject({ remoteOnly: true, minMatchScore: 70 });
      expect(input.goal).toBeDefined();
      expect(res).toEqual({ runId: 'run-1', queued: true });
    });

    it('returns inline run id/status when not queued', async () => {
      const { controller, runtime, users, userPreferences } = build();
      users.getAutofillPayload.mockResolvedValue(null);
      userPreferences.getOrCreate.mockResolvedValue(null);
      runtime.enqueueRun.mockResolvedValue({
        queued: false,
        run: { _id: 'run-2', status: 'completed' },
      });

      const res = await controller.run(REQ('user-1') as any, {});

      expect(res).toEqual({ runId: 'run-2', queued: false, status: 'completed' });
    });
  });

  describe('GET /runs/:id', () => {
    it('returns the run when owned by the caller', async () => {
      const { controller, agentRunModel } = build();
      const id = new Types.ObjectId().toString();
      agentRunModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: id, userId: 'user-1', agentType: JOB_SEARCH_COPILOT_TYPE }),
      });

      const res = await controller.getRun(REQ('user-1') as any, id);
      expect(res).toMatchObject({ _id: id, userId: 'user-1' });
    });

    it('404s when the run belongs to another user', async () => {
      const { controller, agentRunModel } = build();
      const id = new Types.ObjectId().toString();
      agentRunModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: id, userId: 'someone-else' }),
      });

      await expect(controller.getRun(REQ('user-1') as any, id)).rejects.toThrow(NotFoundException);
    });

    it('404s for a malformed id (never queries)', async () => {
      const { controller, agentRunModel } = build();
      await expect(controller.getRun(REQ('user-1') as any, 'not-an-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(agentRunModel.findById).not.toHaveBeenCalled();
    });
  });
});
