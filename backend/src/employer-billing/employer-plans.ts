/**
 * Employer plan limits and capabilities. Prices and product IDs come from the
 * configured Stripe catalog, not from this file.
 */
export interface EmployerPlan {
  key: string;
  name: string;
  tagline: string;
  popular: boolean;
  /** false for the free tier. */
  selfServe: boolean;
  /** Alias-catalogue tier used for employer-owned ATS model selection. */
  modelTier: string;
  limits: {
    jobSlotsLimit: number;
    seatsLimit: number;
    aiActionsLimit: number;
    sourcingCreditsLimit: number;
    /** Monthly measured AI spend allowance. 100 credits = $1 at the LiteLLM boundary. */
    aiBudgetCreditsLimit: number;
  };
}

export const EMPLOYER_PLANS: EmployerPlan[] = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Post your first role',
    popular: false,
    selfServe: false,
    modelTier: 'FREE',
    limits: {
      jobSlotsLimit: 1,
      seatsLimit: 1,
      aiActionsLimit: 25,
      sourcingCreditsLimit: 10,
      aiBudgetCreditsLimit: 100,
    },
  },
  {
    key: 'paid',
    name: 'Paid',
    tagline: 'More room for your hiring team',
    popular: true,
    selfServe: true,
    modelTier: 'PRO',
    limits: {
      jobSlotsLimit: 3,
      seatsLimit: 3,
      aiActionsLimit: 200,
      sourcingCreditsLimit: 50,
      aiBudgetCreditsLimit: 400,
    },
  },
];

for (const plan of EMPLOYER_PLANS) {
  if (!Number.isSafeInteger(plan.limits.aiBudgetCreditsLimit) || plan.limits.aiBudgetCreditsLimit <= 0) {
    throw new Error(`Employer plan ${plan.key} must have a positive integer AI credit allowance`);
  }
}

export const getEmployerPlan = (key: string): EmployerPlan | undefined =>
  EMPLOYER_PLANS.find((p) => p.key === key);
