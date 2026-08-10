import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EntitlementService } from '../entitlement/entitlement.service';
import { LLMAccountingService } from './llm-accounting.service';
import { LLMFeature } from './llm-routing.service';
import { LLMUsage } from './interfaces/llm-provider.interface';
import {
  EmployerSubscription,
  EmployerSubscriptionDocument,
} from '../employer-billing/schemas/employer-subscription.schema';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  used?: number;
  message?: string;
}

/**
 * Employer "AI Recruiter" credit pool.
 *
 * Unlike candidate features (which resolve against the candidate
 * `PlanEntitlement` system keyed off `User.currentPlanType`), employer users
 * authenticate as ROLE_EMPLOYER and their real AI allowance lives in the
 * employer-billing `EmployerSubscription` document (`aiActionsLimit` /
 * `aiActionsUsed`, provisioned per employer plan free/starter/growth/scale/
 * enterprise). This sentinel key routes the 4 recruiter features to that
 * subscription instead of the candidate entitlement pool.
 */
export const EMPLOYER_AI_ENTITLEMENT = 'employer_ai_credits_per_month';

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
  // Employer "AI Recruiter" features consult the employer's own AI allowance
  // (EmployerSubscription.aiActionsLimit / aiActionsUsed) via the sentinel
  // `employer_ai_credits_per_month` key. An employer with remaining allowance
  // reaches the Claude path; a missing/zero allowance denies here, which the
  // AI Recruiter's ForbiddenException catch routes to its deterministic
  // fallback (no crash).
  [LLMFeature.SCREEN_APPLICANTS]: EMPLOYER_AI_ENTITLEMENT,
  [LLMFeature.RECRUITER_COPILOT]: EMPLOYER_AI_ENTITLEMENT,
  [LLMFeature.SOURCE_CANDIDATES]: EMPLOYER_AI_ENTITLEMENT,
  [LLMFeature.INTERVIEW_SCORECARD]: EMPLOYER_AI_ENTITLEMENT,
  // Generic agent runtime consumes the candidate AI credit pool. An N-step run
  // charges exactly one credit (see AgentRuntimeService metering).
  [LLMFeature.AGENT_RUNTIME]: 'ai_credits_per_month',
  // Candidate Job-Search Copilot also consumes the candidate AI credit pool;
  // one credit per completed run (metered by AgentRuntimeService).
  [LLMFeature.JOB_SEARCH_COPILOT]: 'ai_credits_per_month',
};

@Injectable()
export class LLMQuotaService {
  private readonly logger = new Logger(LLMQuotaService.name);

  constructor(
    private readonly entitlementService: EntitlementService,
    private readonly accountingService: LLMAccountingService,
    @InjectModel(EmployerSubscription.name)
    private readonly employerSubscriptionModel: Model<EmployerSubscriptionDocument>,
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

    // Employer AI Recruiter features resolve against the employer's own
    // subscription allowance rather than the candidate entitlement system.
    if (entitlementKey === EMPLOYER_AI_ENTITLEMENT) {
      return this.checkEmployerAiQuota(userId);
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

    // Increment usage counter
    const entitlementKey = FEATURE_TO_ENTITLEMENT[feature];
    if (entitlementKey === EMPLOYER_AI_ENTITLEMENT) {
      // Employer features count against EmployerSubscription.aiActionsUsed.
      await this.incrementEmployerAiUsage(userId);
    } else if (entitlementKey) {
      await this.entitlementService.checkEntitlement(userId, {
        featureKey: entitlementKey,
        incrementUsage: true,
      });
    }
  }

  /**
   * Resolve the employer's AI Recruiter allowance from their billing
   * subscription. `aiActionsLimit === -1` means unlimited. A missing
   * subscription or exhausted allowance denies (allowed=false) so the caller
   * cleanly falls back to its deterministic path — never a crash.
   */
  private async checkEmployerAiQuota(
    userId: string,
  ): Promise<QuotaCheckResult> {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn(`Invalid employer id for AI quota check: ${userId}`);
      return { allowed: false, message: 'Invalid employer id' };
    }

    const sub = await this.employerSubscriptionModel.findOne({
      ownerId: new Types.ObjectId(userId),
    });

    if (!sub) {
      return {
        allowed: false,
        message: 'No employer subscription; AI actions unavailable',
      };
    }

    const limit = sub.aiActionsLimit ?? 0;
    const used = sub.aiActionsUsed ?? 0;

    // Unlimited allowance.
    if (limit === -1) {
      return { allowed: true, limit };
    }

    const remaining = limit - used;
    if (remaining <= 0) {
      return {
        allowed: false,
        limit,
        used,
        remaining: 0,
        message: `AI action quota exceeded. Limit: ${limit}, Used: ${used}`,
      };
    }

    return { allowed: true, limit, used, remaining };
  }

  /**
   * Increment the employer's consumed AI actions after a successful LLM call.
   */
  private async incrementEmployerAiUsage(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn(
        `Invalid employer id for AI usage increment: ${userId}`,
      );
      return;
    }

    await this.employerSubscriptionModel.updateOne(
      { ownerId: new Types.ObjectId(userId) },
      { $inc: { aiActionsUsed: 1 } },
    );
  }

  /**
   * Get quota information for user
   */
  async getQuotaInfo(userId: string, feature: LLMFeature): Promise<QuotaCheckResult> {
    return this.checkQuota(userId, feature);
  }
}

