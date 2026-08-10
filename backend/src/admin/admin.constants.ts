/**
 * Monthly price (USD) per employer subscription plan, used to estimate MRR on
 * the admin metrics dashboard. `enterprise` is 0 because those deals are priced
 * bespoke / off-platform and cannot be inferred from the plan alone.
 *
 * MRR estimate = Σ (count of active subs on plan × EMPLOYER_PLAN_PRICES[plan]).
 */
export const EMPLOYER_PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 99,
  growth: 299,
  scale: 799,
  enterprise: 0,
};
