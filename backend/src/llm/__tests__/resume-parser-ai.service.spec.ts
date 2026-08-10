import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ResumeParserAIService } from '../features/resume-parser-ai.service';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { LLMProvider, LLMResponse } from '../interfaces/llm-provider.interface';
import { ResumeParseResponseSchema } from '@jobocate/contracts';

const validPayload = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555 0100',
  summary: 'Backend engineer.',
  skills: ['TypeScript', 'NestJS'],
  experience: [
    {
      title: 'Engineer',
      company: 'Acme',
      duration: '2020-2024',
      description: 'Built APIs.',
    },
  ],
  education: [
    { degree: 'BSc CS', institution: 'State U', year: '2020' },
  ],
};

const makeResponse = (content: string): LLMResponse => ({
  content,
  usage: {
    promptTokens: 200,
    completionTokens: 120,
    totalTokens: 320,
  },
  model: 'gpt-4o-mini',
});

describe('ResumeParserAIService', () => {
  let service: ResumeParserAIService;
  let quotaService: LLMQuotaService;
  let mockProvider: LLMProvider;

  const build = async (enforceQuota?: string) => {
    mockProvider = {
      getName: () => 'mock',
      isAvailable: () => true,
      complete: jest.fn(),
      chat: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeParserAIService,
        {
          provide: LLMRoutingService,
          useValue: {
            getProviderForFeature: jest.fn(() => mockProvider),
            getFeatureConfig: jest.fn(() => ({
              model: 'gpt-4o-mini',
              provider: 'mock',
              temperature: 0.3,
              maxTokens: 2000,
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
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'LLM_ENFORCE_QUOTA' ? enforceQuota : undefined,
          },
        },
      ],
    }).compile();

    service = module.get(ResumeParserAIService);
    quotaService = module.get(LLMQuotaService);
  };

  it('returns the structured resume shape from valid JSON', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify(validPayload)),
    );

    const result = await service.parseResume('user123', 'resume text');

    expect(result).toEqual(validPayload);
    expect(result.experience[0].title).toBe('Engineer');
    expect(result.education[0].degree).toBe('BSc CS');
    expect(Array.isArray(result.skills)).toBe(true);
  });

  it('does NOT enforce quota when LLM_ENFORCE_QUOTA is unset (FREE-safe)', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify(validPayload)),
    );

    await service.parseResume('user123', 'resume text');

    expect(quotaService.enforceQuota).not.toHaveBeenCalled();
    expect(quotaService.recordUsageAndIncrement).toHaveBeenCalledWith(
      'user123',
      LLMFeature.PARSE_RESUME,
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

    await service.parseResume('user123', 'resume text');
    expect(quotaService.enforceQuota).toHaveBeenCalledWith(
      'user123',
      LLMFeature.PARSE_RESUME,
    );
  });

  it('throws a clean error on invalid JSON', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse('garbage'),
    );

    await expect(
      service.parseResume('user123', 'resume text'),
    ).rejects.toThrow();
  });

  it('throws on Zod-invalid JSON (missing fields)', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse(JSON.stringify({ name: 'Jane' })),
    );

    await expect(
      service.parseResume('user123', 'resume text'),
    ).rejects.toThrow(/Invalid resume-parse response format/);
  });
});

describe('ResumeParseResponseSchema', () => {
  it('accepts a valid payload', () => {
    expect(() => ResumeParseResponseSchema.parse(validPayload)).not.toThrow();
  });

  it('rejects a payload missing required fields', () => {
    expect(() =>
      ResumeParseResponseSchema.parse({ name: 'Jane' }),
    ).toThrow();
  });

  it('rejects malformed nested experience entries', () => {
    expect(() =>
      ResumeParseResponseSchema.parse({
        ...validPayload,
        experience: [{ title: 'Engineer' }],
      }),
    ).toThrow();
  });
});
