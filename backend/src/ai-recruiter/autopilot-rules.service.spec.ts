import { Types } from 'mongoose';
import { AutopilotRulesService } from './autopilot-rules.service';

describe('AutopilotRulesService', () => {
  const ownerId = new Types.ObjectId().toString();
  const applicantId = new Types.ObjectId();

  const buildApplicant = (overrides: any = {}) => ({
    _id: applicantId,
    stage: 'applied',
    rating: 0,
    skills: [],
    aiScore: 0,
    ...overrides,
  });

  const buildService = ({ config, alreadyProposed = false, score }: any) => {
    const aiRecruiterService: any = {
      getOrCreateAutopilotConfig: jest.fn().mockResolvedValue(config),
      scoreApplicant: jest.fn().mockReturnValue(score),
      rationaleFor: jest.fn().mockReturnValue('Because reasons'),
    };
    const actionsService: any = {
      existsFor: jest.fn().mockResolvedValue(alreadyProposed),
      create: jest.fn().mockResolvedValue({}),
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([buildApplicant()]) }),
    };
    const service = new AutopilotRulesService(aiRecruiterService, actionsService, applicantModel);
    return { service, aiRecruiterService, actionsService };
  };

  it('does nothing when autopilot is disabled for this owner', async () => {
    const { service, actionsService } = buildService({
      config: { enabled: false, rules: [] },
      score: 20,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).not.toHaveBeenCalled();
  });

  it('proposes a reject when score is below the reject threshold and the rule is enabled', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: true }],
      },
      score: 20,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'autopilot', actionType: 'reject' }),
    );
  });

  it('proposes an advance when score is above the advance threshold and the rule is enabled', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_advance', scoreThreshold: 80, enabled: true }],
      },
      score: 90,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'autopilot',
        actionType: 'advance_stage',
        payload: { targetStage: 'screening' },
      }),
    );
  });

  it('does not propose when the matching rule exists but is disabled', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: false }],
      },
      score: 20,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).not.toHaveBeenCalled();
  });

  it('does not double-propose when a proposal for this applicant+rule already exists', async () => {
    const { service, actionsService } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: true }],
      },
      score: 20,
      alreadyProposed: true,
    });

    await service.evaluateApplicant(ownerId, buildApplicant());

    expect(actionsService.create).not.toHaveBeenCalled();
  });

  it('sweepAll evaluates every applicant for this owner and reports counts', async () => {
    const { service } = buildService({
      config: {
        enabled: true,
        rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: true }],
      },
      score: 20,
    });

    const result = await service.sweepAll(ownerId);

    expect(result.evaluated).toBe(1);
    expect(result.proposed).toBe(1);
  });
});
