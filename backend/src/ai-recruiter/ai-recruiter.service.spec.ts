import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  RecruiterScreenResponseSchema,
  RecruiterSourcingResponseSchema,
  RecruiterCopilotResponseSchema,
  RecruiterScorecardResponseSchema,
} from '@jobocate/contracts';
import { AiRecruiterService } from './ai-recruiter.service';
import { LLMRoutingService } from '../llm/llm-routing.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { EmployerApplicant } from '../employer-pipeline/schemas/employer-applicant.schema';
import { EmployerAutopilotConfig } from './schemas/employer-autopilot-config.schema';
import { AiProposedAction } from './schemas/ai-proposed-action.schema';
import { EmployerTalentCandidate } from '../employer-talent/schemas/employer-talent-candidate.schema';

/**
 * Chainable mongoose model mock. `query(rows)` sets what the next find(...)
 * chain resolves to. Supports .find().sort().exec(), .find().exec() and
 * .find().sort().limit().lean().exec().
 */
function makeModel() {
  const state: { rows: any[] } = { rows: [] };
  const builder: any = {
    sort: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    lean: jest.fn(() => builder),
    exec: jest.fn(() => Promise.resolve(state.rows)),
  };
  return {
    query: (rows: any[]) => {
      state.rows = rows;
    },
    find: jest.fn(() => builder),
  };
}

/**
 * autopilotConfigModel mock — the service calls `findOneAndUpdate(...)`
 * directly (no `.exec()`, matching real Mongoose Query thenables).
 */
function makeAutopilotConfigModel(doc: any = { enabled: false, rules: [] }) {
  return {
    findOneAndUpdate: jest.fn(() => Promise.resolve(doc)),
  };
}

/**
 * proposedActionModel mock for the `getAutopilot` activity query:
 * `.find().sort().limit().lean()` resolves directly, no `.exec()`.
 */
function makeProposedActionModel(rows: any[] = []) {
  const builder: any = {
    sort: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    lean: jest.fn(() => Promise.resolve(rows)),
  };
  return {
    find: jest.fn(() => builder),
    findOne: jest.fn(),
  };
}

function applicant(overrides: Partial<any> = {}): any {
  return {
    _id: 'a1',
    jobId: 'job1',
    candidateName: 'Ada Lovelace',
    candidateHeadline: 'Senior Backend Engineer',
    candidateEmail: 'ada@example.com',
    candidateLocation: 'Remote',
    candidateId: 'cand1',
    skills: ['node', 'typescript', 'mongodb'],
    yearsExperience: 6,
    aiScore: 70,
    stage: 'applied',
    rating: 4,
    appliedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

const llmResponse = (obj: any) => ({
  content: JSON.stringify(obj),
  usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30, cost: 0 },
  model: 'claude-opus-4-8',
});

describe('AiRecruiterService', () => {
  let service: AiRecruiterService;
  let model: ReturnType<typeof makeModel>;
  let provider: any;
  let routing: any;
  let quota: any;
  let autopilotConfigModel: ReturnType<typeof makeAutopilotConfigModel>;
  let proposedActionModel: ReturnType<typeof makeProposedActionModel>;
  let talentModel: any;

  // Must be a valid ObjectId hex string: getAutopilot/toggleAutopilot now do
  // `new Types.ObjectId(ownerId)` internally to query the persisted config.
  const USER = new Types.ObjectId().toString();

  beforeEach(async () => {
    model = makeModel();
    provider = {
      getName: () => 'anthropic',
      isAvailable: () => true,
      chat: jest.fn(),
    };
    routing = {
      getProviderForFeature: jest.fn(() => provider),
      getFeatureConfig: jest.fn(() => ({
        model: 'claude-opus-4-8',
        provider: 'anthropic',
        temperature: 0.3,
        maxTokens: 2000,
      })),
    };
    quota = {
      enforceQuota: jest.fn(() => Promise.resolve()),
      recordUsageAndIncrement: jest.fn(() => Promise.resolve()),
    };
    autopilotConfigModel = makeAutopilotConfigModel();
    proposedActionModel = makeProposedActionModel();
    talentModel = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AiRecruiterService,
        { provide: getModelToken(EmployerApplicant.name), useValue: model },
        { provide: LLMRoutingService, useValue: routing },
        { provide: LLMQuotaService, useValue: quota },
        {
          provide: getModelToken(EmployerAutopilotConfig.name),
          useValue: autopilotConfigModel,
        },
        {
          provide: getModelToken(AiProposedAction.name),
          useValue: proposedActionModel,
        },
        {
          provide: getModelToken(EmployerTalentCandidate.name),
          useValue: talentModel,
        },
      ],
    }).compile();

    service = moduleRef.get(AiRecruiterService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Autopilot (deterministic)
  // ---------------------------------------------------------------------------
  describe('getAutopilot', () => {
    it('returns the full snapshot shape and a stable queue', async () => {
      model.query([applicant(), applicant({ _id: 'a2', stage: 'screening' })]);
      const r1 = await service.getAutopilot(USER);

      expect(r1).toEqual(
        expect.objectContaining({
          enabled: expect.any(Boolean),
          status: expect.any(String),
          stats: expect.objectContaining({
            reqsCovered: expect.any(Number),
            screenedToday: expect.any(Number),
            queued: expect.any(Number),
            actionsUsed: expect.any(Number),
            actionsLimit: expect.any(Number),
          }),
          rules: expect.any(Array),
          queue: expect.any(Array),
          activity: expect.any(Array),
        }),
      );
      expect(r1.queue[0]).toEqual(
        expect.objectContaining({
          applicantId: expect.any(String),
          name: expect.any(String),
          currentStage: expect.any(String),
          proposedAction: expect.any(String),
          score: expect.any(Number),
          rationale: expect.any(String),
        }),
      );

      model.query([applicant(), applicant({ _id: 'a2', stage: 'screening' })]);
      const r2 = await service.getAutopilot(USER);
      expect(r2.queue).toEqual(r1.queue);
    });

    it('derives the rules strip from the REAL persisted config.rules, thresholds and all', async () => {
      autopilotConfigModel.findOneAndUpdate = jest.fn(() =>
        Promise.resolve({
          enabled: true,
          rules: [
            { type: 'auto_propose_reject', scoreThreshold: 33, enabled: true },
            { type: 'auto_propose_advance', scoreThreshold: 91, enabled: false },
          ],
        }),
      ) as any;
      model.query([applicant()]);

      const res = await service.getAutopilot(USER);

      expect(res.rules).toEqual([
        {
          id: 'auto-reject',
          name: 'Auto-reject low-fit applicants',
          description: 'Propose rejecting applicants scoring below 33.',
          enabled: true,
        },
        {
          id: 'auto-advance',
          name: 'Auto-advance strong applicants',
          description: 'Propose advancing applicants scoring above 91 to screening.',
          enabled: false,
        },
      ]);
      // Never the old hardcoded copy.
      expect(JSON.stringify(res.rules)).not.toContain('scoring 60+');
    });

    it('reflects a rule toggled off in the persisted config', async () => {
      autopilotConfigModel.findOneAndUpdate = jest.fn(() =>
        Promise.resolve({
          enabled: true,
          rules: [{ type: 'auto_propose_reject', scoreThreshold: 40, enabled: false }],
        }),
      ) as any;
      model.query([applicant()]);

      const res = await service.getAutopilot(USER);

      expect(res.rules).toHaveLength(1);
      expect(res.rules[0].enabled).toBe(false);
    });
  });

  describe('toggleAutopilot', () => {
    it('returns enabled/status/message', async () => {
      expect(await service.toggleAutopilot(USER, true)).toEqual({
        enabled: true,
        status: 'active',
        message: expect.any(String),
      });
      expect(await service.toggleAutopilot(USER, false)).toEqual({
        enabled: false,
        status: 'paused',
        message: expect.any(String),
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Screen
  // ---------------------------------------------------------------------------
  describe('screen', () => {
    const screenShape = (r: any) => {
      expect(r).toEqual(
        expect.objectContaining({
          jobId: expect.anything(),
          total: expect.any(Number),
          ranked: expect.any(Array),
        }),
      );
      if (r.ranked.length) {
        expect(r.ranked[0]).toEqual(
          expect.objectContaining({
            applicantId: expect.anything(),
            name: expect.any(String),
            title: expect.any(String),
            stage: expect.any(String),
            score: expect.any(Number),
            recommendation: expect.stringMatching(/^(advance|review|hold)$/),
            rationale: expect.any(String),
          }),
        );
      }
    };

    it('LLM path returns the correct shape when the provider returns valid JSON', async () => {
      model.query([applicant()]);
      provider.chat.mockResolvedValue(
        llmResponse({
          ranked: [
            { id: 'a1', score: 92, recommendation: 'advance', rationale: 'Great fit' },
          ],
        }),
      );

      const r = await service.screen(USER, 'job1');
      screenShape(r);
      expect(r.ranked[0].applicantId).toBe('a1');
      expect(quota.recordUsageAndIncrement).toHaveBeenCalled();
    });

    it('falls back to deterministic on quota ForbiddenException', async () => {
      model.query([applicant()]);
      quota.enforceQuota.mockRejectedValueOnce(new ForbiddenException('nope'));

      const r = await service.screen(USER, 'job1');
      screenShape(r);
      expect(provider.chat).not.toHaveBeenCalled();
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on invalid JSON', async () => {
      model.query([applicant()]);
      provider.chat.mockResolvedValue({
        content: 'not json at all',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        model: 'claude-opus-4-8',
      });

      const r = await service.screen(USER, 'job1');
      screenShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on Zod validation failure', async () => {
      model.query([applicant()]);
      provider.chat.mockResolvedValue(llmResponse({ ranked: [{ id: 'a1' }] }));

      const r = await service.screen(USER, 'job1');
      screenShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('deterministic path is stable across calls', async () => {
      quota.enforceQuota.mockRejected = undefined;
      quota.enforceQuota.mockRejectedValue(new ForbiddenException('nope'));

      model.query([applicant(), applicant({ _id: 'a2', stage: 'interview' })]);
      const r1 = await service.screen(USER, 'job1');
      model.query([applicant(), applicant({ _id: 'a2', stage: 'interview' })]);
      const r2 = await service.screen(USER, 'job1');
      expect(r2).toEqual(r1);
    });
  });

  // ---------------------------------------------------------------------------
  // Copilot
  // ---------------------------------------------------------------------------
  describe('copilot', () => {
    const copilotShape = (r: any) => {
      expect(r).toEqual(
        expect.objectContaining({
          reply: expect.any(String),
          actions: expect.any(Array),
        }),
      );
      expect(r.actions.length).toBeGreaterThan(0);
      expect(r.actions[0]).toEqual(
        expect.objectContaining({
          type: expect.any(String),
          label: expect.any(String),
        }),
      );
    };

    it('LLM path returns LLM reply with deterministic actions', async () => {
      provider.chat.mockResolvedValue(
        llmResponse({ reply: 'Sure, I can schedule interviews for you.' }),
      );

      const r = await service.copilot(USER, 'please schedule interviews');
      copilotShape(r);
      expect(r.reply).toBe('Sure, I can schedule interviews for you.');
      // action type stays machine-valid from the deterministic regex path
      expect(r.actions[0].type).toBe('propose_interview_slots');
      expect(quota.recordUsageAndIncrement).toHaveBeenCalled();
    });

    it('falls back to deterministic on quota ForbiddenException', async () => {
      quota.enforceQuota.mockRejectedValueOnce(new ForbiddenException('nope'));
      const r = await service.copilot(USER, 'source me candidates');
      copilotShape(r);
      expect(provider.chat).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on invalid JSON', async () => {
      provider.chat.mockResolvedValue({
        content: '```not json```',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        model: 'm',
      });
      const r = await service.copilot(USER, 'help');
      copilotShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on Zod validation failure', async () => {
      provider.chat.mockResolvedValue(llmResponse({ notReply: 1 }));
      const r = await service.copilot(USER, 'help');
      copilotShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('deterministic path is stable across calls', async () => {
      quota.enforceQuota.mockRejectedValue(new ForbiddenException('nope'));
      const r1 = await service.copilot(USER, 'reject this candidate');
      const r2 = await service.copilot(USER, 'reject this candidate');
      expect(r2).toEqual(r1);
    });
  });

  // ---------------------------------------------------------------------------
  // Sourcing
  // ---------------------------------------------------------------------------
  describe('sourcing', () => {
    const sourcingShape = (r: any) => {
      expect(r).toEqual(
        expect.objectContaining({
          brief: expect.any(String),
          role: expect.anything(),
          total: expect.any(Number),
          candidates: expect.any(Array),
        }),
      );
      if (r.candidates.length) {
        expect(r.candidates[0]).toEqual(
          expect.objectContaining({
            candidateId: expect.anything(),
            name: expect.any(String),
            title: expect.any(String),
            location: expect.any(String),
            skills: expect.any(Array),
            yearsExperience: expect.any(Number),
            matchScore: expect.any(Number),
            outreach: expect.any(String),
            sourcePool: expect.any(String),
            appliedAt: expect.anything(),
          }),
        );
      }
    };

    it('LLM path returns the correct shape when the provider returns valid JSON', async () => {
      model.query([applicant()]);
      provider.chat.mockResolvedValue(
        llmResponse({
          candidates: [
            { id: 'a1', matchScore: 88, outreach: 'Hi Ada, keen to chat!' },
          ],
        }),
      );

      const r = await service.sourcing('Looking for a backend engineer', USER);
      sourcingShape(r);
      expect(r.candidates[0].outreach).toBe('Hi Ada, keen to chat!');
      expect(r.role).toBe('engineer');
      expect(quota.recordUsageAndIncrement).toHaveBeenCalled();
    });

    it('returns an empty deterministic result (no LLM) when pool is empty', async () => {
      model.query([]);
      const r = await service.sourcing('backend engineer', USER);
      sourcingShape(r);
      expect(r.total).toBe(0);
      expect(quota.enforceQuota).not.toHaveBeenCalled();
      expect(provider.chat).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on quota ForbiddenException', async () => {
      model.query([applicant()]);
      quota.enforceQuota.mockRejectedValueOnce(new ForbiddenException('nope'));
      const r = await service.sourcing('engineer', USER);
      sourcingShape(r);
      expect(provider.chat).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on invalid JSON', async () => {
      model.query([applicant()]);
      provider.chat.mockResolvedValue({
        content: 'garbage',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        model: 'm',
      });
      const r = await service.sourcing('engineer', USER);
      sourcingShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on Zod validation failure', async () => {
      model.query([applicant()]);
      provider.chat.mockResolvedValue(
        llmResponse({ candidates: [{ id: 'a1', matchScore: 'high' }] }),
      );
      const r = await service.sourcing('engineer', USER);
      sourcingShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('deterministic path is stable across calls', async () => {
      quota.enforceQuota.mockRejectedValue(new ForbiddenException('nope'));
      model.query([applicant(), applicant({ _id: 'a2' })]);
      const r1 = await service.sourcing('backend engineer', USER);
      model.query([applicant(), applicant({ _id: 'a2' })]);
      const r2 = await service.sourcing('backend engineer', USER);
      expect(r2).toEqual(r1);
    });
  });

  // ---------------------------------------------------------------------------
  // Scorecard
  // ---------------------------------------------------------------------------
  describe('scorecard', () => {
    const validScorecard = {
      overall: 4.2,
      recommendation: 'hire',
      competencies: [
        { competency: 'Technical Skills', rating: 5, evidence: 'Strong system design' },
      ],
      summary: 'Excellent candidate.',
      nextSteps: ['Schedule next round'],
    };

    const scorecardShape = (r: any) => {
      expect(r).toEqual(
        expect.objectContaining({
          hasContent: expect.any(Boolean),
          overall: expect.any(Number),
          recommendation: expect.stringMatching(
            /^(hire|lean_hire|lean_no_hire|no_hire)$/,
          ),
          competencies: expect.any(Array),
          summary: expect.any(String),
          nextSteps: expect.any(Array),
        }),
      );
      expect(r.competencies[0]).toEqual(
        expect.objectContaining({
          competency: expect.any(String),
          rating: expect.any(Number),
          evidence: expect.any(String),
        }),
      );
    };

    it('LLM path returns the correct shape when the provider returns valid JSON', async () => {
      provider.chat.mockResolvedValue(llmResponse(validScorecard));
      const r = await service.scorecard(USER, 'Candidate explained the algorithm clearly.');
      scorecardShape(r);
      expect(r.hasContent).toBe(true);
      expect(r.recommendation).toBe('hire');
      expect(quota.recordUsageAndIncrement).toHaveBeenCalled();
    });

    it('returns deterministic baseline (no LLM) when there is no content', async () => {
      const r = await service.scorecard(USER, '', '');
      scorecardShape(r);
      expect(r.hasContent).toBe(false);
      expect(quota.enforceQuota).not.toHaveBeenCalled();
      expect(provider.chat).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on quota ForbiddenException', async () => {
      quota.enforceQuota.mockRejectedValueOnce(new ForbiddenException('nope'));
      const r = await service.scorecard(USER, 'some transcript content');
      scorecardShape(r);
      expect(provider.chat).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on invalid JSON', async () => {
      provider.chat.mockResolvedValue({
        content: 'not json',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        model: 'm',
      });
      const r = await service.scorecard(USER, 'transcript');
      scorecardShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('falls back to deterministic on Zod validation failure', async () => {
      provider.chat.mockResolvedValue(
        llmResponse({ overall: 4, recommendation: 'maybe' }),
      );
      const r = await service.scorecard(USER, 'transcript');
      scorecardShape(r);
      expect(quota.recordUsageAndIncrement).not.toHaveBeenCalled();
    });

    it('deterministic path is stable across calls', async () => {
      quota.enforceQuota.mockRejectedValue(new ForbiddenException('nope'));
      const r1 = await service.scorecard(USER, 'design system debug approach');
      const r2 = await service.scorecard(USER, 'design system debug approach');
      expect(r2).toEqual(r1);
    });
  });
});

// -----------------------------------------------------------------------------
// Persisted autopilot toggle (Task 3)
// -----------------------------------------------------------------------------
describe('AiRecruiterService.toggleAutopilot / getOrCreateAutopilotConfig', () => {
  const ownerId = new Types.ObjectId().toString();

  const buildService = (existingConfig: any = null) => {
    const savedDoc = { ownerId: new Types.ObjectId(ownerId), enabled: false, rules: [] };
    const autopilotConfigModel: any = {
      findOneAndUpdate: jest.fn().mockResolvedValue(existingConfig || savedDoc),
    };
    const applicantModel: any = { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) };
    const proposedActionModel: any = { find: jest.fn(), findOne: jest.fn() }; // unused by these tests
    const talentModel: any = { find: jest.fn() }; // unused by these tests
    const service = new AiRecruiterService(
      applicantModel,
      {} as any, // routingService — unused by this test
      {} as any, // quotaService — unused by this test
      autopilotConfigModel,
      proposedActionModel,
      talentModel,
    );
    return { service, autopilotConfigModel };
  };

  it('getOrCreateAutopilotConfig upserts a default-disabled config on first read', async () => {
    const { service, autopilotConfigModel } = buildService();

    await service.getOrCreateAutopilotConfig(ownerId);

    expect(autopilotConfigModel.findOneAndUpdate).toHaveBeenCalledWith(
      { ownerId: new Types.ObjectId(ownerId) },
      expect.objectContaining({ $setOnInsert: expect.objectContaining({ enabled: false }) }),
      expect.objectContaining({ upsert: true, new: true }),
    );
  });

  it('toggleAutopilot persists the enabled flag for this owner', async () => {
    const { service, autopilotConfigModel } = buildService({
      ownerId: new Types.ObjectId(ownerId), enabled: true, rules: [],
    });

    const result = await service.toggleAutopilot(ownerId, true);

    expect(autopilotConfigModel.findOneAndUpdate).toHaveBeenCalledWith(
      { ownerId: new Types.ObjectId(ownerId) },
      expect.objectContaining({ $set: { enabled: true } }),
      expect.objectContaining({ upsert: true, new: true }),
    );
    expect(result.enabled).toBe(true);
    expect(result.status).toBe('active');
  });
});

// -----------------------------------------------------------------------------
// New Zod schemas (contracts)
// -----------------------------------------------------------------------------
describe('AI Recruiter LLM contracts', () => {
  it('RecruiterScreenResponseSchema accepts valid and rejects invalid', () => {
    expect(
      RecruiterScreenResponseSchema.safeParse({
        ranked: [{ id: 'a', score: 80, recommendation: 'advance', rationale: 'x' }],
      }).success,
    ).toBe(true);
    expect(
      RecruiterScreenResponseSchema.safeParse({
        ranked: [{ id: 'a', score: 80, recommendation: 'nope', rationale: 'x' }],
      }).success,
    ).toBe(false);
    expect(RecruiterScreenResponseSchema.safeParse({ ranked: [{ id: 'a' }] }).success).toBe(
      false,
    );
  });

  it('RecruiterSourcingResponseSchema accepts valid and rejects invalid', () => {
    expect(
      RecruiterSourcingResponseSchema.safeParse({
        candidates: [{ id: 'a', matchScore: 70, outreach: 'hi' }],
      }).success,
    ).toBe(true);
    expect(
      RecruiterSourcingResponseSchema.safeParse({
        candidates: [{ id: 'a', matchScore: 'high', outreach: 'hi' }],
      }).success,
    ).toBe(false);
  });

  it('RecruiterCopilotResponseSchema accepts valid and rejects invalid', () => {
    expect(RecruiterCopilotResponseSchema.safeParse({ reply: 'hello' }).success).toBe(true);
    expect(RecruiterCopilotResponseSchema.safeParse({ reply: 5 }).success).toBe(false);
  });

  it('RecruiterScorecardResponseSchema accepts valid and rejects invalid', () => {
    expect(
      RecruiterScorecardResponseSchema.safeParse({
        overall: 4,
        recommendation: 'hire',
        competencies: [{ competency: 'c', rating: 4, evidence: 'e' }],
        summary: 's',
        nextSteps: ['a'],
      }).success,
    ).toBe(true);
    expect(
      RecruiterScorecardResponseSchema.safeParse({
        overall: 4,
        recommendation: 'strong_hire',
        competencies: [],
        summary: 's',
        nextSteps: [],
      }).success,
    ).toBe(false);
    expect(
      RecruiterScorecardResponseSchema.safeParse({
        overall: 4,
        recommendation: 'hire',
        competencies: [{ competency: 'c', rating: 9, evidence: 'e' }],
        summary: 's',
        nextSteps: [],
      }).success,
    ).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Sourcing pool merge (Task 13)
// -----------------------------------------------------------------------------
describe('AiRecruiterService.sourcing — pool merge', () => {
  const ownerId = new Types.ObjectId().toString();

  it('merges talent-pool and applicant-history candidates, tagging each with sourcePool', async () => {
    const talentCandidate = {
      _id: new Types.ObjectId(), name: 'Jamie Fox', candidateId: null,
      skills: ['Go'], headline: 'Backend Engineer',
    };
    const applicant = {
      _id: new Types.ObjectId(), candidateId: new Types.ObjectId(),
      candidateName: 'Riley Park', skills: ['Go'], candidateEmail: 'riley@x.com',
      appliedAt: new Date(),
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([applicant]) }) }) }),
      }),
    };
    const talentModel: any = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([talentCandidate]) }),
      }),
    };
    const service = new AiRecruiterService(
      applicantModel, {} as any, { enforceQuota: jest.fn().mockRejectedValue(new Error('no key')) } as any,
      { findOneAndUpdate: jest.fn() } as any, // autopilotConfigModel
      { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }) } as any, // proposedActionModel (Task 3) — unused by sourcing()
      talentModel,
    );

    const result = await service.sourcing('backend engineer with Go', ownerId);

    const pools = result.candidates.map((c: any) => c.sourcePool);
    expect(pools).toContain('talent_pool');
    expect(pools).toContain('past_applicant');
  });

  it('deduplicates a candidate present in both pools, keeping the applicant record', async () => {
    const sharedCandidateId = new Types.ObjectId();
    const talentCandidate = {
      _id: new Types.ObjectId(), name: 'Riley Park', candidateId: sharedCandidateId,
      skills: ['Go'],
    };
    const applicant = {
      _id: new Types.ObjectId(), candidateId: sharedCandidateId,
      candidateName: 'Riley Park', skills: ['Go'], candidateEmail: 'riley@x.com',
      appliedAt: new Date(),
    };
    const applicantModel: any = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([applicant]) }) }) }),
      }),
    };
    const talentModel: any = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([talentCandidate]) }),
      }),
    };
    const service = new AiRecruiterService(
      applicantModel, {} as any, { enforceQuota: jest.fn().mockRejectedValue(new Error('no key')) } as any,
      { findOneAndUpdate: jest.fn() } as any, // autopilotConfigModel
      { find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }) } as any, // proposedActionModel (Task 3) — unused by sourcing()
      talentModel,
    );

    const result = await service.sourcing('Go engineer', ownerId);

    const rileys = result.candidates.filter((c: any) => c.name === 'Riley Park');
    expect(rileys).toHaveLength(1);
    expect(rileys[0].sourcePool).toBe('past_applicant');
  });
});
