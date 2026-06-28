import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { EntitlementService } from '../entitlement/entitlement.service';
import { LLMAccountingService } from './llm-accounting.service';
import { LLMFeature } from './llm-routing.service';
import { LLMUsage } from './interfaces/llm-provider.interface';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  used?: number;
  message?: string;
}

/**
 * Feature to entitlement key mapping
 */
const FEATURE_TO_ENTITLEMENT: Record<LLMFeature, string> = {
  [LLMFeature.REWRITE_BULLETS]: 'ai_credits_per_month',
  [LLMFeature.TAILOR_RESUME]: 'ai_credits_per_month',
  [LLMFeature.GENERATE_COVER_LETTER]: 'ai_credits_per_month',
  [LLMFeature.MOCK_INTERVIEW]: 'ai_credits_per_month',
  [LLMFeature.PARSE_RESUME]: 'ai_credits_per_month',
  [LLMFeature.CALCULATE_MATCH]: 'ai_credits_per_month',
  [LLMFeature.INTERVIEW_COACHING]: 'interview_sessions_per_month',
  [LLMFeature.INTERVIEW_SCORING]: 'interview_sessions_per_month',
};

@Injectable()
export class LLMQuotaService {
  private readonly logger = new Logger(LLMQuotaService.name);

  constructor(
    private readonly entitlementService: EntitlementService,
    private readonly accountingService: LLMAccountingService,
  ) {}

  /**
   * Check if user has quota for a feature
   */
  async checkQuota(
    userId: string,
    feature: LLMFeature,
  ): Promise<QuotaCheckResult> {
    const entitlementKey = FEATURE_TO_ENTITLEMENT[feature];

    if (!entitlementKey) {
      this.logger.warn(`No entitlement mapping for feature: ${feature}`);
      return {
        allowed: false,
        message: `Feature ${feature} not configured for quota checking`,
      };
    }

    // Check entitlement
    const entitlementCheck = await this.entitlementService.checkEntitlement(
      userId,
      {
        featureKey: entitlementKey,
        incrementUsage: false,
      },
    );

    if (!entitlementCheck.allowed) {
      return {
        allowed: false,
        message: entitlementCheck.message || 'Quota exceeded',
        limit: entitlementCheck.limit,
        used: entitlementCheck.usage,
        remaining: entitlementCheck.remaining,
      };
    }

    // For limit-based entitlements, check usage
    if (entitlementCheck.limit !== undefined) {
      const used = entitlementCheck.usage || 0;
      const limit = entitlementCheck.limit;
      const remaining = limit - used;

      if (remaining <= 0) {
        return {
          allowed: false,
          message: `Quota exceeded. Limit: ${limit}, Used: ${used}`,
          limit,
          used,
          remaining: 0,
        };
      }

      return {
        allowed: true,
        limit,
        used,
        remaining,
      };
    }

    // For boolean entitlements (unlimited)
    return {
      allowed: true,
    };
  }

  /**
   * Enforce quota before making LLM request
   * Throws ForbiddenException if quota exceeded
   */
  async enforceQuota(userId: string, feature: LLMFeature): Promise<void> {
    const quotaCheck = await this.checkQuota(userId, feature);

    if (!quotaCheck.allowed) {
      this.logger.warn(
        `Quota exceeded for user ${userId}, feature ${feature}: ${quotaCheck.message}`,
      );
      throw new ForbiddenException(
        quotaCheck.message || 'Quota exceeded for this feature',
      );
    }
  }

  /**
   * Record usage and increment quota counter
   */
  async recordUsageAndIncrement(
    userId: string,
    feature: LLMFeature,
    provider: string,
    model: string,
    usage: LLMUsage,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Record in accounting
    await this.accountingService.recordUsage(
      userId,
      feature,
      provider,
      model,
      usage,
      metadata,
    );

    // Increment usage counter in entitlement system
    const entitlementKey = FEATURE_TO_ENTITLEMENT[feature];
    if (entitlementKey) {
      await this.entitlementService.checkEntitlement(userId, {
        featureKey: entitlementKey,
        incrementUsage: true,
      });
    }
  }

  /**
   * Get quota information for user
   */
  async getQuotaInfo(userId: string, feature: LLMFeature): Promise<QuotaCheckResult> {
    return this.checkQuota(userId, feature);
  }
}

