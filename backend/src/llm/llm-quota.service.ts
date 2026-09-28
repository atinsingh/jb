import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiBudgetService } from '../ai-budget/ai-budget.service';
import { LLMAccountingService } from './llm-accounting.service';
import type { LLMFeature } from './llm-routing.service';
import { LLMUsage } from './interfaces/llm-provider.interface';
import { modelOwner } from './owner-llm.service';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  used?: number;
  message?: string;
}

@Injectable()
export class LLMQuotaService {
  constructor(
    private readonly budget: AiBudgetService,
    private readonly accountingService: LLMAccountingService,
  ) {}

  async checkQuota(
    userId: string,
    feature: LLMFeature,
  ): Promise<QuotaCheckResult> {
    const balance = await this.budget.statusOwner(modelOwner(feature), userId);
    const allowed = balance.status !== 'unavailable' && balance.remaining > 0;
    return {
      allowed,
      limit: balance.limit,
      used: balance.spent,
      remaining: balance.remaining,
      ...(allowed
        ? {}
        : {
            message:
              balance.status === 'unavailable'
                ? 'AI credits are temporarily unavailable.'
                : 'Your AI credits are exhausted.',
          }),
    };
  }

  async enforceQuota(userId: string, feature: LLMFeature): Promise<void> {
    const result = await this.checkQuota(userId, feature);
    if (!result.allowed) throw new ForbiddenException(result.message);
  }

  /** Telemetry only. The owner lease settles actual provider spend, including failed calls. */
  async recordUsage(
    userId: string,
    feature: LLMFeature,
    provider: string,
    model: string,
    usage: LLMUsage,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.accountingService.recordUsage(
      userId,
      feature,
      provider,
      model,
      usage,
      metadata,
    );
  }

  getQuotaInfo(userId: string, feature: LLMFeature): Promise<QuotaCheckResult> {
    return this.checkQuota(userId, feature);
  }
}
