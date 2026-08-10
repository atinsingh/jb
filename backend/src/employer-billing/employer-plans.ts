/**
 * The employer plan catalog — one source of truth for limits, display prices and
 * the Stripe price lookup keys.
 *
 * Prices live in Stripe; only the *lookup keys* live here. A lookup key is a
 * stable, account-unique alias for a price, so the code never hardcodes a
 * `price_...` id and test/live accounts can hold different prices under the same
 * key. `scripts/sync-stripe-catalog.ts` creates prices under exactly these keys.
 *
 * `annual` is the marketed per-month price when paying yearly; the Stripe yearly
 * price is that × 12 (see the sync script) — keep the two in step.
 */
export interface EmployerPlan {
  key: string;
  name: string;
  tagline: string;
  /** Display price per month, in whole dollars. */
  monthly: number;
  /** Display price per month when billed annually, in whole dollars. */
  annual: number;
  popular: boolean;
  /** false → not purchasable through self-serve checkout (free tier, sales-led enterprise). */
  selfServe: boolean;
  limits: {
    jobSlotsLimit: number;
    seatsLimit: number;
    aiActionsLimit: number;
    sourcingCreditsLimit: number;
  };
}

export const EMPLOYER_PLANS: EmployerPlan[] = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Post your first role',
    monthly: 0,
    annual: 0,
    popular: false,
    selfServe: false,
    limits: {
      jobSlotsLimit: 1,
      seatsLimit: 1,
      aiActionsLimit: 25,
      sourcingCreditsLimit: 10,
    },
  },
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For a first hire or two',
    monthly: 99,
    annual: 79,
    popular: false,
    selfServe: true,
    limits: {
      jobSlotsLimit: 3,
      seatsLimit: 3,
      aiActionsLimit: 200,
      sourcingCreditsLimit: 50,
    },
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'For scaling teams',
    monthly: 299,
    annual: 249,
    popular: true,
    selfServe: true,
    limits: {
      jobSlotsLimit: 5,
      seatsLimit: 6,
      aiActionsLimit: 500,
      sourcingCreditsLimit: 100,
    },
  },
  {
    key: 'scale',
    name: 'Scale',
    tagline: 'High-volume recruiting',
    monthly: 799,
    annual: 649,
    popular: false,
    selfServe: true,
    limits: {
      jobSlotsLimit: 15,
      seatsLimit: 15,
      aiActionsLimit: 2000,
      sourcingCreditsLimit: 500,
    },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Security, SSO & SLAs',
    monthly: 0,
    annual: 0,
    popular: false,
    // Sales-led: an enterprise subscription is provisioned by an admin after a
    // contract, never bought from the pricing page.
    selfServe: false,
    limits: {
      jobSlotsLimit: 100,
      seatsLimit: 100,
      aiActionsLimit: 10000,
      sourcingCreditsLimit: 5000,
    },
  },
];

export const getEmployerPlan = (key: string): EmployerPlan | undefined =>
  EMPLOYER_PLANS.find((p) => p.key === key);

/** Stable Stripe lookup key for a plan + cycle, e.g. `jobocate_employer_growth_monthly`. */
export const employerPriceLookupKey = (
  planKey: string,
  billingCycle: 'monthly' | 'annual',
): string => `jobocate_employer_${planKey}_${billingCycle}`;
