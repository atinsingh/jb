import { readFileSync } from 'fs';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  AiBudgetEstimatePolicy,
  AiBudgetPolicy,
  AiBudgetServiceId,
  AiBudgetTier,
  AiCostEstimate,
  ServiceBudgetPolicy,
  TierBudgetPolicy,
} from './ai-budget-policy.types';

const SERVICE_IDS = [
  'resume_agent_turn',
  'resume_look_change',
  'candidate_ats_review',
  'employer_ats_review',
  'ai_content_heuristic',
] as const;

const tierSchema = z
  .object({
    maxBudgetUsd: z.number().positive().finite(),
    budgetDuration: z.literal('1mo'),
  })
  .strict();

const serviceSchema = z
  .object({
    id: z.enum(SERVICE_IDS),
    enabled: z.boolean(),
    metered: z.boolean(),
    ownerType: z.enum(['candidate', 'employer']).optional(),
    pool: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((service, context) => {
    if (service.metered && (!service.ownerType || !service.pool)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Metered service ${service.id} requires ownerType and pool`,
      });
    }
    if (!service.metered && (service.ownerType || service.pool)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unmetered service ${service.id} cannot select a budget pool`,
      });
    }
  });

const estimateSchema = z
  .object({
    alias: z.string().min(1),
    service: z.enum(SERVICE_IDS),
    kind: z.enum(['range', 'usage_based']),
    minUsd: z.number().nonnegative().finite().optional(),
    maxUsd: z.number().positive().finite().optional(),
    label: z.string().min(1),
  })
  .strict()
  .superRefine((estimate, context) => {
    if (estimate.kind === 'range') {
      if (estimate.minUsd === undefined || estimate.maxUsd === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Range estimates require minUsd and maxUsd',
        });
      } else if (estimate.minUsd > estimate.maxUsd) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Range estimate minUsd cannot exceed maxUsd',
        });
      }
    } else if (estimate.minUsd !== undefined || estimate.maxUsd !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usage-based estimates cannot declare a fixed amount or range',
      });
    }
  });

const stripePriceSchema = z
  .object({
    productId: z.string().startsWith('prod_'),
    priceId: z.string().startsWith('price_'),
    amountUsd: z.number().nonnegative().finite(),
  })
  .strict();

const rawPolicySchema = z
  .object({
    version: z.literal(1),
    currency: z.literal('USD'),
    lowRemainingRatio: z.number().gt(0).lt(1),
    tiers: z
      .object({
        FREE: tierSchema,
        PRO: tierSchema,
      })
      .strict(),
    services: z.array(serviceSchema),
    estimates: z.array(estimateSchema).default([]),
    stripe: z
      .object({
        paid: z
          .object({
            monthly: stripePriceSchema,
            yearly: stripePriceSchema,
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((policy, context) => {
    const ids = policy.services.map((service) => service.id);
    for (const id of SERVICE_IDS) {
      if (!ids.includes(id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['services'],
          message: `Missing required service id: ${id}`,
        });
      }
    }
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['services'],
        message: `Duplicate service id: ${duplicate}`,
      });
    }
  });

const liteLlmSchema = z
  .object({
    model_list: z.array(
      z
        .object({
          model_name: z.string().min(1),
          model_info: z
            .object({
              input_cost_per_token: z.number().positive().finite(),
              output_cost_per_token: z.number().positive().finite(),
            })
            .passthrough(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export class AiBudgetConfigurationError extends Error {
  readonly code = 'AI_BUDGET_CONFIGURATION_INVALID';

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AiBudgetConfigurationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function parseAiBudgetPolicy(value: unknown): AiBudgetPolicy {
  const parsed = rawPolicySchema.parse(value);
  const services = Object.fromEntries(
    parsed.services.map((service) => [service.id, service]),
  ) as Record<AiBudgetServiceId, ServiceBudgetPolicy>;

  return deepFreeze({
    ...parsed,
    services,
  } as AiBudgetPolicy);
}

@Injectable()
export class AiBudgetPolicyService {
  private readonly policy: AiBudgetPolicy;

  constructor(policyPath = join(process.cwd(), 'config', 'ai-budget.yaml')) {
    try {
      this.policy = parseAiBudgetPolicy(
        parseYaml(readFileSync(policyPath, 'utf8')),
      );
      this.validateLiteLlmAliases();
    } catch (error) {
      if (error instanceof AiBudgetConfigurationError) throw error;
      throw new AiBudgetConfigurationError(
        `Invalid AI budget policy at ${policyPath}`,
        error,
      );
    }
  }

  tier(tier: string): TierBudgetPolicy {
    const policy = this.policy.tiers[tier as AiBudgetTier];
    if (!policy) {
      throw new AiBudgetConfigurationError(`Unknown AI budget tier: ${tier}`);
    }
    return policy;
  }

  lowRemainingRatio(): number {
    return this.policy.lowRemainingRatio;
  }

  service(service: AiBudgetServiceId): ServiceBudgetPolicy {
    return this.policy.services[service];
  }

  estimate(alias: string, service: AiBudgetServiceId): AiCostEstimate {
    const estimate = this.policy.estimates.find(
      (candidate) => candidate.alias === alias && candidate.service === service,
    );
    if (!estimate) return { kind: 'usage_based', label: 'Usage based' };
    const { kind, minUsd, maxUsd, label } = estimate;
    return deepFreeze({ kind, minUsd, maxUsd, label });
  }

  stripePaid() {
    return this.policy.stripe.paid;
  }

  private validateLiteLlmAliases(): void {
    const configPath = join(
      process.cwd(),
      '..',
      'infra',
      'litellm',
      'config.yaml',
    );
    const config = liteLlmSchema.parse(
      parseYaml(readFileSync(configPath, 'utf8')),
    );
    const aliases = new Set(config.model_list.map((model) => model.model_name));
    for (const estimate of this.policy
      .estimates as readonly AiBudgetEstimatePolicy[]) {
      if (!aliases.has(estimate.alias)) {
        throw new AiBudgetConfigurationError(
          `AI budget estimate references inactive LiteLLM alias: ${estimate.alias}`,
        );
      }
    }
  }
}
