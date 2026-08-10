import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InterviewChatService } from '../features/interview-chat.service';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { LLMProvider, LLMResponse } from '../interfaces/llm-provider.interface';

const makeResponse = (content: string): LLMResponse => ({
  content,
  usage: {
    promptTokens: 80,
    completionTokens: 40,
    totalTokens: 120,
  },
  model: 'gpt-4o-mini',
});

describe('InterviewChatService', () => {
  let service: InterviewChatService;
  let quotaService: LLMQuotaService;
  let mockProvider: LLMProvider;

  const messages = [
    { role: 'system' as const, content: 'You are an interview coach.' },
    { role: 'user' as const, content: 'How do I answer "tell me about yourself"?' },
  ];

  const build = async (enforceQuota?: string) => {
    mockProvider = {
      getName: () => 'mock',
      isAvailable: () => true,
      complete: jest.fn(),
      chat: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewChatService,
        {
          provide: LLMRoutingService,
          useValue: {
            getProviderForFeature: jest.fn(() => mockProvider),
            getFeatureConfig: jest.fn(() => ({
              model: 'gpt-4o-mini',
              provider: 'mock',
              temperature: 0.7,
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

    service = module.get(InterviewChatService);
    quotaService = module.get(LLMQuotaService);
  };

  it('returns the assistant reply as a plain string', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(
      makeResponse('Start with a concise professional summary...'),
    );

    const result = await service.chat('user123', messages);

    expect(typeof result).toBe('string');
    expect(result).toBe('Start with a concise professional summary...');
  });

  it('does NOT enforce quota when LLM_ENFORCE_QUOTA is unset (FREE-safe)', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(makeResponse('reply'));

    await service.chat('user123', messages);

    expect(quotaService.enforceQuota).not.toHaveBeenCalled();
    expect(quotaService.recordUsageAndIncrement).toHaveBeenCalledWith(
      'user123',
      LLMFeature.INTERVIEW_COACHING,
      'mock',
      'gpt-4o-mini',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('enforces quota when LLM_ENFORCE_QUOTA="true"', async () => {
    await build('true');
    (mockProvider.chat as jest.Mock).mockResolvedValue(makeResponse('reply'));

    await service.chat('user123', messages);
    expect(quotaService.enforceQuota).toHaveBeenCalledWith(
      'user123',
      LLMFeature.INTERVIEW_COACHING,
    );
  });

  it('throws a clean error when the provider fails', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockRejectedValue(
      new Error('provider exploded'),
    );

    await expect(service.chat('user123', messages)).rejects.toThrow(
      'provider exploded',
    );
  });

  it('does not throw if best-effort usage recording fails', async () => {
    await build();
    (mockProvider.chat as jest.Mock).mockResolvedValue(makeResponse('reply'));
    (quotaService.recordUsageAndIncrement as jest.Mock).mockRejectedValue(
      new Error('db down'),
    );

    await expect(service.chat('user123', messages)).resolves.toBe('reply');
  });
});
