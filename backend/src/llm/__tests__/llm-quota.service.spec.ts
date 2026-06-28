import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { LLMQuotaService } from '../llm-quota.service';
import { EntitlementService } from '../../entitlement/entitlement.service';
import { LLMAccountingService } from '../llm-accounting.service';
import { LLMFeature } from '../llm-routing.service';

describe('LLMQuotaService', () => {
  let service: LLMQuotaService;
  let entitlementService: EntitlementService;
  let accountingService: LLMAccountingService;

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<LLMQuotaService>(LLMQuotaService);
    entitlementService = module.get<EntitlementService>(EntitlementService);
    accountingService = module.get<LLMAccountingService>(LLMAccountingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

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
  });
});

