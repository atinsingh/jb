import { Test, TestingModule } from '@nestjs/testing';
import { BulletRewriteService } from '../features/bullet-rewrite.service';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { ClaimsReviewService } from '../claims-review.service';
import { LLMProvider, LLMResponse } from '../interfaces/llm-provider.interface';
import { z } from 'zod';

describe('BulletRewriteService', () => {
  let service: BulletRewriteService;
  let routingService: LLMRoutingService;
  let quotaService: LLMQuotaService;
  let claimsReviewService: ClaimsReviewService;
  let mockProvider: LLMProvider;

  beforeEach(async () => {
    mockProvider = {
      getName: () => 'mock',
      isAvailable: () => true,
      chat: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulletRewriteService,
        {
          provide: LLMRoutingService,
          useValue: {
            getProviderForFeature: jest.fn(() => mockProvider),
            getFeatureConfig: jest.fn(() => ({
              model: 'gpt-4o-mini',
              provider: 'mock',
              temperature: 0.7,
              maxTokens: 500,
            })),
          },
        },
        {
          provide: LLMQuotaService,
          useValue: {
            enforceQuota: jest.fn(),
            recordUsageAndIncrement: jest.fn(),
          },
        },
        {
          provide: ClaimsReviewService,
          useValue: {
            detectUnverifiableClaims: jest.fn(() => []),
            createReviewRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BulletRewriteService>(BulletRewriteService);
    routingService = module.get<LLMRoutingService>(LLMRoutingService);
    quotaService = module.get<LLMQuotaService>(LLMQuotaService);
    claimsReviewService = module.get<ClaimsReviewService>(ClaimsReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should rewrite bullets successfully', async () => {
    const mockResponse: LLMResponse = {
      content: JSON.stringify({
        improvedBullets: ['Improved bullet 1', 'Improved bullet 2'],
        rationale: 'Improved for impact',
        confidence: 0.85,
        diffs: [
          {
            original: 'Original bullet',
            improved: 'Improved bullet 1',
            changes: ['Added metrics'],
          },
        ],
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        cost: 0.001,
      },
      model: 'gpt-4o-mini',
    };

    (mockProvider.chat as jest.Mock).mockResolvedValue(mockResponse);

    const result = await service.rewriteBullets('user123', [
      'Original bullet',
      'Another bullet',
    ]);

    expect(result).toBeDefined();
    expect(result.improvedBullets).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(quotaService.enforceQuota).toHaveBeenCalled();
    expect(quotaService.recordUsageAndIncrement).toHaveBeenCalled();
  });

  it('should handle Zod validation errors', async () => {
    const mockResponse: LLMResponse = {
      content: JSON.stringify({
        invalid: 'response',
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      model: 'gpt-4o-mini',
    };

    (mockProvider.chat as jest.Mock).mockResolvedValue(mockResponse);

    await expect(
      service.rewriteBullets('user123', ['Original bullet']),
    ).rejects.toThrow();
  });

  it('should detect and create review requests for unverifiable claims', async () => {
    const mockResponse: LLMResponse = {
      content: JSON.stringify({
        improvedBullets: ['Increased revenue by 50%'],
        rationale: 'Improved',
        confidence: 0.85,
        diffs: [],
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
      model: 'gpt-4o-mini',
    };

    (mockProvider.chat as jest.Mock).mockResolvedValue(mockResponse);
    (claimsReviewService.detectUnverifiableClaims as jest.Mock).mockResolvedValue([
      {
        claim: 'Increased revenue by 50%',
        originalText: 'Increased revenue',
        suggestedText: 'Increased revenue by 50%',
        confidence: 0.7,
        reason: 'Quantifiable improvement claim',
      },
    ]);

    await service.rewriteBullets('user123', ['Original bullet']);

    expect(claimsReviewService.createReviewRequest).toHaveBeenCalled();
  });
});

