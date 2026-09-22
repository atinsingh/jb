import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { ModelAliasService } from '../resume-harness/model-alias.service';
import {
  AiBudgetExhaustedException,
  AiBudgetOperationInProgressException,
  AiBudgetUnavailableException,
} from './ai-budget.errors';
import {
  AiBudgetConfigurationError,
  AiBudgetPolicyService,
} from './ai-budget-policy.service';
import { AiBudgetServiceId } from './ai-budget-policy.types';
import { AiBudgetSecretCodec } from './ai-budget-secret.codec';
import { LiteLlmBudgetClient, LiteLlmKeyInfo } from './litellm-budget.client';
import {
  AiBudgetAccount,
  AiBudgetAccountDocument,
} from './schemas/ai-budget-account.schema';

export interface AiBudgetSnapshot {
  unit: 'USD';
  tier: string;
  limit: number;
  spent: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
  resetAt: string;
  status: 'healthy' | 'low' | 'exhausted' | 'unavailable';
  lastRefreshedAt: string;
}

export interface CandidateBudgetAccess {
  apiKey: string;
  keyId: string;
  keyAlias: string;
  snapshot: AiBudgetSnapshot;
}

export interface AiBudgetAttribution {
  harness: string;
  alias: string;
  model: string;
  effort: string;
  sessionId: string;
  runId?: string;
}

interface CandidateAccountContext {
  account: AiBudgetAccountDocument;
  apiKey: string;
  tier: string;
}

const LEASE_MILLISECONDS = 15 * 60 * 1000;

@Injectable()
export class AiBudgetService {
  constructor(
    @InjectModel(AiBudgetAccount.name)
    private readonly accountModel: Model<AiBudgetAccountDocument>,
    private readonly policy: AiBudgetPolicyService,
    private readonly client: LiteLlmBudgetClient,
    private readonly codec: AiBudgetSecretCodec,
    private readonly aliases: ModelAliasService,
  ) {}

  async statusCandidate(userId: string): Promise<AiBudgetSnapshot> {
    let tier = 'FREE';
    try {
      tier = await this.aliases.tierFor(userId);
      const context = await this.prepareCandidate(userId, tier);
      return (await this.refreshAccess(context, false)).snapshot;
    } catch (error) {
      if (
        error instanceof AiBudgetConfigurationError ||
        !(error instanceof AiBudgetUnavailableException)
      ) {
        throw error;
      }
      return this.unavailableSnapshot(tier);
    }
  }

  async ensureCandidateAccess(userId: string): Promise<CandidateBudgetAccess> {
    const tier = await this.aliases.tierFor(userId);
    const context = await this.prepareCandidate(userId, tier);
    return this.refreshAccess(context, true);
  }

  async withCandidateLease<T>(
    userId: string,
    service: AiBudgetServiceId,
    attribution: AiBudgetAttribution,
    run: (access: CandidateBudgetAccess, tags: readonly string[]) => Promise<T>,
  ): Promise<T> {
    const servicePolicy = this.policy.service(service);
    if (!servicePolicy.enabled || !servicePolicy.metered) {
      throw new AiBudgetConfigurationError(
        `AI budget service is not active and metered: ${service}`,
      );
    }

    const tier = await this.aliases.tierFor(userId);
    const context = await this.prepareCandidate(userId, tier);
    const runId = attribution.runId || randomUUID();
    const now = new Date();
    const claimed = await this.accountModel
      .findOneAndUpdate(
        {
          ownerType: 'candidate',
          ownerId: userId,
          $or: [
            { activeRunId: { $exists: false } },
            { activeRunId: null },
            { runLockUntil: { $lt: now } },
          ],
        },
        {
          $set: {
            activeRunId: runId,
            runLockUntil: new Date(now.getTime() + LEASE_MILLISECONDS),
          },
        },
        { new: true },
      )
      .select('+encryptedKey')
      .exec();
    if (!claimed) throw new AiBudgetOperationInProgressException();

    const claimedContext = { ...context, account: claimed };
    let ran = false;
    try {
      const access = await this.refreshAccess(claimedContext, true);
      ran = true;
      return await run(access, this.tags(userId, service, attribution, runId));
    } finally {
      if (ran) {
        try {
          await this.refreshAccess(claimedContext, false);
        } catch {
          // The operation already ran; a later status request retries refresh.
        }
      }
      await this.accountModel
        .updateOne(
          { _id: claimed._id, activeRunId: runId },
          { $unset: { activeRunId: 1, runLockUntil: 1 } },
        )
        .exec();
    }
  }

  private async prepareCandidate(
    userId: string,
    tier: string,
  ): Promise<CandidateAccountContext> {
    try {
      const tierPolicy = this.policy.tier(tier);
      const offered = await this.aliases.listForTier(tier);
      const models = offered.map((model) => model.alias);
      if (!models.length) {
        throw new AiBudgetConfigurationError(
          `No active LiteLLM aliases are configured for tier ${tier}`,
        );
      }

      let account = await this.accountModel
        .findOne({ ownerType: 'candidate', ownerId: userId })
        .select('+encryptedKey')
        .exec();
      if (!account) {
        const keyAlias = `candidate:${userId}`;
        const generated = await this.client.generate({
          ownerType: 'candidate',
          ownerId: userId,
          pool: 'candidate-ai',
          keyAlias,
          models,
          maxBudgetUsd: tierPolicy.maxBudgetUsd,
        });
        account = await this.accountModel.create({
          ownerType: 'candidate',
          ownerId: userId,
          keyId: generated.keyId,
          keyAlias,
          encryptedKey: this.codec.encrypt(generated.key),
          appliedTier: tier,
          appliedLimitUsd: tierPolicy.maxBudgetUsd,
          budgetDuration: tierPolicy.budgetDuration,
        });
        return { account, apiKey: generated.key, tier };
      }

      const apiKey = this.codec.decrypt(account.encryptedKey);
      const changed =
        account.appliedTier !== tier ||
        account.appliedLimitUsd !== tierPolicy.maxBudgetUsd ||
        account.budgetDuration !== tierPolicy.budgetDuration;
      if (changed) {
        await this.client.update(apiKey, {
          models,
          maxBudgetUsd: tierPolicy.maxBudgetUsd,
        });
        const applied = {
          appliedTier: tier,
          appliedLimitUsd: tierPolicy.maxBudgetUsd,
          budgetDuration: tierPolicy.budgetDuration,
        };
        await this.accountModel
          .updateOne({ _id: account._id }, { $set: applied })
          .exec();
        Object.assign(account, applied);
      }
      return { account, apiKey, tier };
    } catch (error) {
      if (
        error instanceof AiBudgetUnavailableException ||
        error instanceof AiBudgetConfigurationError
      ) {
        throw error;
      }
      throw new AiBudgetUnavailableException(error);
    }
  }

  private async refreshAccess(
    context: CandidateAccountContext,
    blockExhausted: boolean,
  ): Promise<CandidateBudgetAccess> {
    try {
      const info = await this.client.info(context.apiKey);
      const refreshedAt = new Date();
      await this.accountModel
        .updateOne(
          { _id: context.account._id },
          { $set: { lastSyncedAt: refreshedAt } },
        )
        .exec();
      context.account.lastSyncedAt = refreshedAt;
      const snapshot = this.snapshot(context.tier, info, refreshedAt);
      if (blockExhausted && snapshot.status === 'exhausted') {
        throw new AiBudgetExhaustedException(snapshot);
      }
      return {
        apiKey: context.apiKey,
        keyId: context.account.keyId,
        keyAlias: context.account.keyAlias,
        snapshot,
      };
    } catch (error) {
      if (
        error instanceof AiBudgetUnavailableException ||
        error instanceof AiBudgetExhaustedException
      ) {
        throw error;
      }
      throw new AiBudgetUnavailableException(error);
    }
  }

  private snapshot(
    tier: string,
    info: LiteLlmKeyInfo,
    refreshedAt: Date,
  ): AiBudgetSnapshot {
    const rawRemaining = info.limitUsd - info.spendUsd;
    const resetAt = info.resetAt || this.nextUtcMonth(refreshedAt);
    const status =
      rawRemaining <= 0
        ? 'exhausted'
        : rawRemaining / info.limitUsd <= this.policy.lowRemainingRatio()
          ? 'low'
          : 'healthy';
    return {
      unit: 'USD',
      tier,
      limit: this.money(info.limitUsd),
      spent: this.money(info.spendUsd),
      remaining: this.money(Math.max(0, rawRemaining)),
      periodStart: this.previousUtcMonth(resetAt).toISOString(),
      periodEnd: resetAt.toISOString(),
      resetAt: resetAt.toISOString(),
      status,
      lastRefreshedAt: refreshedAt.toISOString(),
    };
  }

  private unavailableSnapshot(tier: string): AiBudgetSnapshot {
    const now = new Date();
    const periodEnd = this.nextUtcMonth(now);
    let limit = 0;
    try {
      limit = this.policy.tier(tier).maxBudgetUsd;
    } catch {
      tier = 'FREE';
      limit = this.policy.tier(tier).maxBudgetUsd;
    }
    return {
      unit: 'USD',
      tier,
      limit: this.money(limit),
      spent: 0,
      remaining: 0,
      periodStart: this.previousUtcMonth(periodEnd).toISOString(),
      periodEnd: periodEnd.toISOString(),
      resetAt: periodEnd.toISOString(),
      status: 'unavailable',
      lastRefreshedAt: now.toISOString(),
    };
  }

  private tags(
    userId: string,
    service: AiBudgetServiceId,
    attribution: AiBudgetAttribution,
    runId: string,
  ): readonly string[] {
    return [
      'ownerType=candidate',
      `ownerId=${userId}`,
      `usageContext=${service}`,
      `harness=${attribution.harness}`,
      `modelAlias=${attribution.alias}`,
      `model=${attribution.model}`,
      `effort=${attribution.effort}`,
      `sessionId=${attribution.sessionId}`,
      `logicalRunId=${runId}`,
    ];
  }

  private money(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }

  private nextUtcMonth(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1),
    );
  }

  private previousUtcMonth(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth() - 1, 1),
    );
  }
}
