import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { AiBudgetService } from '../ai-budget/ai-budget.service';
import { AiBudgetOwnerType } from '../ai-budget/ai-budget-policy.types';
import { ModelAliasService } from '../resume-harness/model-alias.service';
import { LiteLLMProvider } from './providers/litellm.provider';
import type { LLMFeature } from './llm-routing.service';

export function modelOwner(feature: LLMFeature): AiBudgetOwnerType {
  return [
    'screenApplicants',
    'recruiterCopilot',
    'sourceCandidates',
    'interviewScorecard',
    'generateJobDescription',
    'employerAtsReview',
  ].includes(feature)
    ? 'employer'
    : 'candidate';
}

interface OwnerModelContext {
  ownerType: AiBudgetOwnerType;
  ownerId: string;
  alias: string;
  provider: LiteLLMProvider;
  tags: readonly string[];
}

/** Keeps retries and nested tool calls within one measured logical operation. */
@Injectable()
export class OwnerLlmService {
  private readonly context = new AsyncLocalStorage<OwnerModelContext>();

  constructor(
    private readonly budget: AiBudgetService,
    private readonly aliases: ModelAliasService,
  ) {}

  async run<T>(
    ownerId: string,
    feature: LLMFeature,
    task: (context: OwnerModelContext) => Promise<T>,
  ): Promise<T> {
    if (!ownerId) throw new Error('An authenticated AI owner is required');
    const ownerType = modelOwner(feature);
    const current = this.context.getStore();
    if (current) {
      if (current.ownerId !== ownerId || current.ownerType !== ownerType)
        throw new Error('AI owner cannot change during a logical operation');
      return task(current);
    }
    const tier = await this.budget.ownerTier(ownerType, ownerId);
    const alias = await this.aliases.resolveAutomaticForTier(tier);
    const runId = randomUUID();
    return this.budget.withOwnerLease(
      ownerType,
      ownerId,
      feature === 'employerAtsReview'
        ? 'employer_ats_review'
        : ownerType === 'candidate'
          ? 'candidate_model_call'
          : 'employer_model_call',
      {
        harness: 'chat-completions',
        alias: alias.alias,
        model: alias.model,
        effort: alias.effort,
        sessionId: runId,
        runId,
      },
      async (access, tags) => {
        const context = {
          ownerType,
          ownerId,
          alias: alias.alias,
          tags,
          provider: LiteLLMProvider.forOwner(access.apiKey, alias.alias, tags),
        };
        return this.context.run(context, () => task(context));
      },
    );
  }
}
