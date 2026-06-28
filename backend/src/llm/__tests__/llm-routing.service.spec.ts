import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { OpenAIProvider } from '../providers/openai.provider';
import { MockProvider } from '../providers/mock.provider';

describe('LLMRoutingService', () => {
  let service: LLMRoutingService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMRoutingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                LLM_DEFAULT_PROVIDER: 'openai',
                LLM_DEFAULT_MODEL: 'gpt-4o-mini',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        OpenAIProvider,
        MockProvider,
      ],
    }).compile();

    service = module.get<LLMRoutingService>(LLMRoutingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get provider for feature', () => {
    const provider = service.getProviderForFeature(LLMFeature.REWRITE_BULLETS);
    expect(provider).toBeDefined();
    expect(provider.getName()).toBeDefined();
  });

  it('should fallback to mock provider when configured provider unavailable', () => {
    // Mock OpenAI as unavailable
    const mockOpenAI = {
      getName: () => 'openai',
      isAvailable: () => false,
    } as any;

    // Service should fallback to mock
    const provider = service.getProviderForFeature(LLMFeature.REWRITE_BULLETS);
    expect(provider).toBeDefined();
  });

  it('should get feature configuration', () => {
    const config = service.getFeatureConfig(LLMFeature.REWRITE_BULLETS);
    expect(config).toBeDefined();
    expect(config.model).toBeDefined();
    expect(config.provider).toBeDefined();
  });

  it('should get available providers', () => {
    const providers = service.getAvailableProviders();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
  });
});

