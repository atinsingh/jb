import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { ClaimsReviewService } from '../claims-review.service';
import {
  CoverLetterResponseSchema,
  CoverLetterResponse,
} from '@jobocate/contracts';
import { z } from 'zod';

@Injectable()
export class CoverLetterGeneratorService {
  private readonly logger = new Logger(CoverLetterGeneratorService.name);

  // Quota is opt-in via LLM_ENFORCE_QUOTA (default false), matching the sibling
  // feature-services. Legacy cover-letter generation (now routed here from
  // matching/job-matching) had no quota. FREE now seeds a real allowance
  // (ai_credits_per_month=25), so enforcement no longer locks FREE users out —
  // but it stays opt-in until the per-feature costs are tuned against it.
  private readonly enforceQuotaEnabled: boolean;

  constructor(
    private readonly routingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
    private readonly claimsReviewService: ClaimsReviewService,
    private readonly configService: ConfigService,
  ) {
    this.enforceQuotaEnabled =
      (this.configService.get<string>('LLM_ENFORCE_QUOTA') || 'false')
        .toLowerCase() === 'true';
  }

  /**
   * Generate cover letter with structured sections
   */
  async generateCoverLetter(
    userId: string,
    candidateInfo: {
      name: string;
      email: string;
      skills: string[];
      experience?: string;
      summary?: string;
    },
    jobInfo: {
      title: string;
      companyName: string;
      description: string;
      requirements?: string[];
    },
  ): Promise<CoverLetterResponse> {
    // Check quota (opt-in via LLM_ENFORCE_QUOTA)
    if (this.enforceQuotaEnabled) {
      await this.quotaService.enforceQuota(userId, LLMFeature.GENERATE_COVER_LETTER);
    }

    const provider = this.routingService.getProviderForFeature(
      LLMFeature.GENERATE_COVER_LETTER,
    );
    const config = this.routingService.getFeatureConfig(
      LLMFeature.GENERATE_COVER_LETTER,
    );

    const prompt = this.buildPrompt(candidateInfo, jobInfo);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are a professional cover letter writer. Generate a compelling, personalized cover letter. Return ONLY valid JSON matching this schema:
{
  "sections": {
    "greeting": "Dear Hiring Manager,",
    "introduction": "I am writing to express...",
    "body": "With my experience in...",
    "closing": "I look forward to discussing...",
    "signature": "Sincerely, [Name]"
  },
  "finalLetter": "Complete formatted cover letter",
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
      const validated = CoverLetterResponseSchema.parse(parsed);

      // Check for unverifiable claims
      const claims = await this.claimsReviewService.detectUnverifiableClaims(
        validated.finalLetter,
        LLMFeature.GENERATE_COVER_LETTER,
      );

      if (claims.length > 0) {
        this.logger.warn(
          `Found ${claims.length} unverifiable claims in cover letter`,
        );
        for (const claim of claims) {
          await this.claimsReviewService.createReviewRequest(
            userId,
            LLMFeature.GENERATE_COVER_LETTER,
            '',
            validated.finalLetter,
            claim.claim,
            { confidence: validated.confidence },
          );
        }
      }

      // Record usage
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.GENERATE_COVER_LETTER,
        provider.getName(),
        config.model,
        response.usage,
        { jobTitle: jobInfo.title, companyName: jobInfo.companyName },
      );

      return validated;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.logger.error('Zod validation error:', error.errors);
        throw new Error(
          `Invalid response format from LLM: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.logger.error('Error generating cover letter:', error);
      throw error;
    }
  }

  private buildPrompt(
    candidateInfo: {
      name: string;
      email: string;
      skills: string[];
      experience?: string;
      summary?: string;
    },
    jobInfo: {
      title: string;
      companyName: string;
      description: string;
      requirements?: string[];
    },
  ): string {
    let prompt = `Generate a professional cover letter for this candidate applying to this job.\n\n`;
    prompt += `CANDIDATE:\n`;
    prompt += `- Name: ${candidateInfo.name}\n`;
    prompt += `- Email: ${candidateInfo.email}\n`;
    prompt += `- Skills: ${candidateInfo.skills.join(', ')}\n`;
    if (candidateInfo.summary) {
      prompt += `- Summary: ${candidateInfo.summary}\n`;
    }
    if (candidateInfo.experience) {
      prompt += `- Experience: ${candidateInfo.experience}\n`;
    }

    prompt += `\nJOB:\n`;
    prompt += `- Title: ${jobInfo.title}\n`;
    prompt += `- Company: ${jobInfo.companyName}\n`;
    prompt += `- Description: ${jobInfo.description}\n`;
    if (jobInfo.requirements && jobInfo.requirements.length > 0) {
      prompt += `- Requirements: ${jobInfo.requirements.join(', ')}\n`;
    }

    prompt += `\nGenerate a compelling, personalized cover letter (300-400 words) that:\n`;
    prompt += `1. Highlights relevant skills and experience\n`;
    prompt += `2. Demonstrates understanding of the role\n`;
    prompt += `3. Shows enthusiasm for the position\n`;
    prompt += `4. Is professional and concise\n`;

    return prompt;
  }
}

