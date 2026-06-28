import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LLMUsage, LLMUsageDocument } from './schemas/llm-usage.schema';
import { LLMUsage as LLMUsageInterface } from './interfaces/llm-provider.interface';
import { LLMFeature } from './llm-routing.service';

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  byFeature: Record<string, { tokens: number; cost: number; count: number }>;
  byProvider: Record<string, { tokens: number; cost: number; count: number }>;
}

@Injectable()
export class LLMAccountingService {
  private readonly logger = new Logger(LLMAccountingService.name);

  constructor(
    @InjectModel(LLMUsage.name) private llmUsageModel: Model<LLMUsageDocument>,
  ) {}

  /**
   * Record LLM usage for accounting
   */
  async recordUsage(
    userId: string,
    feature: LLMFeature,
    provider: string,
    model: string,
    usage: LLMUsageInterface,
    metadata?: Record<string, any>,
  ): Promise<LLMUsageDocument> {
    const requestId = this.generateRequestId();
    const now = new Date();
    const periodStart = this.getPeriodStart(now);
    const periodEnd = this.getPeriodEnd(now);

    const usageRecord = new this.llmUsageModel({
      userId,
      feature,
      provider,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cost: usage.cost || 0,
      requestId,
      metadata,
      timestamp: now,
      periodStart,
      periodEnd,
    });

    const saved = await usageRecord.save();
    this.logger.debug(
      `Recorded usage: ${feature} - ${usage.totalTokens} tokens - $${usage.cost?.toFixed(4) || '0.0000'}`,
    );
    return saved;
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsageStats(
    userId: string,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<UsageStats> {
    const query: any = { userId };
    if (periodStart || periodEnd) {
      query.timestamp = {};
      if (periodStart) query.timestamp.$gte = periodStart;
      if (periodEnd) query.timestamp.$lte = periodEnd;
    } else {
      // Default to current period
      const now = new Date();
      query.periodStart = this.getPeriodStart(now);
      query.periodEnd = this.getPeriodEnd(now);
    }

    const records = await this.llmUsageModel.find(query).lean();

    const stats: UsageStats = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: records.length,
      byFeature: {},
      byProvider: {},
    };

    for (const record of records) {
      stats.totalTokens += record.totalTokens;
      stats.totalCost += record.cost || 0;

      // By feature
      if (!stats.byFeature[record.feature]) {
        stats.byFeature[record.feature] = { tokens: 0, cost: 0, count: 0 };
      }
      stats.byFeature[record.feature].tokens += record.totalTokens;
      stats.byFeature[record.feature].cost += record.cost || 0;
      stats.byFeature[record.feature].count += 1;

      // By provider
      if (!stats.byProvider[record.provider]) {
        stats.byProvider[record.provider] = { tokens: 0, cost: 0, count: 0 };
      }
      stats.byProvider[record.provider].tokens += record.totalTokens;
      stats.byProvider[record.provider].cost += record.cost || 0;
      stats.byProvider[record.provider].count += 1;
    }

    return stats;
  }

  /**
   * Get total cost for a user in a period
   */
  async getUserTotalCost(
    userId: string,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<number> {
    const query: any = { userId };
    if (periodStart || periodEnd) {
      query.timestamp = {};
      if (periodStart) query.timestamp.$gte = periodStart;
      if (periodEnd) query.timestamp.$lte = periodEnd;
    } else {
      const now = new Date();
      query.periodStart = this.getPeriodStart(now);
      query.periodEnd = this.getPeriodEnd(now);
    }

    const result = await this.llmUsageModel.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$cost' } } },
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Get period start (beginning of current month)
   */
  private getPeriodStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get period end (end of current month)
   */
  private getPeriodEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

