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

  const proposal = (overrides: any = {}) => ({
    _id: { toString: () => 'proposal-9' },
    applicantId: { toString: () => 'app-1' },
    source: 'autopilot',
    actionType: 'advance_stage',
    payload: { targetStage: 'screening' },
    rationale: 'Strong fit (82/100).',
    ...overrides,
  });

  const withQueue = (queue: any[]) => {
    aiRecruiterService.getAutopilot = jest.fn().mockResolvedValue({
      enabled: true, status: 'active',
      stats: {}, rules: [],
      queue,
      activity: [],
    });
  };

  it('getAutopilot enriches each queue item with its matching pending proposal id', async () => {
    withQueue([{ applicantId: 'app-1', name: 'Sarah Chen', proposedAction: 'advance_to_screening' }]);
    actionsService.list = jest.fn().mockResolvedValue([proposal()]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBe('proposal-9');
  });

  it('getAutopilot overrides the heuristic label with the REAL proposal actionType when they disagree', async () => {
    // The heuristic previewed "send_screening_questions" (an advance-flavored
    // card), but the rule engine actually proposed a reject. The card must
    // show what Approve will really do.
    withQueue([
      {
        applicantId: 'app-1',
        name: 'Sarah Chen',
        proposedAction: 'send_screening_questions',
        rationale: 'heuristic guess',
      },
    ]);
    actionsService.list = jest.fn().mockResolvedValue([
      proposal({ actionType: 'reject', payload: {}, rationale: 'Developing fit (28/100).' }),
    ]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBe('proposal-9');
    expect(result.queue[0].proposedAction).toBe('Reject applicant');
    // The frontend derives its icon by substring-matching this string.
    expect(String(result.queue[0].proposedAction).toLowerCase()).toContain('reject');
    expect(result.queue[0].rationale).toBe('Developing fit (28/100).');
  });

  it('getAutopilot never attaches a copilot-sourced proposal to an autopilot queue card', async () => {
    withQueue([
      { applicantId: 'app-1', name: 'Sarah Chen', proposedAction: 'advance_to_screening' },
    ]);
    actionsService.list = jest.fn().mockResolvedValue([
      proposal({ source: 'copilot', actionType: 'reject', payload: {} }),
    ]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBeUndefined();
    // The heuristic preview survives untouched when nothing real matched.
    expect(result.queue[0].proposedAction).toBe('advance_to_screening');
  });

  it('getAutopilot joins the NEWEST pending proposal when an applicant has two (list is newest-first)', async () => {
    withQueue([
      { applicantId: 'app-1', name: 'Sarah Chen', proposedAction: 'advance_to_screening' },
    ]);
    actionsService.list = jest.fn().mockResolvedValue([
      // newest first, exactly as EmployerAiActionsService.list() sorts
      proposal({
        _id: { toString: () => 'proposal-new' },
        actionType: 'schedule_interview',
        payload: {},
        rationale: 'newest rationale',
      }),
      proposal({
        _id: { toString: () => 'proposal-old' },
        actionType: 'reject',
        payload: {},
        rationale: 'oldest rationale',
      }),
    ]);

    const result = await controller.getAutopilot(req as any);

    expect(result.queue[0].proposalId).toBe('proposal-new');
    expect(result.queue[0].proposedAction).toBe('Schedule interview');
    expect(result.queue[0].rationale).toBe('newest rationale');
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
