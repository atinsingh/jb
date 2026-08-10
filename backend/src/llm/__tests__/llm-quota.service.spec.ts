import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { LLMQuotaService } from '../llm-quota.service';
import { EntitlementService } from '../../entitlement/entitlement.service';
import { LLMAccountingService } from '../llm-accounting.service';
import { LLMFeature } from '../llm-routing.service';
import { EmployerSubscription } from '../../employer-billing/schemas/employer-subscription.schema';

// A syntactically valid 24-hex ObjectId for employer-scoped tests.
const EMPLOYER_ID = '507f1f77bcf86cd799439011';

describe('LLMQuotaService', () => {
  let service: LLMQuotaService;
  let entitlementService: EntitlementService;
  let accountingService: LLMAccountingService;
  let employerSubModel: { findOne: jest.Mock; updateOne: jest.Mock };

  beforeEach(async () => {
    employerSubModel = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMQuotaService,
        {
          provide: EntitlementService,
          useValue: {
            checkEntitlement: jest.fn(),
          },
        },
        {
          provide: LLMAccountingService,
          useValue: {
            recordUsage: jest.fn(),
          },
        },
        {
          provide: getModelToken(EmployerSubscription.name),
          useValue: employerSubModel,
        },
      ],
    }).compile();

    service = module.get<LLMQuotaService>(LLMQuotaService);
    entitlementService = module.get<EntitlementService>(EntitlementService);
    accountingService = module.get<LLMAccountingService>(LLMAccountingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Candidate (entitlement-backed) features ====================

  it('should check quota and allow when quota available', async () => {
    (entitlementService.checkEntitlement as jest.Mock).mockResolvedValue({
      allowed: true,
      limit: 100,
      usage: 50,
      remaining: 50,
    });

    const result = await service.checkQuota('user123', LLMFeature.REWRITE_BULLETS);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(50);
    // Candidate features must NOT touch the employer subscription.
    expect(employerSubModel.findOne).not.toHaveBeenCalled();
  });

  it('should check quota and deny when quota exceeded', async () => {
    (entitlementService.checkEntitlement as jest.Mock).mockResolvedValue({
      allowed: false,
      limit: 100,
      usage: 100,
      remaining: 0,
      message: 'Quota exceeded',
    });

    const result = await service.checkQuota('user123', LLMFeature.REWRITE_BULLETS);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should enforce quota and throw when exceeded', async () => {
    (entitlementService.checkEntitlement as jest.Mock).mockResolvedValue({
      allowed: false,
      message: 'Quota exceeded',
    });

    await expect(
      service.enforceQuota('user123', LLMFeature.REWRITE_BULLETS),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should record usage and increment quota', async () => {
    (entitlementService.checkEntitlement as jest.Mock).mockResolvedValue({
      allowed: true,
    });
    (accountingService.recordUsage as jest.Mock).mockResolvedValue({});

    await service.recordUsageAndIncrement(
      'user123',
      LLMFeature.REWRITE_BULLETS,
      'openai',
      'gpt-4o-mini',
      {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cost: 0.001,
      },
    );

    expect(accountingService.recordUsage).toHaveBeenCalled();
    expect(entitlementService.checkEntitlement).toHaveBeenCalledWith(
      'user123',
      expect.objectContaining({ incrementUsage: true }),
    );
    // Candidate increment must NOT hit the employer counter.
    expect(employerSubModel.updateOne).not.toHaveBeenCalled();
  });

  // ==================== Employer "AI Recruiter" features ====================

  const RECRUITER_FEATURES = [
    LLMFeature.SCREEN_APPLICANTS,
    LLMFeature.RECRUITER_COPILOT,
    LLMFeature.SOURCE_CANDIDATES,
    LLMFeature.INTERVIEW_SCORECARD,
  ];

  it('maps all 4 recruiter features to the employer subscription, not candidate entitlements', async () => {
    for (const feature of RECRUITER_FEATURES) {
      employerSubModel.findOne.mockReset();
      (entitlementService.checkEntitlement as jest.Mock).mockClear();
      employerSubModel.findOne.mockResolvedValue({
        aiActionsLimit: 200,
        aiActionsUsed: 0,
      });

      const result = await service.checkQuota(EMPLOYER_ID, feature);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(200);
      // Resolved against the employer subscription, never the candidate pool.
      expect(employerSubModel.findOne).toHaveBeenCalledTimes(1);
      expect(entitlementService.checkEntitlement).not.toHaveBeenCalled();
    }
  });

  it('resolves the employer AI limit and remaining from the subscription', async () => {
    employerSubModel.findOne.mockResolvedValue({
      aiActionsLimit: 500,
      aiActionsUsed: 300,
    });

    const result = await service.checkQuota(
      EMPLOYER_ID,
      LLMFeature.SCREEN_APPLICANTS,
    );

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(500);
    expect(result.used).toBe(300);
    expect(result.remaining).toBe(200);
  });

  it('treats aiActionsLimit === -1 as unlimited', async () => {
    employerSubModel.findOne.mockResolvedValue({
      aiActionsLimit: -1,
      aiActionsUsed: 99999,
    });

    const result = await service.checkQuota(
      EMPLOYER_ID,
      LLMFeature.RECRUITER_COPILOT,
    );

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
  });

  it('enforceQuota allows an employer under allowance (reaches the Claude path)', async () => {
    employerSubModel.findOne.mockResolvedValue({
      aiActionsLimit: 25,
      aiActionsUsed: 10,
    });

    await expect(
      service.enforceQuota(EMPLOYER_ID, LLMFeature.SOURCE_CANDIDATES),
    ).resolves.toBeUndefined();
  });

  it('enforceQuota throws ForbiddenException when the employer allowance is exhausted', async () => {
    employerSubModel.findOne.mockResolvedValue({
      aiActionsLimit: 25,
      aiActionsUsed: 25,
    });

    await expect(
      service.enforceQuota(EMPLOYER_ID, LLMFeature.SCREEN_APPLICANTS),
    ).rejects.toThrow(ForbiddenException);
  });

  it('enforceQuota throws ForbiddenException when the employer allowance is zero', async () => {
    employerSubModel.findOne.mockResolvedValue({
      aiActionsLimit: 0,
      aiActionsUsed: 0,
    });

    await expect(
      service.enforceQuota(EMPLOYER_ID, LLMFeature.INTERVIEW_SCORECARD),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies (falls back, no crash) when the employer has no subscription', async () => {
    employerSubModel.findOne.mockResolvedValue(null);

    const result = await service.checkQuota(
      EMPLOYER_ID,
      LLMFeature.RECRUITER_COPILOT,
    );

    expect(result.allowed).toBe(false);
    await expect(
      service.enforceQuota(EMPLOYER_ID, LLMFeature.RECRUITER_COPILOT),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies cleanly for an invalid employer id (no DB call, no crash)', async () => {
    const result = await service.checkQuota(
      'not-an-object-id',
      LLMFeature.SCREEN_APPLICANTS,
    );

    expect(result.allowed).toBe(false);
    expect(employerSubModel.findOne).not.toHaveBeenCalled();
  });

  it('recordUsageAndIncrement increments the employer aiActionsUsed counter', async () => {
    (accountingService.recordUsage as jest.Mock).mockResolvedValue({});

    await service.recordUsageAndIncrement(
      EMPLOYER_ID,
      LLMFeature.SCREEN_APPLICANTS,
      'anthropic',
      'claude-opus-4-8',
      {
        promptTokens: 400,
        completionTokens: 200,
        totalTokens: 600,
        cost: 0.02,
      },
    );

    expect(accountingService.recordUsage).toHaveBeenCalled();
    // Employer counter incremented; candidate entitlement NOT touched.
    expect(employerSubModel.updateOne).toHaveBeenCalledWith(
      { ownerId: new Types.ObjectId(EMPLOYER_ID) },
      { $inc: { aiActionsUsed: 1 } },
    );
    expect(entitlementService.checkEntitlement).not.toHaveBeenCalled();
  });
});
