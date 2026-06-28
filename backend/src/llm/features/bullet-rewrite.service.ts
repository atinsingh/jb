import { Injectable, Logger } from '@nestjs/common';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { ClaimsReviewService } from '../claims-review.service';
import {
  BulletRewriteResponseSchema,
  BulletRewriteResponse,
} from '@jobocate/contracts';
import { z } from 'zod';

@Injectable()
export class BulletRewriteService {
  private readonly logger = new Logger(BulletRewriteService.name);

  constructor(
    private readonly routingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
    private readonly claimsReviewService: ClaimsReviewService,
  ) {}

  /**
   * Rewrite resume bullets with improvements
   */
  async rewriteBullets(
    userId: string,
    bullets: string[],
    roleTarget?: string,
  ): Promise<BulletRewriteResponse> {
    // Check quota
    await this.quotaService.enforceQuota(userId, LLMFeature.REWRITE_BULLETS);

    const provider = this.routingService.getProviderForFeature(
      LLMFeature.REWRITE_BULLETS,
    );
    const config = this.routingService.getFeatureConfig(LLMFeature.REWRITE_BULLETS);

    const prompt = this.buildPrompt(bullets, roleTarget);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are an expert resume writer. Rewrite bullet points to be more impactful, quantifiable, and aligned with the target role. Return ONLY valid JSON matching this schema:
{
  "improvedBullets": ["bullet1", "bullet2"],
  "rationale": "explanation of improvements",
  "confidence": 0.85,
  "diffs": [
    {
      "original": "original bullet",
      "improved": "improved bullet",
      "changes": ["change1", "change2"]
    }
  ]
}`,
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      // Parse and validate response
      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (error) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      // Validate with Zod
      const validated = BulletRewriteResponseSchema.parse(parsed);

      // Check for unverifiable claims
      const allImprovedText = validated.improvedBullets.join(' ');
      const claims = await this.claimsReviewService.detectUnverifiableClaims(
        allImprovedText,
        LLMFeature.REWRITE_BULLETS,
      );

      // If unverifiable claims found, create review requests
      if (claims.length > 0) {
        this.logger.warn(
          `Found ${claims.length} unverifiable claims in bullet rewrite`,
        );
        for (const claim of claims) {
          await this.claimsReviewService.createReviewRequest(
            userId,
            LLMFeature.REWRITE_BULLETS,
            bullets.join('\n'),
            allImprovedText,
            claim.claim,
            { confidence: validated.confidence },
          );
        }
      }

      // Record usage
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.REWRITE_BULLETS,
        provider.getName(),
        config.model,
        response.usage,
        { bulletsCount: bullets.length, hasRoleTarget: !!roleTarget },
      );

      return validated;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.logger.error('Zod validation error:', error.errors);
        throw new Error(
          `Invalid response format from LLM: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.logger.error('Error rewriting bullets:', error);
      throw error;
    }
  }

  private buildPrompt(bullets: string[], roleTarget?: string): string {
    let prompt = `Rewrite these resume bullet points to be more impactful and quantifiable:\n\n`;
    bullets.forEach((bullet, index) => {
      prompt += `${index + 1}. ${bullet}\n`;
    });

    if (roleTarget) {
      prompt += `\nTarget Role: ${roleTarget}\n`;
      prompt += `Align the bullets with this role's requirements.\n`;
    }

    prompt += `\nFor each bullet, provide:\n`;
    prompt += `- Improved version with quantifiable metrics\n`;
    prompt += `- Changes made (e.g., "Added metrics", "Emphasized impact")\n`;
    prompt += `- Overall rationale for improvements\n`;
    prompt += `- Confidence score (0-1)\n`;

    return prompt;
  }
}

