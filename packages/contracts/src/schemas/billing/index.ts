import { z } from 'zod';

// ==================== ENUMS ====================
export const PlanTypeEnum = z.enum(['FREE', 'PRO', 'ELITE', 'INTERVIEW']);
export type PlanType = z.infer<typeof PlanTypeEnum>;

export const BillingCycleEnum = z.enum(['monthly', 'yearly']);
export type BillingCycle = z.infer<typeof BillingCycleEnum>;

export const SubscriptionStatusEnum = z.enum([
  'active',
  'canceled',
  'past_due',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'unpaid',
  'paused',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

export const EntitlementTypeEnum = z.enum([
  'boolean',   // Feature flag (on/off)
  'limit',     // Numeric limit
  'tier',      // Tier-based (e.g., basic, advanced, premium)
]);
export type EntitlementType = z.infer<typeof EntitlementTypeEnum>;

// ==================== SUBSCRIPTION PLAN ====================
export const SubscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: PlanTypeEnum,
  description: z.string(),
  priceMonthly: z.number().min(0),
  priceYearly: z.number().min(0),
  stripePriceIdMonthly: z.string().optional(),
  stripePriceIdYearly: z.string().optional(),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export const CreateSubscriptionPlanSchema = SubscriptionPlanSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSubscriptionPlanDto = z.infer<typeof CreateSubscriptionPlanSchema>;

// ==================== PLAN ENTITLEMENT ====================
export const PlanEntitlementSchema = z.object({
  id: z.string(),
  planId: z.string(),
  featureKey: z.string(), // e.g., 'ai_resume_optimization', 'job_applications_per_month'
  featureName: z.string(),
  type: EntitlementTypeEnum,
  value: z.union([z.boolean(), z.number(), z.string()]), // Based on type
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type PlanEntitlement = z.infer<typeof PlanEntitlementSchema>;

export const CreatePlanEntitlementSchema = PlanEntitlementSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePlanEntitlementDto = z.infer<typeof CreatePlanEntitlementSchema>;

// ==================== USER SUBSCRIPTION ====================
export const UserSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  status: SubscriptionStatusEnum,
  billingCycle: BillingCycleEnum,
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean().default(false),
  canceledAt: z.date().optional(),
  trialStart: z.date().optional(),
  trialEnd: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type UserSubscription = z.infer<typeof UserSubscriptionSchema>;

// ==================== USAGE TRACKING ====================
export const UsageRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  featureKey: z.string(),
  count: z.number().default(0),
  periodStart: z.date(),
  periodEnd: z.date(),
  lastUsedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type UsageRecord = z.infer<typeof UsageRecordSchema>;

// ==================== API REQUESTS ====================
export const CreateCheckoutSessionSchema = z.object({
  planId: z.string(),
  billingCycle: BillingCycleEnum,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
export type CreateCheckoutSessionDto = z.infer<typeof CreateCheckoutSessionSchema>;

export const CreateCheckoutSessionResponseSchema = z.object({
  sessionId: z.string(),
  url: z.string().url(),
});
export type CreateCheckoutSessionResponse = z.infer<typeof CreateCheckoutSessionResponseSchema>;

export const CreateBillingPortalSessionSchema = z.object({
  returnUrl: z.string().url().optional(),
});
export type CreateBillingPortalSessionDto = z.infer<typeof CreateBillingPortalSessionSchema>;

export const BillingPortalSessionResponseSchema = z.object({
  url: z.string().url(),
});
export type BillingPortalSessionResponse = z.infer<typeof BillingPortalSessionResponseSchema>;

export const CancelSubscriptionSchema = z.object({
  cancelAtPeriodEnd: z.boolean().default(true),
});
export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionSchema>;

// ==================== ENTITLEMENT CHECK ====================
export const CheckEntitlementSchema = z.object({
  featureKey: z.string(),
  requiredValue: z.union([z.boolean(), z.number(), z.string()]).optional(),
});
export type CheckEntitlementDto = z.infer<typeof CheckEntitlementSchema>;

export const EntitlementCheckResponseSchema = z.object({
  allowed: z.boolean(),
  currentValue: z.union([z.boolean(), z.number(), z.string()]).optional(),
  limit: z.union([z.boolean(), z.number(), z.string()]).optional(),
  usage: z.number().optional(),
  remaining: z.number().optional(),
  message: z.string().optional(),
});
export type EntitlementCheckResponse = z.infer<typeof EntitlementCheckResponseSchema>;

// ==================== FEATURE KEYS ====================
export const FeatureKeys = {
  // Boolean features
  AI_RESUME_OPTIMIZATION: 'ai_resume_optimization',
  AI_COVER_LETTER: 'ai_cover_letter',
  AI_INTERVIEW_PREP: 'ai_interview_prep',
  HUMAN_AGENT_SUPPORT: 'human_agent_support',
  PRIORITY_JOB_MATCHING: 'priority_job_matching',
  RESUME_TEMPLATES_PREMIUM: 'resume_templates_premium',
  ANALYTICS_ADVANCED: 'analytics_advanced',
  
  // Limit features
  JOB_APPLICATIONS_PER_MONTH: 'job_applications_per_month',
  RESUME_VERSIONS: 'resume_versions',
  AI_CREDITS_PER_MONTH: 'ai_credits_per_month',
  SAVED_JOBS: 'saved_jobs',
  JOB_ALERTS: 'job_alerts',
  
  // Tier features
  AGENT_TYPE: 'agent_type', // 'ai' | 'human' | 'dedicated'
  SUPPORT_LEVEL: 'support_level', // 'community' | 'email' | 'priority' | 'dedicated'
} as const;

export type FeatureKey = (typeof FeatureKeys)[keyof typeof FeatureKeys];

