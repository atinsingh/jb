import { Types } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EmployerAiActionsService } from './employer-ai-actions.service';

describe('EmployerAiActionsService', () => {
  const ownerId = new Types.ObjectId().toString();
  const applicantId = new Types.ObjectId().toString();
  const decidedBy = new Types.ObjectId().toString();

  const buildProposal = (overrides: Partial<any> = {}) => ({
    _id: new Types.ObjectId(),
    ownerId: new Types.ObjectId(ownerId),
    applicantId: new Types.ObjectId(applicantId),
    source: 'autopilot',
    actionType: 'reject',
    payload: {},
    status: 'pending',
    save: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    ...overrides,
  });

  const buildService = (proposal: any) => {
    const proposedActionModel: any = {
      create: jest.fn().mockResolvedValue(proposal),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([proposal]) }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(proposal) }),
    };
    const pipelineService: any = { updateStage: jest.fn().mockResolvedValue({}) };
    const interviewsService: any = { create: jest.fn().mockResolvedValue({}) };
    const messagesService: any = {
      createConversation: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      sendMessage: jest.fn().mockResolvedValue({}),
    };

    const service = new EmployerAiActionsService(
      proposedActionModel,
      pipelineService,
      interviewsService,
      messagesService,
    );
    return { service, proposedActionModel, pipelineService, interviewsService, messagesService };
  };

  it('creates a pending proposal with the given fields', async () => {
    const proposal = buildProposal();
    const { service, proposedActionModel } = buildService(proposal);

    await service.create({
      ownerId,
      source: 'copilot',
      actionType: 'advance_stage',
      applicantId,
      payload: { targetStage: 'interview' },
      rationale: 'Strong technical fit',
    });

    expect(proposedActionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'copilot',
        actionType: 'advance_stage',
        payload: { targetStage: 'interview' },
        rationale: 'Strong technical fit',
      }),
    );
  });

  it('throws NotFoundException deciding a proposal that does not belong to this owner', async () => {
    const proposedActionModel: any = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };
    const service = new EmployerAiActionsService(
      proposedActionModel, {} as any, {} as any, {} as any,
    );

    await expect(
      service.decide(ownerId, new Types.ObjectId().toString(), 'approve', decidedBy),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejecting a proposal sets status=rejected and never executes anything', async () => {
    const proposal = buildProposal();
    const { service, pipelineService } = buildService(proposal);

    const result = await service.decide(ownerId, proposal._id.toString(), 'reject', decidedBy);

    expect(result.status).toBe('rejected');
    expect(pipelineService.updateStage).not.toHaveBeenCalled();
  });

  it('approving advance_stage calls EmployerPipelineService.updateStage with the payload target', async () => {
    const proposal = buildProposal({
      actionType: 'advance_stage',
      payload: { targetStage: 'interview' },
    });
    const { service, pipelineService } = buildService(proposal);

    const result = await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(pipelineService.updateStage).toHaveBeenCalledWith(ownerId, applicantId, 'interview');
    expect(result.status).toBe('approved');
  });

  it('approving reject calls EmployerPipelineService.updateStage with rejected', async () => {
    const proposal = buildProposal({ actionType: 'reject', payload: {} });
    const { service, pipelineService } = buildService(proposal);

    await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(pipelineService.updateStage).toHaveBeenCalledWith(ownerId, applicantId, 'rejected');
  });

  it('approving schedule_interview calls EmployerInterviewsService.create with applicantId + payload', async () => {
    const proposal = buildProposal({
      actionType: 'schedule_interview',
      payload: { type: 'video', proposedAt: '2026-09-01T15:00:00.000Z', durationMins: 30 },
    });
    const { service, interviewsService } = buildService(proposal);

    await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(interviewsService.create).toHaveBeenCalledWith(ownerId, {
      applicantId,
      type: 'video',
      scheduledAt: '2026-09-01T15:00:00.000Z',
      durationMins: 30,
    });
  });

  it('approving send_message with no conversationId creates one first, then sends', async () => {
    const proposal = buildProposal({
      actionType: 'send_message',
      payload: { draftText: 'Thanks for applying!' },
    });
    const { service, messagesService } = buildService(proposal);

    await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(messagesService.createConversation).toHaveBeenCalled();
    expect(messagesService.sendMessage).toHaveBeenCalled();
  });

  it('a failure during execution sets status=failed with a reason, never silently approved', async () => {
    const proposal = buildProposal({ actionType: 'advance_stage', payload: { targetStage: 'interview' } });
    const { service, pipelineService } = buildService(proposal);
    pipelineService.updateStage.mockRejectedValue(new Error('applicant not found'));

    const result = await service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy);

    expect(result.status).toBe('failed');
    expect(result.failureReason).toContain('applicant not found');
  });

  it('throws ConflictException re-deciding an already-approved proposal, without executing anything', async () => {
    const proposal = buildProposal({
      status: 'approved',
      actionType: 'advance_stage',
      payload: { targetStage: 'interview' },
    });
    const { service, pipelineService, interviewsService, messagesService } =
      buildService(proposal);

    await expect(
      service.decide(ownerId, proposal._id.toString(), 'approve', decidedBy),
    ).rejects.toThrow(ConflictException);

    expect(pipelineService.updateStage).not.toHaveBeenCalled();
    expect(interviewsService.create).not.toHaveBeenCalled();
    expect(messagesService.sendMessage).not.toHaveBeenCalled();
  });

  it('throws ConflictException re-deciding an already-rejected proposal, without executing anything', async () => {
    const proposal = buildProposal({ status: 'rejected' });
    const { service, pipelineService, interviewsService, messagesService } =
      buildService(proposal);

    await expect(
      service.decide(ownerId, proposal._id.toString(), 'reject', decidedBy),
    ).rejects.toThrow(ConflictException);

    expect(pipelineService.updateStage).not.toHaveBeenCalled();
    expect(interviewsService.create).not.toHaveBeenCalled();
    expect(messagesService.sendMessage).not.toHaveBeenCalled();
  });

  it('lists proposals for an owner, optionally filtered by status', async () => {
    const proposal = buildProposal();
    const { service, proposedActionModel } = buildService(proposal);

    await service.list(ownerId, 'pending');

    expect(proposedActionModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });
});
