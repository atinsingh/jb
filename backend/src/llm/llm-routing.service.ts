import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMProvider } from './interfaces/llm-provider.interface';
import { OwnerLlmService } from './owner-llm.service';

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
  CANDIDATE_ATS_REVIEW = 'candidateAtsReview',
  EMPLOYER_ATS_REVIEW = 'employerAtsReview',
}

export interface FeatureModelConfig {
  model: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class LLMRoutingService {
  private featureConfigs = new Map<LLMFeature, FeatureModelConfig>();
  constructor(
    private readonly configService: ConfigService,
    private readonly owners: OwnerLlmService,
  ) {
    this.initializeFeatureConfigs();
  }

  private initializeFeatureConfigs() {
    // Configure models per feature via environment variables
    const defaultProvider = 'litellm';
    const defaultModel =
      this.configService.get<string>('DEFAULT_AUTOMATIC_MODEL_ALIAS') || '';

    // Rewrite Bullets
    this.featureConfigs.set(LLMFeature.REWRITE_BULLETS, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_REWRITE_BULLETS_TEMP') || '0.7',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_REWRITE_BULLETS_MAX_TOKENS') ||
          '500',
      ),
    });

    // Tailor Resume
    this.featureConfigs.set(LLMFeature.TAILOR_RESUME, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_TAILOR_RESUME_TEMP') || '0.5',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_TAILOR_RESUME_MAX_TOKENS') ||
          '2000',
      ),
    });

    // Generate Cover Letter
    this.featureConfigs.set(LLMFeature.GENERATE_COVER_LETTER, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_COVER_LETTER_TEMP') || '0.7',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_COVER_LETTER_MAX_TOKENS') || '1000',
      ),
    });

    // Mock Interview
    this.featureConfigs.set(LLMFeature.MOCK_INTERVIEW, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_MOCK_INTERVIEW_TEMP') || '0.8',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_MOCK_INTERVIEW_MAX_TOKENS') ||
          '500',
      ),
    });

    // Parse Resume
    this.featureConfigs.set(LLMFeature.PARSE_RESUME, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_PARSE_RESUME_TEMP') || '0.3',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_PARSE_RESUME_MAX_TOKENS') || '2000',
      ),
    });

    // Calculate Match
    this.featureConfigs.set(LLMFeature.CALCULATE_MATCH, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_CALCULATE_MATCH_TEMP') || '0.5',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_CALCULATE_MATCH_MAX_TOKENS') ||
          '1500',
      ),
    });

    // Interview Coaching
    this.featureConfigs.set(LLMFeature.INTERVIEW_COACHING, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_INTERVIEW_COACHING_TEMP') || '0.7',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_INTERVIEW_COACHING_MAX_TOKENS') ||
          '2000',
      ),
    });

    // Interview Scoring
    this.featureConfigs.set(LLMFeature.INTERVIEW_SCORING, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_INTERVIEW_SCORING_TEMP') || '0.3',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_INTERVIEW_SCORING_MAX_TOKENS') ||
          '2000',
      ),
    });

    // Screen Applicants
    this.featureConfigs.set(LLMFeature.SCREEN_APPLICANTS, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_SCREEN_APPLICANTS_TEMP') || '0.3',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_SCREEN_APPLICANTS_MAX_TOKENS') ||
          '2000',
      ),
    });

    // Recruiter Copilot
    this.featureConfigs.set(LLMFeature.RECRUITER_COPILOT, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_RECRUITER_COPILOT_TEMP') || '0.6',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_RECRUITER_COPILOT_MAX_TOKENS') ||
          '600',
      ),
    });

    // Source Candidates
    this.featureConfigs.set(LLMFeature.SOURCE_CANDIDATES, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_SOURCE_CANDIDATES_TEMP') || '0.5',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_SOURCE_CANDIDATES_MAX_TOKENS') ||
          '2000',
      ),
    });

    // Interview Scorecard
    this.featureConfigs.set(LLMFeature.INTERVIEW_SCORECARD, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_INTERVIEW_SCORECARD_TEMP') || '0.3',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_INTERVIEW_SCORECARD_MAX_TOKENS') ||
          '2000',
      ),
    });

    // Generate Job Description — drafts responsibilities/requirements/benefits
    // from what the employer has already typed (title, company, location,
    // skills). A draft the employer edits before Preview & Submit, not a
    // publish, so temperature sits higher than the screening features above.
    this.featureConfigs.set(LLMFeature.GENERATE_JOB_DESCRIPTION, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_JOB_DESCRIPTION_TEMP') || '0.6',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_JOB_DESCRIPTION_MAX_TOKENS') ||
          '1500',
      ),
    });

    this.featureConfigs.set(LLMFeature.AGENT_RUNTIME, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_AGENT_RUNTIME_TEMP') || '0.4',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_AGENT_RUNTIME_MAX_TOKENS') ||
          '4000',
      ),
    });

    this.featureConfigs.set(LLMFeature.JOB_SEARCH_COPILOT, {
      model: defaultModel,
      provider: defaultProvider,
      temperature: parseFloat(
        this.configService.get<string>('LLM_JOB_SEARCH_COPILOT_TEMP') || '0.4',
      ),
      maxTokens: parseInt(
        this.configService.get<string>('LLM_JOB_SEARCH_COPILOT_MAX_TOKENS') ||
          '4000',
      ),
    });
  }

  getProviderForFeature(feature: LLMFeature, ownerId: string): LLMProvider {
    if (!ownerId) throw new Error('An authenticated AI owner is required');
    this.getFeatureConfig(feature);
    return {
      getName: () => 'litellm',
      isAvailable: () => true,
      complete: (prompt, options) =>
        this.owners.run(ownerId, feature, ({ provider, alias }) =>
          provider.complete(prompt, { ...options, model: alias }),
        ),
      chat: (options) =>
        this.owners.run(ownerId, feature, ({ provider, alias }) =>
          provider.chat({ ...options, model: alias }),
        ),
      chatWithTools: (options) =>
        this.owners.run(ownerId, feature, ({ provider, alias }) =>
          provider.chatWithTools({ ...options, model: alias }),
        ),
    };
  }

  withOwnerOperation<T>(
    ownerId: string,
    feature: LLMFeature,
    run: () => Promise<T>,
  ): Promise<T> {
    return this.owners.run(ownerId, feature, run);
  }

  getFeatureConfig(feature: LLMFeature): FeatureModelConfig {
    const config = this.featureConfigs.get(feature);
    if (!config)
      throw new Error('No configuration found for feature: ' + feature);
    return { ...config };
  }

  getAvailableProviders(): string[] {
    return ['litellm'];
  }
}
