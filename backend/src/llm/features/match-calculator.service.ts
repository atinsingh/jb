import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import {
  JobMatchResponseSchema,
  JobMatchResponse,
} from '@jobocate/contracts';
import { z } from 'zod';

/**
 * MatchCalculatorService
 *
 * Modern `llm/`-stack replacement for the legacy
 * `AiProviderService.calculateJobMatch`. Returns the identical shape
 * `{ matchScore, matchedSkills, missingSkills, reasoning }` so callers
 * (job-matching / matching) can migrate onto it in Wave 2d-2.
 *
 * Quota is NOT enforced by default — see the class-level `enforceQuotaEnabled`
 * note. Callers own their deterministic fallbacks, so this service only throws
 * clean errors and never fabricates a fallback here.
 */
@Injectable()
export class MatchCalculatorService {
  private readonly logger = new Logger(MatchCalculatorService.name);

  /**
   * Whether to gate LLM calls on the candidate/employer quota system.
   *
   * The legacy flows this service replaces had NO quota and worked for ALL
   * users including FREE, which seeded `ai_credits_per_month = 0` until the
   * allowance landed (now 25) — so unconditional `enforceQuota` would once have
   * handed every FREE user a `ForbiddenException`. Enforcement stays opt-in via
   * `LLM_ENFORCE_QUOTA`
   * (default `false`). When disabled we SKIP `enforceQuota` but still record
   * usage best-effort for accounting (wrapped so it never throws).
   */
  private readonly enforceQuotaEnabled: boolean;

  constructor(
    private readonly routingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
    private readonly configService: ConfigService,
  ) {
    this.enforceQuotaEnabled =
      (this.configService.get<string>('LLM_ENFORCE_QUOTA') || 'false')
        .toString()
        .toLowerCase() === 'true';
  }

  /**
   * Analyze the match between a candidate's skills and a job.
   * @returns { matchScore, matchedSkills, missingSkills, reasoning }
   * @throws a clean Error on provider/parse/validation failure so the caller
   *         can fall back to its deterministic result.
   */
  async calculateMatch(
    userId: string,
    candidateSkills: string[],
    jobRequirements: string,
    jobDescription: string,
  ): Promise<JobMatchResponse> {
    if (this.enforceQuotaEnabled) {
      await this.quotaService.enforceQuota(userId, LLMFeature.CALCULATE_MATCH);
    }

    const provider = this.routingService.getProviderForFeature(
      LLMFeature.CALCULATE_MATCH,
    );
    const config = this.routingService.getFeatureConfig(
      LLMFeature.CALCULATE_MATCH,
    );

    const prompt = `Analyze the match between this candidate and job. Return ONLY valid JSON:
{
  "matchScore": 85,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "reasoning": "detailed explanation of the match"
}

Candidate Skills: ${candidateSkills.join(', ')}
Job Requirements: ${jobRequirements}
Job Description: ${jobDescription}

Provide a match score (0-100) and detailed analysis.`;

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are a job matching expert. Analyze matches and return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const parsed = this.parseJsonContent(response.content);
      const validated = JobMatchResponseSchema.parse(parsed);

      await this.recordUsageBestEffort(
        userId,
        provider.getName(),
        config.model,
        response.usage,
        { candidateSkillsCount: candidateSkills.length },
      );

      return validated;
    } catch (error: any) {
      // NOTE: the schema is compiled against the contracts package's OWN copy
      // of zod, so a ZodError thrown by `.parse` is NOT an instance of this
      // module's `z.ZodError`. Detect by name as well so the friendly,
      // caller-catchable message is produced regardless of the zod instance.
      if (error instanceof z.ZodError || error?.name === 'ZodError') {
        const issues = error.errors ?? error.issues ?? [];
        this.logger.error('Zod validation error:', issues);
        throw new Error(
          `Invalid job-match response format from LLM: ${issues
            .map((e: any) => e.message)
            .join(', ')}`,
        );
      }
      this.logger.error('Error calculating job match:', error);
      throw error;
    }
  }

  private parseJsonContent(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('Invalid JSON response from LLM');
    }
  }

  private async recordUsageBestEffort(
    userId: string,
    provider: string,
    model: string,
    usage: any,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.CALCULATE_MATCH,
        provider,
        model,
        usage,
        metadata,
      );
    } catch (err) {
      this.logger.warn(
        `recordUsageAndIncrement failed (non-fatal) for calculateMatch: ${
          (err as Error)?.message
        }`,
      );
    }
  }
}
