"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureKeys = exports.EntitlementCheckResponseSchema = exports.CheckEntitlementSchema = exports.CancelSubscriptionSchema = exports.BillingPortalSessionResponseSchema = exports.CreateBillingPortalSessionSchema = exports.CreateCheckoutSessionResponseSchema = exports.CreateCheckoutSessionSchema = exports.UsageRecordSchema = exports.UserSubscriptionSchema = exports.CreatePlanEntitlementSchema = exports.PlanEntitlementSchema = exports.CreateSubscriptionPlanSchema = exports.SubscriptionPlanSchema = exports.EntitlementTypeEnum = exports.SubscriptionStatusEnum = exports.BillingCycleEnum = exports.PlanTypeEnum = void 0;
const zod_1 = require("zod");
exports.PlanTypeEnum = zod_1.z.enum(['FREE', 'PRO', 'ELITE', 'INTERVIEW']);
exports.BillingCycleEnum = zod_1.z.enum(['monthly', 'yearly']);
exports.SubscriptionStatusEnum = zod_1.z.enum([
    'active',
    'canceled',
    'past_due',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'unpaid',
    'paused',
]);
exports.EntitlementTypeEnum = zod_1.z.enum([
    'boolean',
    'limit',
    'tier',
]);
exports.SubscriptionPlanSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: exports.PlanTypeEnum,
    description: zod_1.z.string(),
    priceMonthly: zod_1.z.number().min(0),
    priceYearly: zod_1.z.number().min(0),
    stripePriceIdMonthly: zod_1.z.string().optional(),
    stripePriceIdYearly: zod_1.z.string().optional(),
    features: zod_1.z.array(zod_1.z.string()),
    isActive: zod_1.z.boolean().default(true),
    sortOrder: zod_1.z.number().default(0),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.CreateSubscriptionPlanSchema = exports.SubscriptionPlanSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.PlanEntitlementSchema = zod_1.z.object({
    id: zod_1.z.string(),
    planId: zod_1.z.string(),
    featureKey: zod_1.z.string(),
    featureName: zod_1.z.string(),
    type: exports.EntitlementTypeEnum,
    value: zod_1.z.union([zod_1.z.boolean(), zod_1.z.number(), zod_1.z.string()]),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.CreatePlanEntitlementSchema = exports.PlanEntitlementSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.UserSubscriptionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    planId: zod_1.z.string(),
    stripeCustomerId: zod_1.z.string().optional(),
    stripeSubscriptionId: zod_1.z.string().optional(),
    status: exports.SubscriptionStatusEnum,
    billingCycle: exports.BillingCycleEnum,
    currentPeriodStart: zod_1.z.date(),
    currentPeriodEnd: zod_1.z.date(),
    cancelAtPeriodEnd: zod_1.z.boolean().default(false),
    canceledAt: zod_1.z.date().optional(),
    trialStart: zod_1.z.date().optional(),
    trialEnd: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.UsageRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    featureKey: zod_1.z.string(),
    count: zod_1.z.number().default(0),
    periodStart: zod_1.z.date(),
    periodEnd: zod_1.z.date(),
    lastUsedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.CreateCheckoutSessionSchema = zod_1.z.object({
    planId: zod_1.z.string(),
    billingCycle: exports.BillingCycleEnum,
    successUrl: zod_1.z.string().url().optional(),
    cancelUrl: zod_1.z.string().url().optional(),
});
exports.CreateCheckoutSessionResponseSchema = zod_1.z.object({
    sessionId: zod_1.z.string(),
    url: zod_1.z.string().url(),
});
exports.CreateBillingPortalSessionSchema = zod_1.z.object({
    returnUrl: zod_1.z.string().url().optional(),
});
exports.BillingPortalSessionResponseSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
});
exports.CancelSubscriptionSchema = zod_1.z.object({
    cancelAtPeriodEnd: zod_1.z.boolean().default(true),
});
exports.CheckEntitlementSchema = zod_1.z.object({
    featureKey: zod_1.z.string(),
    requiredValue: zod_1.z.union([zod_1.z.boolean(), zod_1.z.number(), zod_1.z.string()]).optional(),
});
exports.EntitlementCheckResponseSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    currentValue: zod_1.z.union([zod_1.z.boolean(), zod_1.z.number(), zod_1.z.string()]).optional(),
    limit: zod_1.z.union([zod_1.z.boolean(), zod_1.z.number(), zod_1.z.string()]).optional(),
    usage: zod_1.z.number().optional(),
    remaining: zod_1.z.number().optional(),
    message: zod_1.z.string().optional(),
});
exports.FeatureKeys = {
    AI_RESUME_OPTIMIZATION: 'ai_resume_optimization',
    AI_COVER_LETTER: 'ai_cover_letter',
    AI_INTERVIEW_PREP: 'ai_interview_prep',
    HUMAN_AGENT_SUPPORT: 'human_agent_support',
    PRIORITY_JOB_MATCHING: 'priority_job_matching',
    RESUME_TEMPLATES_PREMIUM: 'resume_templates_premium',
    ANALYTICS_ADVANCED: 'analytics_advanced',
    JOB_APPLICATIONS_PER_MONTH: 'job_applications_per_month',
    RESUME_VERSIONS: 'resume_versions',
    AI_CREDITS_PER_MONTH: 'ai_credits_per_month',
    SAVED_JOBS: 'saved_jobs',
    JOB_ALERTS: 'job_alerts',
    AGENT_TYPE: 'agent_type',
    SUPPORT_LEVEL: 'support_level',
};
//# sourceMappingURL=index.js.map