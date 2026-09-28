export type AiBudgetOwnerType = 'candidate' | 'employer';

export type AiBudgetTier = 'FREE' | 'PRO';

export type AiBudgetServiceId =
  | 'resume_agent_turn'
  | 'resume_look_change'
  | 'candidate_ats_review'
  | 'employer_ats_review'
  | 'ai_content_heuristic';

export interface TierBudgetPolicy {
  maxBudgetCredits: number;
  budgetDuration: '1mo';
}

export interface ServiceBudgetPolicy {
  id: AiBudgetServiceId;
  enabled: boolean;
  metered: boolean;
  ownerType?: AiBudgetOwnerType;
  pool?: string;
}

export interface AiCostEstimate {
  kind: 'range' | 'usage_based';
  minCredits?: number;
  maxCredits?: number;
  label: string;
}

export interface AiBudgetEstimatePolicy {
  alias: string;
  service: AiBudgetServiceId;
  kind: 'range' | 'usage_based';
  minUsd?: number;
  maxUsd?: number;
}

export interface StripePriceAssertion {
  productId: string;
  priceId: string;
  amountUsd: number;
}

export interface AiBudgetPolicy {
  version: 1;
  currency: 'USD';
  lowRemainingRatio: number;
  tiers: Record<AiBudgetTier, TierBudgetPolicy>;
  services: Record<AiBudgetServiceId, ServiceBudgetPolicy>;
  estimates: readonly AiBudgetEstimatePolicy[];
  stripe: {
    paid: {
      monthly: StripePriceAssertion;
      yearly: StripePriceAssertion;
    };
  };
}
