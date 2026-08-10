import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MatchCalculatorService } from '../features/match-calculator.service';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { LLMProvider, LLMResponse } from '../interfaces/llm-provider.interface';
import { JobMatchResponseSchema } from '@jobocate/contracts';

const validPayload = {
  matchScore: 82,
  matchedSkills: ['TypeScript', 'NestJS'],
  missingSkills: ['Go'],
  reasoning: 'Strong backend fit with a minor language gap.',
};

const makeResponse = (content: string): LLMResponse => ({
  content,
  usage: {
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    cost: 0.001,
  },
  model: 'gpt-4o-mini',
});

describe('MatchCalculatorService', () => {
  let service: MatchCalculatorService;
  let quotaService: LLMQuotaService;
  let mockProvider: LLMProvider;
  let configGet: jest.Mock;

  const build = async (enforceQuota?: string) => {
    mockProvider = {
      getName: () => 'mock',
      isAvailable: () => true,
      complete: jest.fn(),
      chat: jest.fn(),
    } as any;

    configGet = jest.fn((key: string) =>
      key === 'LLM_ENFORCE_QUOTA' ? enforceQuota : undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchCalculatorService,
        {
          provide: LLMRoutingService,
          useValue: {
            getProviderForFeature: jest.fn(() => mockProvider),
            getFeatureConfig: jest.fn(() => ({
              model: 'gpt-4o-mini',
              provider: 'mock',
              temperature: 0.5,
              maxTokens: 1500,
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
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(MatchCalculatorService);
    quotaService = module.get(LLMQuotaService);
  };

  it('should be defined', async () => {
    await build();
    expect(service).toBeDefined();
  });

  it('returns the legacy match shape from valid JSON', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify(validPayload)),
    );

    const result = await service.calculateMatch(
      'user123',
      ['TypeScript'],
      'Backend engineer',
      'Build APIs',
    );

    expect(result).toEqual(validPayload);
    expect(Array.isArray(result.matchedSkills)).toBe(true);
    expect(Array.isArray(result.missingSkills)).toBe(true);
    expect(typeof result.matchScore).toBe('number');
    expect(typeof result.reasoning).toBe('string');
  });

  it('parses JSON wrapped in a markdown code fence', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse('```json\n' + JSON.stringify(validPayload) + '\n```'),
    );

    const result = await service.calculateMatch('user123', [], '', '');
    expect(result.matchScore).toBe(82);
  });

  it('does NOT enforce quota when LLM_ENFORCE_QUOTA is unset (FREE-safe)', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify(validPayload)),
    );

    await service.calculateMatch('user123', ['x'], 'req', 'desc');

    expect(quotaService.enforceQuota).not.toHaveBeenCalled();
    // usage is still recorded best-effort for accounting
    expect(quotaService.recordUsageAndIncrement).toHaveBeenCalledWith(
      'user123',
      LLMFeature.CALCULATE_MATCH,
      'mock',
      'gpt-4o-mini',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('enforces quota when LLM_ENFORCE_QUOTA="true"', async () => {
    await build('true');
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify(validPayload)),
    );

    await service.calculateMatch('user123', ['x'], 'req', 'desc');
    expect(quotaService.enforceQuota).toHaveBeenCalledWith(
      'user123',
      LLMFeature.CALCULATE_MATCH,
    );
  });

  it('throws a clean error on invalid JSON so the caller can fall back', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse('not json at all'),
    );

    await expect(
      service.calculateMatch('user123', [], '', ''),
    ).rejects.toThrow();
  });

  it('throws on Zod-invalid JSON (missing fields)', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify({ matchScore: 50 })),
    );

    await expect(
      service.calculateMatch('user123', [], '', ''),
    ).rejects.toThrow(/Invalid job-match response format/);
  });

  it('does not throw if best-effort usage recording fails', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify(validPayload)),
    );
    (quotaService.recordUsageAndIncrement as jest.Mock).mockRejectedValue(
      new Error('db down'),
    );

    await expect(
      service.calculateMatch('user123', [], '', ''),
    ).resolves.toEqual(validPayload);
  });
});

describe('JobMatchResponseSchema', () => {
  it('accepts a valid payload', () => {
    expect(() => JobMatchResponseSchema.parse(validPayload)).not.toThrow();
  });

  it('rejects a payload missing required fields', () => {
    expect(() =>
      JobMatchResponseSchema.parse({ matchScore: 50 }),
    ).toThrow();
  });

  it('rejects wrong types', () => {
    expect(() =>
      JobMatchResponseSchema.parse({
        matchScore: '50',
        matchedSkills: [],
        missingSkills: [],
        reasoning: 'x',
      }),
    ).toThrow();
  });
});
