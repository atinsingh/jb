import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { budgetRunContext, budgetWorker, hasStoppedBudgetWorker } from './ai-budget-run-context';
import { DockerSandboxDriver } from '../resume-harness/sandbox/docker-sandbox.driver';
import { AgentPlatformClient } from '../resume-harness/sandbox/agent-platform.client';
import { Model } from 'mongoose';
import { ModelAliasService } from '../resume-harness/model-alias.service';
import {
  AiBudgetExhaustedException,
  AiBudgetOperationInProgressException,
  AiBudgetSettlementPendingException,
  AiBudgetUnavailableException,
} from './ai-budget.errors';
import {
  AiBudgetConfigurationError,
  AiBudgetPolicyService,
} from './ai-budget-policy.service';
import { EmployerBillingService } from '../employer-billing/employer-billing.service';
import {
  EMPLOYER_PLANS,
  getEmployerPlan,
} from '../employer-billing/employer-plans';
import { AiBudgetOwnerType, AiBudgetServiceId } from './ai-budget-policy.types';
import { AiBudgetSecretCodec } from './ai-budget-secret.codec';
import { LiteLlmBudgetClient, LiteLlmKeyInfo } from './litellm-budget.client';
import {
  AiBudgetAccount,
  AiBudgetAccountDocument,
} from './schemas/ai-budget-account.schema';

export interface AiBudgetSnapshot {
  unit: 'credits';
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
  /** Internal reconciliation watermark, never returned by the budget endpoint. */
  measuredSpendUsd: number;
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
  private readonly logger = new Logger(AiBudgetService.name);
  constructor(
    @InjectModel(AiBudgetAccount.name)
    private readonly accountModel: Model<AiBudgetAccountDocument>,
    private readonly policy: AiBudgetPolicyService,
    private readonly client: LiteLlmBudgetClient,
    private readonly codec: AiBudgetSecretCodec,
    private readonly aliases: ModelAliasService,
    private readonly employerBilling: EmployerBillingService,
  ) {}

  async statusCandidate(userId: string): Promise<AiBudgetSnapshot> {
    return this.statusOwner('candidate', userId);
  }

  async ownerTier(
    ownerType: AiBudgetOwnerType,
    userId: string,
  ): Promise<string> {
    if (ownerType === 'candidate') return this.aliases.tierFor(userId);
    const subscription =
      await this.employerBilling.getOrCreateSubscription(userId);
    const plan = getEmployerPlan(subscription.plan);
    if (!plan)
      throw new AiBudgetConfigurationError(
        'Employer AI plan is not configured',
      );
    return plan.modelTier;
  }

  async statusOwner(
    ownerType: AiBudgetOwnerType,
    userId: string,
  ): Promise<AiBudgetSnapshot> {
    let tier = 'FREE';
    try {
      tier = await this.ownerTier(ownerType, userId);
      const context = await this.prepareOwner(ownerType, userId, tier);
      return (await this.refreshAccess(context, false)).snapshot;
    } catch (error) {
      if (
        error instanceof AiBudgetConfigurationError ||
        !(error instanceof AiBudgetUnavailableException)
      ) {
        throw error;
      }
      return this.unavailableSnapshot(tier, ownerType);
    }
  }

  async ensureCandidateAccess(userId: string): Promise<CandidateBudgetAccess> {
    return this.ensureOwnerAccess('candidate', userId);
  }

  async ensureOwnerAccess(
    ownerType: AiBudgetOwnerType,
    userId: string,
  ): Promise<CandidateBudgetAccess> {
    const tier = await this.ownerTier(ownerType, userId);
    const context = await this.prepareOwner(ownerType, userId, tier);
    return this.refreshAccess(context, true);
  }

  async withCandidateLease<T>(
    userId: string,
    service: AiBudgetServiceId,
    attribution: AiBudgetAttribution,
    run: (access: CandidateBudgetAccess, tags: readonly string[]) => Promise<T>,
  ): Promise<T> {
    return this.withOwnerLease('candidate', userId, service, attribution, run);
  }

  async withOwnerLease<T>(
    ownerType: AiBudgetOwnerType,
    userId: string,
    service: AiBudgetServiceId,
    attribution: AiBudgetAttribution,
    run: (access: CandidateBudgetAccess, tags: readonly string[]) => Promise<T>,
  ): Promise<T> {
    const servicePolicy = this.policy.service(service);
    if (
      !servicePolicy.enabled ||
      !servicePolicy.metered ||
      servicePolicy.ownerType !== ownerType
    ) {
      throw new AiBudgetConfigurationError(
        `AI budget service is not active and metered: ${service}`,
      );
    }

    const tier = await this.ownerTier(ownerType, userId);
    const context = await this.prepareOwner(ownerType, userId, tier);
    const runId = attribution.runId || randomUUID();
    const now = new Date();
    const claimed = await this.accountModel
      .findOneAndUpdate(
        {
          ownerType,
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
            runWorkerId: budgetWorker.id,
            runWorkerHost: budgetWorker.host,
            runWorkerPid: budgetWorker.pid,
            runSandboxIds: [],
            runLockUntil: new Date(now.getTime() + LEASE_MILLISECONDS),
          },
        },
        { new: true },
      )
      .select('+encryptedKey')
      .exec();
    if (!claimed) throw new AiBudgetOperationInProgressException();

    const heartbeat = setInterval(() => {
      void this.accountModel
        .updateOne(
          { _id: claimed._id, activeRunId: runId },
          {
            $set: { runLockUntil: new Date(Date.now() + LEASE_MILLISECONDS) },
          },
        )
        .exec()
        .catch(() => this.logger.warn('AI operation lease renewal failed'));
    }, LEASE_MILLISECONDS / 3);
    heartbeat.unref();

    const claimedContext = { ...context, account: claimed };
    let ran = false;
    let settled = false;
    let startingSpendUsd = 0;
    let startingCredits = 0;
    try {
      const access = await this.refreshAccess(claimedContext, true);
      startingSpendUsd = access.measuredSpendUsd;
      startingCredits = access.snapshot.spent;
      await this.accountModel
        .updateOne(
          { _id: claimed._id, activeRunId: runId },
          {
            $set: {
              runSpendBeforeUsd: startingSpendUsd,
              runCreditsBefore: startingCredits,
            },
          },
        )
        .exec();
      ran = true;
      const registered = new Set<string>();
      return await budgetRunContext.run({ registerSandbox: async (id) => {
        if (registered.has(id)) return;
        const result = await this.accountModel.updateOne(
          { _id: claimed._id, activeRunId: runId },
          { $addToSet: { runSandboxIds: id } },
        ).exec();
        if (!result.matchedCount) throw new AiBudgetUnavailableException();
        registered.add(id);
      } }, () => run(
        access,
        this.tags(ownerType, userId, service, attribution, runId),
      ));
    } finally {
      try {
        if (ran) {
          try {
            await this.waitForUsage();
            await this.accountModel
              .updateOne(
                { _id: claimed._id, activeRunId: runId },
                {
                  $set: { settlementPending: true },
                },
              )
              .exec();
            await this.settleCandidateRun(
              claimedContext,
              startingSpendUsd,
              startingCredits,
            );
          } catch (error) {
            throw new AiBudgetSettlementPendingException(error);
          }
          settled = true;
        }
      } finally {
        clearInterval(heartbeat);
        if (!ran || settled)
          await this.accountModel
            .updateOne(
              { _id: claimed._id, activeRunId: runId },
              {
                $unset: {
                  activeRunId: 1,
                  runWorkerId: 1, runWorkerHost: 1, runWorkerPid: 1, runSandboxIds: 1,
                  runLockUntil: 1,
                  settlementPending: 1,
                  runSpendBeforeUsd: 1,
                  runCreditsBefore: 1,
                },
              },
            )
            .exec();
      }
    }
  }

  private async prepareOwner(
    ownerType: AiBudgetOwnerType,
    userId: string,
    tier: string,
  ): Promise<CandidateAccountContext> {
    try {
      const tierPolicy = this.policy.tier(tier);
      let limitCredits = tierPolicy.maxBudgetCredits;
      if (ownerType === 'employer') {
        const sub = await this.employerBilling.getOrCreateSubscription(userId);
        const plan = getEmployerPlan(sub.plan);
        if (!plan)
          throw new AiBudgetConfigurationError(
            'Employer AI plan is not configured',
          );
        limitCredits = plan.limits.aiBudgetCreditsLimit;
      }
      const maxBudgetUsd = limitCredits / 100;
      const offered = await this.aliases.listForTier(tier);
      const models = offered.map((model) => model.alias);
      if (!models.length) {
        throw new AiBudgetConfigurationError(
          `No active LiteLLM aliases are configured for tier ${tier}`,
        );
      }

      let account = await this.accountModel
        .findOne({ ownerType, ownerId: userId })
        .select('+encryptedKey')
        .exec();
      if (!account) {
        const keyAlias = `${ownerType}:${userId}`;
        const generated = await this.client.generate({
          ownerType,
          ownerId: userId,
          pool: `${ownerType}-ai`,
          keyAlias,
          models,
          maxBudgetUsd,
        });
        try {
          account = await this.accountModel.create({
            ownerType,
            ownerId: userId,
            keyId: generated.keyId,
            keyAlias,
            encryptedKey: this.codec.encrypt(generated.key),
            appliedTier: tier,
            appliedLimitUsd: maxBudgetUsd,
            budgetDuration: tierPolicy.budgetDuration,
          });
        } catch (error) {
          await this.client.revoke(generated.key);
          if ((error as any)?.code !== 11000) throw error;
          const winner = await this.accountModel
            .findOne({ ownerType, ownerId: userId })
            .select('+encryptedKey')
            .exec();
          if (!winner) throw error;
          return {
            account: winner,
            apiKey: this.codec.decrypt(winner.encryptedKey),
            tier,
          };
        }
        return { account, apiKey: generated.key, tier };
      }

      const apiKey = this.codec.decrypt(account.encryptedKey);
      if (account.activeRunId && hasStoppedBudgetWorker(account)) {
        await this.stopAbandonedSandboxes(account);
        await this.waitForUsage();
        // Use the existing reconciliation path; do not waive incurred spend.
        account.settlementPending = true;
        await this.accountModel.updateOne(
          { _id: account._id, activeRunId: account.activeRunId },
          { $set: { settlementPending: true } },
        ).exec();
      }
      if (account.settlementPending) {
        await this.settleCandidateRun(
          { account, apiKey, tier },
          account.runSpendBeforeUsd || 0,
          account.runCreditsBefore || 0,
        );
        await this.accountModel
          .updateOne(
            { _id: account._id, activeRunId: account.activeRunId },
            {
              $unset: {
                activeRunId: 1,
                  runWorkerId: 1, runWorkerHost: 1, runWorkerPid: 1, runSandboxIds: 1,
                runLockUntil: 1,
                settlementPending: 1,
                runSpendBeforeUsd: 1,
                runCreditsBefore: 1,
              },
            },
          )
          .exec();
      }
      const changed =
        account.appliedTier !== tier ||
        account.appliedLimitUsd !== maxBudgetUsd ||
        account.budgetDuration !== tierPolicy.budgetDuration;
      if (changed) {
        await this.client.update(apiKey, {
          models,
          maxBudgetUsd,
        });
        const applied = {
          appliedTier: tier,
          appliedLimitUsd: maxBudgetUsd,
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

  private async stopAbandonedSandboxes(account: AiBudgetAccountDocument): Promise<void> {
    const ids = account.runSandboxIds || [];
    if (!ids.length) return;
    const driver = (process.env.RESUME_SANDBOX_DRIVER || 'docker') === 'agent-platform'
      ? new AgentPlatformClient()
      : new DockerSandboxDriver({ image: '', workdir: '/workspace', ttlSeconds: 900 });
    for (const id of ids) await driver.destroy(id);
    // A saved résumé remains available, but its stopped sandbox cannot accept
    // another turn. "Continue from here" provisions a fresh one.
    await this.accountModel.db.collection('resume_harness_sessions').updateMany(
      { sandboxId: { $in: ids }, userId: account.ownerId, status: 'active' },
      { $set: { status: 'ended', endedAt: new Date() }, $unset: { sandboxId: 1 } },
    );
  }

  private async refreshAccess(
    context: CandidateAccountContext,
    blockExhausted: boolean,
  ): Promise<CandidateBudgetAccess> {
    try {
      const info = await this.client.info(context.apiKey);
      const refreshedAt = new Date();
      const resetAt = info.resetAt || this.nextUtcMonth(refreshedAt);
      const usage = await this.client.usage(
        context.apiKey,
        this.previousUtcMonth(resetAt),
        resetAt,
      );
      if (usage.spendUsd + 1e-8 < info.spendUsd)
        throw new AiBudgetUnavailableException();
      const creditsUsed = usage.credits;
      context.account.lastSyncedAt = refreshedAt;
      context.account.creditsUsed = creditsUsed;
      context.account.creditsResetAt = resetAt;
      const snapshot = this.snapshot(
        context.tier,
        info,
        refreshedAt,
        creditsUsed,
      );
      if (blockExhausted && snapshot.status === 'exhausted') {
        throw new AiBudgetExhaustedException(snapshot);
      }
      return {
        apiKey: context.apiKey,
        keyId: context.account.keyId,
        keyAlias: context.account.keyAlias,
        snapshot,
        measuredSpendUsd: info.spendUsd,
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

  private async settleCandidateRun(
    context: CandidateAccountContext,
    beforeUsd: number,
    beforeCredits: number,
  ): Promise<void> {
    const access = await this.refreshAccess(context, false);
    const resetAt = new Date(access.snapshot.resetAt);
    const creditsUsed = access.snapshot.spent;
    await this.accountModel
      .updateOne(
        { _id: context.account._id, activeRunId: context.account.activeRunId },
        {
          $set: {
            creditsUsed,
            creditsResetAt: resetAt,
            lastSyncedAt: new Date(),
          },
        },
      )
      .exec();
    context.account.creditsUsed = creditsUsed;
    context.account.creditsResetAt = resetAt;
  }

  private roundCredits(usd: number): number {
    return Math.ceil(Math.max(0, usd) * 100 - 1e-9);
  }

  private async waitForUsage(): Promise<void> {
    // The deployed LiteLLM configuration flushes every 10 seconds with up to
    // 5 seconds of jitter. Keep the owner lease until the final batch can land.
    // Later reads still recompute by operation, so delayed logs never migrate
    // into a subsequent operation's rounded charge.
    await new Promise((resolve) => setTimeout(resolve, 16_000));
  }

  private snapshot(
    tier: string,
    info: LiteLlmKeyInfo,
    refreshedAt: Date,
    usedCredits: number,
  ): AiBudgetSnapshot {
    const limitCredits = Math.round(info.limitUsd * 100);
    const spentCredits = usedCredits;
    const remainingCredits = Math.max(0, limitCredits - spentCredits);
    const resetAt = info.resetAt || this.nextUtcMonth(refreshedAt);
    const status =
      remainingCredits <= 0
        ? 'exhausted'
        : remainingCredits / limitCredits <= this.policy.lowRemainingRatio()
          ? 'low'
          : 'healthy';
    return {
      unit: 'credits',
      tier,
      limit: limitCredits,
      spent: spentCredits,
      remaining: remainingCredits,
      periodStart: this.previousUtcMonth(resetAt).toISOString(),
      periodEnd: resetAt.toISOString(),
      resetAt: resetAt.toISOString(),
      status,
      lastRefreshedAt: refreshedAt.toISOString(),
    };
  }

  private unavailableSnapshot(
    tier: string,
    ownerType: AiBudgetOwnerType,
  ): AiBudgetSnapshot {
    const now = new Date();
    const periodEnd = this.nextUtcMonth(now);
    let limit = 0;
    try {
      limit = this.policy.tier(tier).maxBudgetCredits;
    } catch {
      tier = 'FREE';
      limit = this.policy.tier(tier).maxBudgetCredits;
    }
    if (ownerType === 'employer')
      limit =
        EMPLOYER_PLANS.find((plan) => plan.modelTier === tier)?.limits
          .aiBudgetCreditsLimit || 0;
    return {
      unit: 'credits',
      tier,
      limit,
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
    ownerType: AiBudgetOwnerType,
    userId: string,
    service: AiBudgetServiceId,
    attribution: AiBudgetAttribution,
    runId: string,
  ): readonly string[] {
    return [
      `ownerType=${ownerType}`,
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
