import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider } from './interfaces/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { MockProvider } from './providers/mock.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import {
  OpenRouterProvider,
  DEFAULT_OPENROUTER_MODEL,
} from './providers/openrouter.provider';
import {
  LiteLLMProvider,
  DEFAULT_LITELLM_MODEL,
} from './providers/litellm.provider';

export enum LLMFeature {
  REWRITE_BULLETS = 'rewriteBullets',
  TAILOR_RESUME = 'tailorResume',
  GENERATE_COVER_LETTER = 'generateCoverLetter',
  MOCK_INTERVIEW = 'mockInterview',
  PARSE_RESUME = 'parseResume',
  CALCULATE_MATCH = 'calculateMatch',
  INTERVIEW_COACHING = 'interviewCoaching',
  INTERVIEW_SCORING = 'interviewScoring',
  // Employer "AI Recruiter" features
  SCREEN_APPLICANTS = 'screenApplicants',
  RECRUITER_COPILOT = 'recruiterCopilot',
  SOURCE_CANDIDATES = 'sourceCandidates',
  INTERVIEW_SCORECARD = 'interviewScorecard',
  GENERATE_JOB_DESCRIPTION = 'generateJobDescription',
  // Generic reusable AI agent runtime (planner/executor loop). Individual
  // agents (e.g. the Job-Search Copilot) run on this feature unless they
  // define their own dedicated feature.
  AGENT_RUNTIME = 'agentRuntime',
  // Candidate Job-Search Copilot — a dedicated agent that runs on the agent
  // runtime (find matches → cover letter → apply → track → follow up). Has its
  // own feature so it can be routed/metered independently of the generic runtime.
  JOB_SEARCH_COPILOT = 'jobSearchCopilot',
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

  /** Features already warned about a provider fallback — keeps logs to one line each. */
  private readonly fallbackWarned = new Set<LLMFeature>();

  constructor(
    private readonly configService: ConfigService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly mockProvider: MockProvider,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly litellmProvider: LiteLLMProvider,
    private readonly openrouterProvider: OpenRouterProvider,
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

    // Register Anthropic (real Claude provider) when an API key is present
    if (this.anthropicProvider.isAvailable()) {
      this.providers.set('anthropic', this.anthropicProvider);
      this.logger.log('✅ Anthropic provider registered');
    }

    // Register the self-hosted LiteLLM gateway when configured.
    if (this.litellmProvider.isAvailable()) {
      this.providers.set('litellm', this.litellmProvider);
      this.logger.log('✅ LiteLLM provider registered');
    }

    // Register OpenRouter (OpenAI-compatible gateway to ~400 models)
    if (this.openrouterProvider.isAvailable()) {
      this.providers.set('openrouter', this.openrouterProvider);
      this.logger.log('✅ OpenRouter provider registered');
    }

    // Register Mock provider (always available)
    this.providers.set('mock', this.mockProvider);
    this.logger.log('✅ Mock provider registered');
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

    // Employer "AI Recruiter" features default to the Anthropic (Claude)
    // provider + a current-gen model, so they are genuinely Claude-backed once
    // ANTHROPIC_API_KEY is present. Without a key the router falls back to Mock,
    // and each caller falls back to its deterministic result.

    // Screen Applicants
    this.featureConfigs.set(LLMFeature.SCREEN_APPLICANTS, {
      model: this.configService.get<string>('LLM_SCREEN_APPLICANTS_MODEL') || 'claude-opus-4-8',
      provider: this.configService.get<string>('LLM_SCREEN_APPLICANTS_PROVIDER') || 'anthropic',
      temperature: parseFloat(this.configService.get<string>('LLM_SCREEN_APPLICANTS_TEMP') || '0.3'),
      maxTokens: parseInt(this.configService.get<string>('LLM_SCREEN_APPLICANTS_MAX_TOKENS') || '2000'),
    });

    // Recruiter Copilot
    this.featureConfigs.set(LLMFeature.RECRUITER_COPILOT, {
      model: this.configService.get<string>('LLM_RECRUITER_COPILOT_MODEL') || 'claude-opus-4-8',
      provider: this.configService.get<string>('LLM_RECRUITER_COPILOT_PROVIDER') || 'anthropic',
      temperature: parseFloat(this.configService.get<string>('LLM_RECRUITER_COPILOT_TEMP') || '0.6'),
      maxTokens: parseInt(this.configService.get<string>('LLM_RECRUITER_COPILOT_MAX_TOKENS') || '600'),
    });

    // Source Candidates
    this.featureConfigs.set(LLMFeature.SOURCE_CANDIDATES, {
      model: this.configService.get<string>('LLM_SOURCE_CANDIDATES_MODEL') || 'claude-opus-4-8',
      provider: this.configService.get<string>('LLM_SOURCE_CANDIDATES_PROVIDER') || 'anthropic',
      temperature: parseFloat(this.configService.get<string>('LLM_SOURCE_CANDIDATES_TEMP') || '0.5'),
      maxTokens: parseInt(this.configService.get<string>('LLM_SOURCE_CANDIDATES_MAX_TOKENS') || '2000'),
    });

    // Interview Scorecard
    this.featureConfigs.set(LLMFeature.INTERVIEW_SCORECARD, {
      model: this.configService.get<string>('LLM_INTERVIEW_SCORECARD_MODEL') || 'claude-opus-4-8',
      provider: this.configService.get<string>('LLM_INTERVIEW_SCORECARD_PROVIDER') || 'anthropic',
      temperature: parseFloat(this.configService.get<string>('LLM_INTERVIEW_SCORECARD_TEMP') || '0.3'),
      maxTokens: parseInt(this.configService.get<string>('LLM_INTERVIEW_SCORECARD_MAX_TOKENS') || '2000'),
    });

    // Generate Job Description — drafts responsibilities/requirements/benefits
    // from what the employer has already typed (title, company, location,
    // skills). A draft the employer edits before Preview & Submit, not a
    // publish, so temperature sits higher than the screening features above.
    this.featureConfigs.set(LLMFeature.GENERATE_JOB_DESCRIPTION, {
      model: this.configService.get<string>('LLM_JOB_DESCRIPTION_MODEL') || 'claude-opus-4-8',
      provider: this.configService.get<string>('LLM_JOB_DESCRIPTION_PROVIDER') || 'anthropic',
      temperature: parseFloat(this.configService.get<string>('LLM_JOB_DESCRIPTION_TEMP') || '0.6'),
      maxTokens: parseInt(this.configService.get<string>('LLM_JOB_DESCRIPTION_MAX_TOKENS') || '1500'),
    });

    // Agent Runtime (generic tool-use agent loop). Defaults to Claude via the
    // Anthropic provider; falls back to Mock when no key is present. The per-turn
    // maxTokens caps a single LLM turn — the whole-run token budget is enforced
    // separately by AgentRuntimeService.
    this.featureConfigs.set(LLMFeature.AGENT_RUNTIME, {
      model: this.configService.get<string>('LLM_AGENT_RUNTIME_MODEL') || 'claude-opus-4-8',
      provider: this.configService.get<string>('LLM_AGENT_RUNTIME_PROVIDER') || 'anthropic',
      temperature: parseFloat(this.configService.get<string>('LLM_AGENT_RUNTIME_TEMP') || '0.4'),
      maxTokens: parseInt(this.configService.get<string>('LLM_AGENT_RUNTIME_MAX_TOKENS') || '4000'),
    });

    // Job-Search Copilot (candidate). Defaults to Claude (Opus) via Anthropic;
    // falls back to Mock when no key is present. Per-turn maxTokens caps a single
    // LLM turn — the whole-run token budget is enforced by AgentRuntimeService.
    this.featureConfigs.set(LLMFeature.JOB_SEARCH_COPILOT, {
      model: this.configService.get<string>('LLM_JOB_SEARCH_COPILOT_MODEL') || 'claude-opus-4-8',
      provider: this.configService.get<string>('LLM_JOB_SEARCH_COPILOT_PROVIDER') || 'anthropic',
      temperature: parseFloat(this.configService.get<string>('LLM_JOB_SEARCH_COPILOT_TEMP') || '0.4'),
      maxTokens: parseInt(this.configService.get<string>('LLM_JOB_SEARCH_COPILOT_MAX_TOKENS') || '4000'),
    });
  }

  /**
   * Resolve a feature to the provider that will actually serve it, plus the
   * config matching that provider.
   *
   * `getProviderForFeature` and `getFeatureConfig` are separate calls at every
   * call site, so they must agree: resolving both here stops a feature from
   * sending, say, a `claude-opus-4-8` model id to OpenRouter.
   *
   * Order: the configured provider → LiteLLM → OpenRouter → Mock. The two
   * gateways sit in the middle because each fronts many models, so a feature
   * pinned to a provider we hold no key for still reaches a real model instead
   * of degrading to the deterministic fallback. Self-hosted LiteLLM is tried
   * first: it costs nothing per token and keeps the request on the operator's
   * own infrastructure. Both take their model id from their own env var, never
   * from the feature config, since provider-native ids are neither OpenRouter
   * slugs nor LiteLLM aliases.
   */
  private resolveFeature(feature: LLMFeature): {
    provider: LLMProvider;
    config: FeatureModelConfig;
  } {
    const config = this.featureConfigs.get(feature);
    if (!config) {
      throw new Error(`No configuration found for feature: ${feature}`);
    }

    const configured = this.providers.get(config.provider);
    if (configured?.isAvailable()) {
      return { provider: configured, config: { ...config } };
    }

    // Self-hosted gateway first: it costs nothing per token and keeps the
    // request inside the operator's network, so preferring it over a paid
    // routing intermediary is both cheaper and less of a data-sharing decision.
    // Its model id must come from LITELLM_MODEL, never from the feature config —
    // LiteLLM aliases are operator-defined and a provider-native id (say, an
    // Anthropic model string) is not guaranteed to exist in its catalog.
    const litellm = this.providers.get('litellm');
    if (litellm?.isAvailable()) {
      this.warnFallbackOnce(feature, config.provider, 'litellm');
      return {
        provider: litellm,
        config: {
          ...config,
          provider: 'litellm',
          model:
            this.configService.get<string>('LITELLM_MODEL') ||
            DEFAULT_LITELLM_MODEL,
        },
      };
    }

    const openrouter = this.providers.get('openrouter');
    if (openrouter?.isAvailable()) {
      this.warnFallbackOnce(feature, config.provider, 'openrouter');
      return {
        provider: openrouter,
        config: {
          ...config,
          provider: 'openrouter',
          model:
            this.configService.get<string>('OPENROUTER_MODEL') ||
            DEFAULT_OPENROUTER_MODEL,
        },
      };
    }

    this.warnFallbackOnce(feature, config.provider, 'mock');
    return {
      provider: this.mockProvider,
      config: { ...config, provider: 'mock' },
    };
  }

  private warnFallbackOnce(feature: LLMFeature, from: string, to: string) {
    if (this.fallbackWarned.has(feature)) return;
    this.fallbackWarned.add(feature);
    this.logger.warn(
      `Provider ${from} not available for ${feature}, falling back to ${to}`,
    );
  }

  /**
   * Get the appropriate provider for a feature
   */
  getProviderForFeature(feature: LLMFeature): LLMProvider {
    return this.resolveFeature(feature).provider;
  }

  /**
   * Get model configuration for a feature
   */
  getFeatureConfig(feature: LLMFeature): FeatureModelConfig {
    return this.resolveFeature(feature).config;
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

