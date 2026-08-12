import { Test, TestingModule } from '@nestjs/testing';
import { AiRecruiterController } from './ai-recruiter.controller';
import { AiRecruiterService } from './ai-recruiter.service';
import { AutopilotRulesService } from './autopilot-rules.service';
import { EmployerAiActionsService } from './employer-ai-actions.service';
import { AgentRuntimeService } from '../agent-runtime/agent-runtime.service';

describe('AiRecruiterController — new Autopilot endpoints', () => {
  let controller: AiRecruiterController;
  const aiRecruiterService = {} as any;
  const autopilotRulesService = { sweepAll: jest.fn().mockResolvedValue({ evaluated: 5, proposed: 2 }) };
  const actionsService = {
    list: jest.fn().mockResolvedValue([]),
    decide: jest.fn().mockResolvedValue({ status: 'approved' }),
  };
  const agentRuntime = { run: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiRecruiterController],
      providers: [
        { provide: AiRecruiterService, useValue: aiRecruiterService },
        { provide: AutopilotRulesService, useValue: autopilotRulesService },
        { provide: EmployerAiActionsService, useValue: actionsService },
        { provide: AgentRuntimeService, useValue: agentRuntime },
      ],
    }).compile();
    controller = module.get(AiRecruiterController);
  });

  const req = { user: { _id: 'employer-1' } };

  it('runNow sweeps the applicant pool via AutopilotRulesService', async () => {
    const result = await controller.runNow(req as any);
    expect(autopilotRulesService.sweepAll).toHaveBeenCalledWith('employer-1');
    expect(result).toEqual({ evaluated: 5, proposed: 2 });
  });

  it('listProposedActions passes the status query through', async () => {
    await controller.listProposedActions('pending', req as any);
    expect(actionsService.list).toHaveBeenCalledWith('employer-1', 'pending');
  });

  it('decideProposedAction calls decide with employerId + decision', async () => {
    await controller.decideProposedAction('proposal-1', { decision: 'approve' } as any, req as any);
    expect(actionsService.decide).toHaveBeenCalledWith('employer-1', 'proposal-1', 'approve', 'employer-1');
  });

  it('getAutopilot enriches each queue item with its matching pending proposal id', async () => {
    aiRecruiterService.getAutopilot = jest.fn().mockResolvedValue({
      enabled: true, status: 'active',
      stats: {}, rules: [],
      queue: [{ applicantId: 'app-1', name: 'Sarah Chen', proposedAction: 'advance_to_screening' }],
      activity: [],
    });
    actionsService.list = jest.fn().mockResolvedValue([
      { _id: { toString: () => 'proposal-9' }, applicantId: { toString: () => 'app-1' } },
    ]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBe('proposal-9');
  });

  it('getAutopilot leaves a queue item without a matching proposal unchanged (no proposalId)', async () => {
    aiRecruiterService.getAutopilot = jest.fn().mockResolvedValue({
      enabled: true, status: 'active',
      stats: {}, rules: [],
      queue: [{ applicantId: 'app-2', name: 'Alex Kim', proposedAction: 'request_more_info' }],
      activity: [],
    });
    actionsService.list = jest.fn().mockResolvedValue([]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBeUndefined();
  });
});
