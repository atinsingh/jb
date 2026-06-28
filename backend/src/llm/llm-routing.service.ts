import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider } from './interfaces/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { MockProvider } from './providers/mock.provider';

export enum LLMFeature {
  REWRITE_BULLETS = 'rewriteBullets',
  TAILOR_RESUME = 'tailorResume',
  GENERATE_COVER_LETTER = 'generateCoverLetter',
  MOCK_INTERVIEW = 'mockInterview',
  PARSE_RESUME = 'parseResume',
  CALCULATE_MATCH = 'calculateMatch',
  INTERVIEW_COACHING = 'interviewCoaching',
  INTERVIEW_SCORING = 'interviewScoring',
}

export interface FeatureModelConfig {
  model: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class LLMRoutingService {
  private readonly logger = new Logger(LLMRoutingService.name);
  private providers: Map<string, LLMProvider> = new Map();
  private featureConfigs: Map<LLMFeature, FeatureModelConfig> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly mockProvider: MockProvider,
  ) {
    this.initializeProviders();
    this.initializeFeatureConfigs();
  }

  private initializeProviders() {
    // Register OpenAI
    if (this.openaiProvider.isAvailable()) {
      this.providers.set('openai', this.openaiProvider);
      this.logger.log('✅ OpenAI provider registered');
    }

    // Register Mock provider (always available)
    this.providers.set('mock', this.mockProvider);
    this.logger.log('✅ Mock provider registered');

    // Register Anthropic if available (can be added later)
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      // TODO: Add AnthropicProvider when implemented
      this.logger.log('⚠️ Anthropic provider not yet implemented');
    }
  }

  private initializeFeatureConfigs() {
    // Configure models per feature via environment variables
    const defaultProvider = this.configService.get<string>('LLM_DEFAULT_PROVIDER') || 'openai';
    const defaultModel = this.configService.get<string>('LLM_DEFAULT_MODEL') || 'gpt-4o-mini';

    // Rewrite Bullets
    this.featureConfigs.set(LLMFeature.REWRITE_BULLETS, {
      model: this.configService.get<string>('LLM_REWRITE_BULLETS_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_REWRITE_BULLETS_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_REWRITE_BULLETS_TEMP') || '0.7'),
      maxTokens: parseInt(this.configService.get<string>('LLM_REWRITE_BULLETS_MAX_TOKENS') || '500'),
    });

    // Tailor Resume
    this.featureConfigs.set(LLMFeature.TAILOR_RESUME, {
      model: this.configService.get<string>('LLM_TAILOR_RESUME_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_TAILOR_RESUME_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_TAILOR_RESUME_TEMP') || '0.5'),
      maxTokens: parseInt(this.configService.get<string>('LLM_TAILOR_RESUME_MAX_TOKENS') || '2000'),
    });

    // Generate Cover Letter
    this.featureConfigs.set(LLMFeature.GENERATE_COVER_LETTER, {
      model: this.configService.get<string>('LLM_COVER_LETTER_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_COVER_LETTER_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_COVER_LETTER_TEMP') || '0.7'),
      maxTokens: parseInt(this.configService.get<string>('LLM_COVER_LETTER_MAX_TOKENS') || '1000'),
    });

    // Mock Interview
    this.featureConfigs.set(LLMFeature.MOCK_INTERVIEW, {
      model: this.configService.get<string>('LLM_MOCK_INTERVIEW_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_MOCK_INTERVIEW_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_MOCK_INTERVIEW_TEMP') || '0.8'),
      maxTokens: parseInt(this.configService.get<string>('LLM_MOCK_INTERVIEW_MAX_TOKENS') || '500'),
    });

    // Parse Resume
    this.featureConfigs.set(LLMFeature.PARSE_RESUME, {
      model: this.configService.get<string>('LLM_PARSE_RESUME_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_PARSE_RESUME_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_PARSE_RESUME_TEMP') || '0.3'),
      maxTokens: parseInt(this.configService.get<string>('LLM_PARSE_RESUME_MAX_TOKENS') || '2000'),
    });

    // Calculate Match
    this.featureConfigs.set(LLMFeature.CALCULATE_MATCH, {
      model: this.configService.get<string>('LLM_CALCULATE_MATCH_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_CALCULATE_MATCH_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_CALCULATE_MATCH_TEMP') || '0.5'),
      maxTokens: parseInt(this.configService.get<string>('LLM_CALCULATE_MATCH_MAX_TOKENS') || '1500'),
    });

    // Interview Coaching
    this.featureConfigs.set(LLMFeature.INTERVIEW_COACHING, {
      model: this.configService.get<string>('LLM_INTERVIEW_COACHING_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_INTERVIEW_COACHING_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_INTERVIEW_COACHING_TEMP') || '0.7'),
      maxTokens: parseInt(this.configService.get<string>('LLM_INTERVIEW_COACHING_MAX_TOKENS') || '2000'),
    });

    // Interview Scoring
    this.featureConfigs.set(LLMFeature.INTERVIEW_SCORING, {
      model: this.configService.get<string>('LLM_INTERVIEW_SCORING_MODEL') || defaultModel,
      provider: this.configService.get<string>('LLM_INTERVIEW_SCORING_PROVIDER') || defaultProvider,
      temperature: parseFloat(this.configService.get<string>('LLM_INTERVIEW_SCORING_TEMP') || '0.3'),
      maxTokens: parseInt(this.configService.get<string>('LLM_INTERVIEW_SCORING_MAX_TOKENS') || '2000'),
    });
  }

  /**
   * Get the appropriate provider for a feature
   */
  getProviderForFeature(feature: LLMFeature): LLMProvider {
    const config = this.featureConfigs.get(feature);
    if (!config) {
      throw new Error(`No configuration found for feature: ${feature}`);
    }

    const provider = this.providers.get(config.provider);
    if (!provider) {
      this.logger.warn(`Provider ${config.provider} not available, falling back to mock`);
      return this.mockProvider;
    }

    if (!provider.isAvailable()) {
      this.logger.warn(`Provider ${config.provider} not available, falling back to mock`);
      return this.mockProvider;
    }

    return provider;
  }

  /**
   * Get model configuration for a feature
   */
  getFeatureConfig(feature: LLMFeature): FeatureModelConfig {
    const config = this.featureConfigs.get(feature);
    if (!config) {
      throw new Error(`No configuration found for feature: ${feature}`);
    }
    return { ...config };
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name]) => name);
  }
}

