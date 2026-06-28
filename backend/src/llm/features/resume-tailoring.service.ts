import { Injectable, Logger } from '@nestjs/common';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { ClaimsReviewService } from '../claims-review.service';
import {
  ResumeTailoringResponseSchema,
  ResumeTailoringResponse,
} from '@jobocate/contracts';
import { z } from 'zod';

@Injectable()
export class ResumeTailoringService {
  private readonly logger = new Logger(ResumeTailoringService.name);

  constructor(
    private readonly routingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
    private readonly claimsReviewService: ClaimsReviewService,
  ) {}

  /**
   * Tailor resume to job description
   */
  async tailorResume(
    userId: string,
    resumeJson: Record<string, any>,
    jobDescription: string,
  ): Promise<ResumeTailoringResponse> {
    // Check quota
    await this.quotaService.enforceQuota(userId, LLMFeature.TAILOR_RESUME);

    const provider = this.routingService.getProviderForFeature(
      LLMFeature.TAILOR_RESUME,
    );
    const config = this.routingService.getFeatureConfig(LLMFeature.TAILOR_RESUME);

    const prompt = this.buildPrompt(resumeJson, jobDescription);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are an expert resume tailor. Update the resume to better match the job description while maintaining authenticity. Return ONLY valid JSON matching this schema:
{
  "updatedResume": { /* updated resume JSON */ },
  "keywordMap": {
    "matched": ["keyword1", "keyword2"],
    "added": ["keyword3"],
    "removed": ["keyword4"]
  },
  "changeLog": [
    {
      "section": "summary",
      "action": "updated",
      "reason": "Better alignment with job requirements",
      "before": "old text",
      "after": "new text"
    }
  ],
  "confidence": 0.85
}`,
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      // Parse and validate
      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (error) {
        const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      // Validate with Zod
      const validated = ResumeTailoringResponseSchema.parse(parsed);

      // Check for unverifiable claims in updated resume
      const resumeText = JSON.stringify(validated.updatedResume);
      const claims = await this.claimsReviewService.detectUnverifiableClaims(
        resumeText,
        LLMFeature.TAILOR_RESUME,
      );

      if (claims.length > 0) {
        this.logger.warn(
          `Found ${claims.length} unverifiable claims in resume tailoring`,
        );
        for (const claim of claims) {
          await this.claimsReviewService.createReviewRequest(
            userId,
            LLMFeature.TAILOR_RESUME,
            JSON.stringify(resumeJson),
            resumeText,
            claim.claim,
            { confidence: validated.confidence },
          );
        }
      }

      // Record usage
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.TAILOR_RESUME,
        provider.getName(),
        config.model,
        response.usage,
        { jobDescriptionLength: jobDescription.length },
      );

      return validated;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.logger.error('Zod validation error:', error.errors);
        throw new Error(
          `Invalid response format from LLM: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.logger.error('Error tailoring resume:', error);
      throw error;
    }
  }

  private buildPrompt(
    resumeJson: Record<string, any>,
    jobDescription: string,
  ): string {
    return `Tailor this resume to match the job description:

RESUME (JSON):
${JSON.stringify(resumeJson, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Update the resume to:
1. Incorporate relevant keywords from the job description
2. Emphasize matching skills and experiences
3. Adjust summary and descriptions to align with role requirements
4. Maintain authenticity - don't add false information

Provide:
- Updated resume JSON
- Keyword mapping (matched, added, removed)
- Change log with before/after for each modification
- Confidence score (0-1)`;
  }
}

