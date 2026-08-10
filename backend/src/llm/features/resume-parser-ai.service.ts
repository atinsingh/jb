import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import {
  ResumeParseResponseSchema,
  ResumeParseResponse,
} from '@jobocate/contracts';
import { z } from 'zod';

/**
 * ResumeParserAIService
 *
 * Modern `llm/`-stack replacement for the legacy
 * `AiProviderService.parseResume`. Returns the identical structured shape
 * `{ name, email, phone, summary, skills, experience[], education[] }`.
 *
 * Quota is NOT enforced by default (`LLM_ENFORCE_QUOTA`, default `false`) —
 * see `enforceQuotaEnabled`. Callers own their deterministic fallbacks, so
 * this service only throws clean errors and never fabricates output.
 */
@Injectable()
export class ResumeParserAIService {
  private readonly logger = new Logger(ResumeParserAIService.name);

  /**
   * Opt-in quota gate. FREE users seed `ai_credits_per_month = 0`, so
   * enforcing quota here would lock every FREE user out of resume parsing
   * (which had no quota in the legacy flow). Defaults OFF; when off we skip
   * `enforceQuota` and only record usage best-effort.
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
   * Extract structured data from raw resume text.
   * @returns { name, email, phone, summary, skills, experience[], education[] }
   * @throws a clean Error on provider/parse/validation failure so the caller
   *         can fall back to its deterministic parser.
   */
  async parseResume(userId: string, text: string): Promise<ResumeParseResponse> {
    if (this.enforceQuotaEnabled) {
      await this.quotaService.enforceQuota(userId, LLMFeature.PARSE_RESUME);
    }

    const provider = this.routingService.getProviderForFeature(
      LLMFeature.PARSE_RESUME,
    );
    const config = this.routingService.getFeatureConfig(
      LLMFeature.PARSE_RESUME,
    );

    const prompt = `Extract structured information from this resume. Return ONLY valid JSON with these fields:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "summary": "professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "duration": "time period",
      "description": "job description"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "school name",
      "year": "graduation year"
    }
  ]
}

Resume text:
${text}`;

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are a resume parser. Extract structured data and return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const parsed = this.parseJsonContent(response.content);
      const validated = ResumeParseResponseSchema.parse(parsed);

      await this.recordUsageBestEffort(
        userId,
        provider.getName(),
        config.model,
        response.usage,
        { textLength: text.length },
      );

      return validated;
    } catch (error: any) {
      // The schema is compiled against the contracts package's own copy of
      // zod, so a ZodError from `.parse` is not an instance of this module's
      // `z.ZodError` — detect by name too so the friendly, caller-catchable
      // message is produced regardless of the zod instance.
      if (error instanceof z.ZodError || error?.name === 'ZodError') {
        const issues = error.errors ?? error.issues ?? [];
        this.logger.error('Zod validation error:', issues);
        throw new Error(
          `Invalid resume-parse response format from LLM: ${issues
            .map((e: any) => e.message)
            .join(', ')}`,
        );
      }
      this.logger.error('Error parsing resume:', error);
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
        LLMFeature.PARSE_RESUME,
        provider,
        model,
        usage,
        metadata,
      );
    } catch (err) {
      this.logger.warn(
        `recordUsageAndIncrement failed (non-fatal) for parseResume: ${
          (err as Error)?.message
        }`,
      );
    }
  }
}
