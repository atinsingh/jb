import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { OpenAIProvider } from '../providers/openai.provider';
import { MockProvider } from '../providers/mock.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';
import {
  OpenRouterProvider,
  DEFAULT_OPENROUTER_MODEL,
} from '../providers/openrouter.provider';
import {
  LiteLLMProvider,
  DEFAULT_LITELLM_MODEL,
} from '../providers/litellm.provider';

describe('LLMRoutingService', () => {
  /**
   * Availability is the thing under test here (it drives the fallback chain),
   * so every provider is a stub whose isAvailable() we control.
   */
  const stubProvider = (name: string, available: boolean) =>
    ({
      getName: () => name,
      isAvailable: () => available,
      complete: jest.fn(),
      chat: jest.fn(),
    }) as any;

  const buildService = async (
    availability: {
      openai?: boolean;
      anthropic?: boolean;
      litellm?: boolean;
      openrouter?: boolean;
    },
    config: Record<string, any> = {},
  ): Promise<LLMRoutingService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LLMRoutingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: any) =>
                ({
                  LLM_DEFAULT_PROVIDER: 'openai',
                  LLM_DEFAULT_MODEL: 'gpt-4o-mini',
                  ...config,
                })[key] ?? defaultValue,
            ),
          },
        },
        {
          provide: OpenAIProvider,
          useValue: stubProvider('openai', availability.openai ?? true),
        },
        { provide: MockProvider, useValue: stubProvider('mock', true) },
        {
          provide: AnthropicProvider,
          useValue: stubProvider('anthropic', availability.anthropic ?? true),
        },
        {
          provide: LiteLLMProvider,
          useValue: stubProvider('litellm', availability.litellm ?? false),
        },
        {
          provide: OpenRouterProvider,
          useValue: stubProvider('openrouter', availability.openrouter ?? false),
        },
      ],
    }).compile();

    return module.get<LLMRoutingService>(LLMRoutingService);
  };

  it('routes a feature to its configured provider when that provider is available', async () => {
    const service = await buildService({ openai: true });

    expect(
      service.getProviderForFeature(LLMFeature.REWRITE_BULLETS).getName(),
    ).toBe('openai');
    expect(service.getFeatureConfig(LLMFeature.REWRITE_BULLETS)).toEqual(
      expect.objectContaining({ provider: 'openai', model: 'gpt-4o-mini' }),
    );
  });

  it('registers OpenRouter only when it has a key', async () => {
    expect(
      (await buildService({ openrouter: false })).getAvailableProviders(),
    ).not.toContain('openrouter');
    expect(
      (await buildService({ openrouter: true })).getAvailableProviders(),
    ).toContain('openrouter');
  });

  it('falls back to OpenRouter — not mock — when the configured provider has no key', async () => {
    const service = await buildService({ openai: false, openrouter: true });

    expect(
      service.getProviderForFeature(LLMFeature.REWRITE_BULLETS).getName(),
    ).toBe('openrouter');
  });

  // ---------------------------------------------------------------- LiteLLM --
  // The self-hosted gateway is preferred over OpenRouter on fallback: it costs
  // nothing per token and the request stays on the operator's own network.
  describe('LiteLLM (self-hosted gateway)', () => {
    it('routes directly to LiteLLM when it is the configured default', async () => {
      const service = await buildService(
        { litellm: true },
        {
          LLM_DEFAULT_PROVIDER: 'litellm',
          LLM_DEFAULT_MODEL: DEFAULT_LITELLM_MODEL,
        },
      );

      expect(
        service.getProviderForFeature(LLMFeature.REWRITE_BULLETS).getName(),
      ).toBe('litellm');
    });

    it('is preferred over OpenRouter when both gateways are available', async () => {
      const service = await buildService({
        openai: false,
        litellm: true,
        openrouter: true,
      });

      expect(
        service.getProviderForFeature(LLMFeature.REWRITE_BULLETS).getName(),
      ).toBe('litellm');
    });

    it('substitutes its own alias, since a provider-native id is not a LiteLLM alias', async () => {
      // SCREEN_APPLICANTS is pinned to anthropic/claude-opus-4-8 in the config.
      const service = await buildService({ anthropic: false, litellm: true });

      const config = service.getFeatureConfig(LLMFeature.SCREEN_APPLICANTS);
      expect(config.provider).toBe('litellm');
      expect(config.model).toBe(DEFAULT_LITELLM_MODEL);
      // Feature tuning survives the substitution.
      expect(config.temperature).toBe(0.3);
      expect(config.maxTokens).toBe(2000);
    });

    it('honours LITELLM_MODEL for the fallback alias', async () => {
      const service = await buildService(
        { openai: false, litellm: true },
        { LITELLM_MODEL: 'perfectum-structured-v1' },
      );

      expect(service.getFeatureConfig(LLMFeature.REWRITE_BULLETS).model).toBe(
        'perfectum-structured-v1',
      );
    });

    it('falls through to OpenRouter when the gateway is not running', async () => {
      const service = await buildService({
        openai: false,
        litellm: false,
        openrouter: true,
      });

      expect(
        service.getProviderForFeature(LLMFeature.REWRITE_BULLETS).getName(),
      ).toBe('openrouter');
    });

    it('still reaches mock when no provider at all is available', async () => {
      const service = await buildService({
        openai: false,
        anthropic: false,
        litellm: false,
        openrouter: false,
      });

      expect(
        service.getProviderForFeature(LLMFeature.REWRITE_BULLETS).getName(),
      ).toBe('mock');
    });
  });

  it('rewrites the model id when falling back, since provider-native ids are not OpenRouter slugs', async () => {
    // SCREEN_APPLICANTS is pinned to anthropic/claude-opus-4-8 in the config.
    const service = await buildService({ anthropic: false, openrouter: true });

    const config = service.getFeatureConfig(LLMFeature.SCREEN_APPLICANTS);
    expect(config.provider).toBe('openrouter');
    expect(config.model).toBe(DEFAULT_OPENROUTER_MODEL);
    // Feature tuning is preserved across the fallback.
    expect(config.temperature).toBe(0.3);
    expect(config.maxTokens).toBe(2000);
  });

  it('honours OPENROUTER_MODEL for the fallback model id', async () => {
    const service = await buildService(
      { anthropic: false, openrouter: true },
      { OPENROUTER_MODEL: 'anthropic/claude-opus-4.8' },
    );

    expect(service.getFeatureConfig(LLMFeature.SCREEN_APPLICANTS).model).toBe(
      'anthropic/claude-opus-4.8',
    );
  });

  it('keeps provider and config in agreement on every fallback path', async () => {
    const service = await buildService({
      openai: false,
      anthropic: false,
      openrouter: true,
    });

    for (const feature of Object.values(LLMFeature)) {
      expect(service.getFeatureConfig(feature).provider).toBe(
        service.getProviderForFeature(feature).getName(),
      );
    }
  });

  it('falls back to mock when neither the configured provider nor OpenRouter is available', async () => {
    const service = await buildService({
      openai: false,
      anthropic: false,
      openrouter: false,
    });

    expect(
      service.getProviderForFeature(LLMFeature.REWRITE_BULLETS).getName(),
    ).toBe('mock');
    expect(service.getFeatureConfig(LLMFeature.REWRITE_BULLETS).provider).toBe(
      'mock',
    );
  });

  it('throws for a feature with no configuration', async () => {
    const service = await buildService({});

    expect(() =>
      service.getProviderForFeature('nonexistent' as LLMFeature),
    ).toThrow(/No configuration found/);
  });
});
