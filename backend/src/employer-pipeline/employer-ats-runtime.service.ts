import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';
import { EmployerBillingService } from '../employer-billing/employer-billing.service';
import { getEmployerPlan } from '../employer-billing/employer-plans';
import { LLMUsage, LLMUsageDocument } from '../llm/schemas/llm-usage.schema';
import { ResolvedModelAlias } from '../resume-harness/harness/harness.types';
import { ModelAliasService } from '../resume-harness/model-alias.service';
import { SandboxService } from '../resume-harness/sandbox/sandbox.service';
import { EmployerAtsSecretCodec } from './employer-ats-secret.codec';
import {
  EmployerAtsRuntime,
  EmployerAtsRuntimeDocument,
} from './schemas/employer-ats-runtime.schema';
import { LiteLlmVirtualKeyClient } from './litellm-virtual-key.client';

export interface EmployerAtsBudgetStatus {
  status: 'READY' | 'RUNNING' | 'BUDGET_EXHAUSTED' | 'CONFIGURATION_ERROR';
  reason?: string;
  limitUsd?: number;
  spentUsd?: number;
  remainingUsd?: number;
  period?: 'monthly';
  resetAt?: Date;
}

export interface PreparedEmployerAtsRun extends EmployerAtsBudgetStatus {
  status: 'READY';
  ownerId: string;
  runId: string;
  sandboxId: string;
  alias: string;
  provider: string;
  effort: string;
  keyAlias: string;
  virtualKey: string;
  spendBeforeUsd: number;
  startedAt: Date;
}

@Injectable()
export class EmployerAtsRuntimeService {
  private static readonly LOCK_MS = 15 * 60 * 1000;

  constructor(
    @InjectModel(EmployerAtsRuntime.name)
    private readonly runtimeModel: Model<EmployerAtsRuntimeDocument>,
    @InjectModel(LLMUsage.name)
    private readonly usageModel: Model<LLMUsageDocument>,
    private readonly billing: EmployerBillingService,
    private readonly aliases: ModelAliasService,
    private readonly keys: LiteLlmVirtualKeyClient,
    private readonly sandbox: SandboxService,
    private readonly secrets: EmployerAtsSecretCodec,
  ) {}

  async prepare(
    ownerIdValue: string,
    runId: string,
  ): Promise<PreparedEmployerAtsRun | EmployerAtsBudgetStatus> {
    const ownerId = this.objectId(ownerIdValue);
    const configured = await this.ensureAccount(ownerIdValue, ownerId);
    const lockUntil = new Date(Date.now() + EmployerAtsRuntimeService.LOCK_MS);
    const claimed: any = await this.runtimeModel
      .findOneAndUpdate(
        {
          ownerId,
          ownerType: 'employer',
          $or: [
            { activeRunId: runId },
            { activeRunId: { $exists: false } },
            { activeRunId: '' },
            { runLockUntil: { $lt: new Date() } },
          ],
        },
        { $set: { activeRunId: runId, runLockUntil: lockUntil } },
        { new: true },
      )
      .lean()
      .exec();
    if (!claimed) {
      return {
        status: 'RUNNING',
        reason: 'EMPLOYER_ATS_RUN_IN_PROGRESS',
      };
    }

    const virtualKey = this.secrets.decrypt(configured.account.encryptedKey);
    let budget;
    try {
      budget = await this.keys.info(virtualKey);
    } catch (error) {
      await this.release(ownerId, runId);
      throw error;
    }
    const limitUsd = budget.limitUsd ?? configured.maxBudgetUsd;
    const spentUsd = budget.spendUsd;
    const budgetView = this.budgetView(limitUsd, spentUsd, budget.resetAt);
    if (spentUsd >= limitUsd) {
      await this.release(ownerId, runId, spentUsd);
      return {
        status: 'BUDGET_EXHAUSTED',
        reason: 'EMPLOYER_BUDGET_EXHAUSTED',
        ...budgetView,
      };
    }

    let sandboxId: string;
    try {
      sandboxId = await this.ensureSandbox(
        ownerIdValue,
        ownerId,
        configured.account,
        virtualKey,
      );
    } catch (error) {
      await this.release(ownerId, runId);
      throw error;
    }
    return {
      status: 'READY',
      ownerId: ownerIdValue,
      runId,
      sandboxId,
      alias: configured.alias.alias,
      provider: configured.alias.provider,
      effort: configured.alias.effort,
      keyAlias: configured.account.keyAlias,
      virtualKey,
      spendBeforeUsd: spentUsd,
      startedAt: new Date(),
      ...budgetView,
    };
  }

  async finish(
    prepared: PreparedEmployerAtsRun,
    outcome: { succeeded: boolean },
  ): Promise<{ costUsd: number; requestIds: string[] }> {
    const ownerId = this.objectId(prepared.ownerId);
    const settled = await this.settledUsage(prepared);
    const spendAfter = settled.spendAfter;
    const costUsd = this.money(
      Math.max(0, spendAfter - prepared.spendBeforeUsd),
    );
    const logs = settled.logs;
    const finishedAt = new Date();
    const attributed = logs.filter(
      (log) =>
        log.keyAlias === prepared.keyAlias &&
        (!log.startedAt ||
          (log.startedAt >= prepared.startedAt && log.startedAt <= finishedAt)),
    );
    const requestIds = attributed
      .map((log) => log.requestId)
      .filter(Boolean);
    const promptTokens = attributed.reduce(
      (sum, log) => sum + Number(log.promptTokens || 0),
      0,
    );
    const completionTokens = attributed.reduce(
      (sum, log) => sum + Number(log.completionTokens || 0),
      0,
    );
    const periodStart = new Date(
      finishedAt.getFullYear(),
      finishedAt.getMonth(),
      1,
    );
    const periodEnd = new Date(
      finishedAt.getFullYear(),
      finishedAt.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    try {
      await this.usageModel
        .updateOne(
          {
            userId: ownerId,
            feature: 'employerAts',
            requestId: `ats:${prepared.runId}`,
          },
          {
            $setOnInsert: {
              userId: ownerId,
              feature: 'employerAts',
              provider: prepared.provider,
              model: prepared.alias,
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
              cost: costUsd,
              requestId: `ats:${prepared.runId}`,
              timestamp: finishedAt,
              periodStart,
              periodEnd,
              metadata: {
                ownerId: prepared.ownerId,
                ownerType: 'employer',
                actorId: prepared.ownerId,
                usageContext: 'employer_resume_assessment',
                harness: 'ats',
                logicalRunId: prepared.runId,
                modelAlias: prepared.alias,
                effort: prepared.effort,
                litellmRequestIds: requestIds,
                succeeded: outcome.succeeded,
              },
            },
          },
          { upsert: true },
        )
        .exec();
    } finally {
      await this.release(ownerId, prepared.runId, spendAfter);
    }
    return { costUsd, requestIds };
  }

  async budgetStatus(ownerIdValue: string): Promise<EmployerAtsBudgetStatus> {
    try {
      const ownerId = this.objectId(ownerIdValue);
      const configured = await this.ensureAccount(ownerIdValue, ownerId);
      const virtualKey = this.secrets.decrypt(configured.account.encryptedKey);
      const info = await this.keys.info(virtualKey);
      const limitUsd = info.limitUsd ?? configured.maxBudgetUsd;
      const view = this.budgetView(limitUsd, info.spendUsd, info.resetAt);
      const exhausted = info.spendUsd >= limitUsd;
      return {
        status: exhausted ? 'BUDGET_EXHAUSTED' : 'READY',
        ...(exhausted ? { reason: 'EMPLOYER_BUDGET_EXHAUSTED' } : {}),
        ...view,
      };
    } catch {
      return {
        status: 'CONFIGURATION_ERROR',
        reason: 'EMPLOYER_ATS_CONFIGURATION_ERROR',
      };
    }
  }

  private async ensureAccount(
    ownerIdValue: string,
    ownerId: Types.ObjectId | string,
  ): Promise<{
    account: any;
    alias: ResolvedModelAlias;
    maxBudgetUsd: number;
  }> {
    const subscription: any = await this.billing.getOrCreateSubscription(
      ownerIdValue,
    );
    const plan = getEmployerPlan(subscription.plan || 'free');
    if (!plan) throw new Error('Employer ATS plan is not configured');
    const allowed = await this.aliases.listForTier(plan.modelTier);
    const alias = await this.aliases.resolveForTier(plan.modelTier);
    if (!allowed.length) throw new Error('Employer ATS alias is not configured');
    const models = allowed.map((entry) => entry.alias);
    const maxBudgetUsd = plan.limits.aiBudgetUsdLimit;
    const keyAlias = `jobocate-employer-${ownerIdValue}`;

    await this.runtimeModel
      .updateOne(
        { ownerId, ownerType: 'employer' },
        {
          $setOnInsert: {
            ownerId,
            ownerType: 'employer',
            models: [],
            maxBudgetUsd: 0,
            spendUsd: 0,
          },
        },
        { upsert: true },
      )
      .exec();
    let account: any = await this.runtimeModel
      .findOne({ ownerId, ownerType: 'employer' })
      .lean()
      .exec();

    if (!account?.encryptedKey) {
      const token = randomUUID();
      const claim: any = await this.runtimeModel
        .findOneAndUpdate(
          {
            ownerId,
            ownerType: 'employer',
            encryptedKey: { $exists: false },
            $or: [
              { provisioningToken: { $exists: false } },
              { provisioningUntil: { $lt: new Date() } },
            ],
          },
          {
            $set: {
              provisioningToken: token,
              provisioningUntil: new Date(
                Date.now() + EmployerAtsRuntimeService.LOCK_MS,
              ),
            },
          },
          { new: true },
        )
        .lean()
        .exec();
      if (!claim) throw new Error('Employer ATS key provisioning is in progress');
      try {
        const generated = await this.keys.generate({
          ownerId: ownerIdValue,
          keyAlias,
          models,
          maxBudgetUsd,
        });
        const encryptedKey = this.secrets.encrypt(generated.key);
        await this.runtimeModel
          .updateOne(
            { ownerId, ownerType: 'employer', provisioningToken: token },
            {
              $set: {
                encryptedKey,
                keyHash: createHash('sha256')
                  .update(generated.key)
                  .digest('hex'),
                keyAlias,
                plan: plan.key,
                modelTier: plan.modelTier,
                models,
                maxBudgetUsd,
              },
              $unset: { provisioningToken: 1, provisioningUntil: 1 },
            },
          )
          .exec();
        account = {
          ...account,
          encryptedKey,
          keyHash: createHash('sha256').update(generated.key).digest('hex'),
          keyAlias,
          plan: plan.key,
          modelTier: plan.modelTier,
          models,
          maxBudgetUsd,
        };
      } catch (error) {
        await this.runtimeModel
          .updateOne(
            { ownerId, ownerType: 'employer', provisioningToken: token },
            { $unset: { provisioningToken: 1, provisioningUntil: 1 } },
          )
          .exec();
        throw error;
      }
    } else if (
      account.plan !== plan.key ||
      account.maxBudgetUsd !== maxBudgetUsd ||
      JSON.stringify(account.models || []) !== JSON.stringify(models)
    ) {
      const virtualKey = this.secrets.decrypt(account.encryptedKey);
      await this.keys.update(virtualKey, { models, maxBudgetUsd });
      await this.runtimeModel
        .updateOne(
          { ownerId, ownerType: 'employer' },
          {
            $set: {
              plan: plan.key,
              modelTier: plan.modelTier,
              models,
              maxBudgetUsd,
            },
          },
        )
        .exec();
      account = {
        ...account,
        plan: plan.key,
        modelTier: plan.modelTier,
        models,
        maxBudgetUsd,
      };
    }

    return { account, alias, maxBudgetUsd };
  }

  private async ensureSandbox(
    ownerIdValue: string,
    ownerId: Types.ObjectId | string,
    account: any,
    virtualKey: string,
  ): Promise<string> {
    if (account.sandboxId) {
      try {
        const ping = await this.sandbox.exec(account.sandboxId, ['true'], {
          timeoutSeconds: 10,
        });
        if (ping.exitCode === 0) return account.sandboxId;
      } catch {
        // Reaped or externally removed; claim a replacement below.
      }
    }

    const token = randomUUID();
    const claim: any = await this.runtimeModel
      .findOneAndUpdate(
        {
          ownerId,
          ownerType: 'employer',
          $or: [
            { sandboxProvisioningToken: { $exists: false } },
            { sandboxProvisioningUntil: { $lt: new Date() } },
          ],
        },
        {
          $set: {
            sandboxProvisioningToken: token,
            sandboxProvisioningUntil: new Date(
              Date.now() + EmployerAtsRuntimeService.LOCK_MS,
            ),
          },
        },
        { new: true },
      )
      .lean()
      .exec();
    if (!claim) throw new Error('Employer ATS sandbox provisioning is in progress');
    const baseUrl = (
      process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL ||
      process.env.LITELLM_BASE_URL ||
      'http://localhost:4000'
    ).replace(/\/v1\/?$/, '');
    try {
      const provisioned = await this.sandbox.provision({
        sessionId: `employer-${ownerIdValue}`,
        harness: 'ats',
        env: {
          JOBOCATE_LITELLM_BASE_URL: baseUrl,
          JOBOCATE_LITELLM_API_KEY: virtualKey,
        },
        files: [],
      });
      await this.runtimeModel
        .updateOne(
          {
            ownerId,
            ownerType: 'employer',
            sandboxProvisioningToken: token,
          },
          {
            $set: { sandboxId: provisioned.sandboxId },
            $unset: {
              sandboxProvisioningToken: 1,
              sandboxProvisioningUntil: 1,
            },
          },
        )
        .exec();
      return provisioned.sandboxId;
    } catch (error) {
      await this.runtimeModel
        .updateOne(
          {
            ownerId,
            ownerType: 'employer',
            sandboxProvisioningToken: token,
          },
          {
            $unset: {
              sandboxProvisioningToken: 1,
              sandboxProvisioningUntil: 1,
            },
          },
        )
        .exec();
      throw error;
    }
  }

  private budgetView(limitUsd: number, spentUsd: number, resetAt?: Date) {
    return {
      limitUsd: this.money(limitUsd),
      spentUsd: this.money(spentUsd),
      remainingUsd: this.money(Math.max(0, limitUsd - spentUsd)),
      period: 'monthly' as const,
      ...(resetAt ? { resetAt } : {}),
    };
  }

  private async settledUsage(
    prepared: PreparedEmployerAtsRun,
  ): Promise<{ spendAfter: number; logs: any[] }> {
    let spendAfter = prepared.spendBeforeUsd;
    let logs: any[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        spendAfter = Math.max(
          spendAfter,
          (await this.keys.info(prepared.virtualKey)).spendUsd,
        );
      } catch {
        // Spend logs below are also authoritative and can supply the delta.
      }
      try {
        logs = await this.keys.spendLogs(prepared.startedAt, new Date());
      } catch {
        logs = [];
      }
      const attributed = logs.filter(
        (log) =>
          log.keyAlias === prepared.keyAlias &&
          (!log.startedAt || log.startedAt >= prepared.startedAt),
      );
      if (attributed.length) {
        const loggedCost = attributed.reduce(
          (sum, log) => sum + Number(log.costUsd || 0),
          0,
        );
        spendAfter = Math.max(
          spendAfter,
          prepared.spendBeforeUsd + loggedCost,
        );
        return { spendAfter, logs };
      }
      if (attempt === 9) return { spendAfter, logs };
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return { spendAfter, logs };
  }

  private release(
    ownerId: Types.ObjectId | string,
    runId: string,
    spendUsd?: number,
  ): Promise<any> {
    return this.runtimeModel
      .updateOne(
        { ownerId, ownerType: 'employer', activeRunId: runId },
        {
          ...(spendUsd == null ? {} : { $set: { spendUsd } }),
          $unset: { activeRunId: 1, runLockUntil: 1 },
        },
      )
      .exec();
  }

  private objectId(value: string): Types.ObjectId | string {
    return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
  }

  private money(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
}
