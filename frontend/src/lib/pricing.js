/**
 * Single source of truth for publicly-displayed prices.
 *
 * IMPORTANT: these amounts are presentation constants, not a live billing
 * model. The backend currently reports `amount: 0` and no Stripe price IDs are
 * configured (see backend/src/employer-billing). They are centralized here so
 * that /pricing, /employers/pricing and the homepage preview can never show
 * three different numbers, and so there is exactly one place to edit when real
 * billing lands.
 *
 * Do not invent new amounts elsewhere. Import from here or link to /pricing.
 */

export const CANDIDATE_PRICING = {
  free: {
    name: 'Free',
    monthly: '$0',
    annual: '$0',
    per: '/mo',
    tagline: 'Everything to start your search the smart way.',
    highlights: [
      'AI resume builder',
      'Smart job matching',
      '10 auto-apply credits / mo',
      'Application tracker',
    ],
  },
  pro: {
    name: 'Pro',
    monthly: '$29',
    annual: '$19',
    per: '/mo',
    tagline: 'Put the busywork on autopilot.',
    highlights: [
      'Unlimited job matching',
      '150 auto-apply credits / mo',
      'AI cover letters',
      'Per-role personalization',
    ],
  },
  premium: {
    name: 'Premium',
    monthly: '$59',
    annual: '$39',
    per: '/mo',
    tagline: 'Maximum volume, maximum signal.',
    highlights: [
      'Unlimited auto-apply',
      'Advanced personalization',
      'Full AI interview prep',
      'Salary & offer insights',
    ],
  },
};

export const ANNUAL_SAVING_NOTE = 'billed annually · save 33%';

/** Resolve a tier's displayed price for the current billing toggle. */
export const priceFor = (tier, annual) => (annual ? tier.annual : tier.monthly);

/**
 * Employer pricing is per-job / subscription and is not yet finalized in the
 * billing service, so the homepage deliberately shows no amount and links to
 * the employer pricing page instead of inventing one.
 */
export const EMPLOYER_PRICING = {
  hasPublicAmounts: false,
  ctaLabel: 'View employer plans',
  summary: 'Pay per job post or subscribe for ongoing hiring.',
  highlights: [
    'Job posting & promotion',
    'AI candidate matching',
    'Hiring pipeline & collaboration',
    'Recruitment analytics',
  ],
};
