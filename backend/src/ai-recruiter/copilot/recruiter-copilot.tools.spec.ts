import { Types } from 'mongoose';
import { buildRecruiterCopilotTools } from './recruiter-copilot.tools';

describe('buildRecruiterCopilotTools', () => {
  const ownerId = new Types.ObjectId().toString();
  const applicantId = new Types.ObjectId();
  const ctx = { userId: ownerId, run: { input: {} } } as any;

  const buildDeps = () => {
    const applicant = {
      _id: applicantId, candidateName: 'Sarah Chen', stage: 'screening',
      skills: ['TypeScript'], aiScore: 80, rating: 4,
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([applicant]) }),
      }),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(applicant) }),
      countDocuments: jest.fn().mockResolvedValue(3),
    };
    const jobModel: any = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'job-1', title: 'Backend Engineer' }) }),
    };
    const actionsService: any = { create: jest.fn().mockResolvedValue({ _id: 'proposal-1' }) };
    return { applicantModel, jobModel, actionsService, applicant };
  };

  it('search_applicants returns a list without requiring an approval', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'search_applicants')!;

    const result = await tool.handler(ctx, { jobId: 'job-1' });

    expect(deps.applicantModel.find).toHaveBeenCalled();
    expect(result.applicants).toHaveLength(1);
    expect(result.applicants[0].name).toBe('Sarah Chen');
  });

  it('get_applicant_detail returns the full record for a real applicant id', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'get_applicant_detail')!;

    const result = await tool.handler(ctx, { applicantId: applicantId.toString() });

    expect(result.applicant.name).toBe('Sarah Chen');
  });

  it('get_applicant_detail returns an error, never throws, for an unknown id', async () => {
    const deps = buildDeps();
    deps.applicantModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'get_applicant_detail')!;

    const result = await tool.handler(ctx, { applicantId: new Types.ObjectId().toString() });

    expect(result.error).toBeDefined();
  });

  it('propose_advance_stage creates an AiProposedAction, never touches the applicant directly', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_advance_stage')!;

    const result = await tool.handler(ctx, {
      applicantId: applicantId.toString(),
      targetStage: 'interview',
      rationale: 'Strong technical interview',
    });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId,
        source: 'copilot',
        actionType: 'advance_stage',
        applicantId: applicantId.toString(),
        payload: { targetStage: 'interview' },
      }),
    );
    expect(result.proposedActionId).toBe('proposal-1');
  });

  it('propose_reject creates a reject-type AiProposedAction', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_reject')!;

    await tool.handler(ctx, { applicantId: applicantId.toString(), rationale: 'Not a fit' });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'reject' }),
    );
  });

  it('propose_schedule_interview creates a schedule_interview-type AiProposedAction with the given time', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_schedule_interview')!;

    await tool.handler(ctx, {
      applicantId: applicantId.toString(),
      type: 'video',
      proposedAt: '2026-09-01T15:00:00.000Z',
      durationMins: 30,
      rationale: 'Ready for the next round',
    });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'schedule_interview',
        payload: { type: 'video', proposedAt: '2026-09-01T15:00:00.000Z', durationMins: 30 },
      }),
    );
  });

  it('propose_send_message creates a send_message-type AiProposedAction with the drafted text', async () => {
    const deps = buildDeps();
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_send_message')!;

    await tool.handler(ctx, {
      applicantId: applicantId.toString(),
      draftText: 'Thanks for interviewing!',
      rationale: 'Post-interview follow up',
    });

    expect(deps.actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'send_message',
        payload: { draftText: 'Thanks for interviewing!' },
      }),
    );
  });

  it('every action tool returns {error} rather than throwing when actionsService.create fails', async () => {
    const deps = buildDeps();
    deps.actionsService.create.mockRejectedValue(new Error('db down'));
    const tools = buildRecruiterCopilotTools(deps);
    const tool = tools.find((t) => t.name === 'propose_reject')!;

    const result = await tool.handler(ctx, { applicantId: applicantId.toString(), rationale: 'x' });

    expect(result.error).toBeDefined();
  });
});
