import { z } from 'zod';
export declare const PlanTypeEnum: z.ZodEnum<["FREE", "PRO", "ELITE", "INTERVIEW"]>;
export type PlanType = z.infer<typeof PlanTypeEnum>;
export declare const BillingCycleEnum: z.ZodEnum<["monthly", "yearly"]>;
export type BillingCycle = z.infer<typeof BillingCycleEnum>;
export declare const SubscriptionStatusEnum: z.ZodEnum<["active", "canceled", "past_due", "incomplete", "incomplete_expired", "trialing", "unpaid", "paused"]>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;
export declare const EntitlementTypeEnum: z.ZodEnum<["boolean", "limit", "tier"]>;
export type EntitlementType = z.infer<typeof EntitlementTypeEnum>;
export declare const SubscriptionPlanSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["FREE", "PRO", "ELITE", "INTERVIEW"]>;
    description: z.ZodString;
    priceMonthly: z.ZodNumber;
    priceYearly: z.ZodNumber;
    stripePriceIdMonthly: z.ZodOptional<z.ZodString>;
    stripePriceIdYearly: z.ZodOptional<z.ZodString>;
    features: z.ZodArray<z.ZodString, "many">;
    isActive: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    isActive?: boolean;
    id?: string;
    type?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
    createdAt?: Date;
    updatedAt?: Date;
    description?: string;
    features?: string[];
    priceMonthly?: number;
    priceYearly?: number;
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
    sortOrder?: number;
}, {
    name?: string;
    isActive?: boolean;
    id?: string;
    type?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
    createdAt?: Date;
    updatedAt?: Date;
    description?: string;
    features?: string[];
    priceMonthly?: number;
    priceYearly?: number;
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
    sortOrder?: number;
}>;
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;
export declare const CreateSubscriptionPlanSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["FREE", "PRO", "ELITE", "INTERVIEW"]>;
    description: z.ZodString;
    priceMonthly: z.ZodNumber;
    priceYearly: z.ZodNumber;
    stripePriceIdMonthly: z.ZodOptional<z.ZodString>;
    stripePriceIdYearly: z.ZodOptional<z.ZodString>;
    features: z.ZodArray<z.ZodString, "many">;
    isActive: z.ZodDefault<z.ZodBoolean>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "id" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
    name?: string;
    isActive?: boolean;
    type?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
    description?: string;
    features?: string[];
    priceMonthly?: number;
    priceYearly?: number;
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
    sortOrder?: number;
}, {
    name?: string;
    isActive?: boolean;
    type?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
    description?: string;
    features?: string[];
    priceMonthly?: number;
    priceYearly?: number;
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
    sortOrder?: number;
}>;
export type CreateSubscriptionPlanDto = z.infer<typeof CreateSubscriptionPlanSchema>;
export declare const PlanEntitlementSchema: z.ZodObject<{
    id: z.ZodString;
    planId: z.ZodString;
    featureKey: z.ZodString;
    featureName: z.ZodString;
    type: z.ZodEnum<["boolean", "limit", "tier"]>;
    value: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    type?: "boolean" | "limit" | "tier";
    createdAt?: Date;
    updatedAt?: Date;
    value?: string | number | boolean;
    planId?: string;
    featureKey?: string;
    featureName?: string;
    metadata?: Record<string, any>;
}, {
    id?: string;
    type?: "boolean" | "limit" | "tier";
    createdAt?: Date;
    updatedAt?: Date;
    value?: string | number | boolean;
    planId?: string;
    featureKey?: string;
    featureName?: string;
    metadata?: Record<string, any>;
}>;
export type PlanEntitlement = z.infer<typeof PlanEntitlementSchema>;
export declare const CreatePlanEntitlementSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    planId: z.ZodString;
    featureKey: z.ZodString;
    featureName: z.ZodString;
    type: z.ZodEnum<["boolean", "limit", "tier"]>;
    value: z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "id" | "createdAt" | "updatedAt">, "strip", z.ZodTypeAny, {
    type?: "boolean" | "limit" | "tier";
    value?: string | number | boolean;
    planId?: string;
    featureKey?: string;
    featureName?: string;
    metadata?: Record<string, any>;
}, {
    type?: "boolean" | "limit" | "tier";
    value?: string | number | boolean;
    planId?: string;
    featureKey?: string;
    featureName?: string;
    metadata?: Record<string, any>;
}>;
export type CreatePlanEntitlementDto = z.infer<typeof CreatePlanEntitlementSchema>;
export declare const UserSubscriptionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    planId: z.ZodString;
    stripeCustomerId: z.ZodOptional<z.ZodString>;
    stripeSubscriptionId: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["active", "canceled", "past_due", "incomplete", "incomplete_expired", "trialing", "unpaid", "paused"]>;
    billingCycle: z.ZodEnum<["monthly", "yearly"]>;
    currentPeriodStart: z.ZodDate;
    currentPeriodEnd: z.ZodDate;
    cancelAtPeriodEnd: z.ZodDefault<z.ZodBoolean>;
    canceledAt: z.ZodOptional<z.ZodDate>;
    trialStart: z.ZodOptional<z.ZodDate>;
    trialEnd: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    stripeCustomerId?: string;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    status?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
    planId?: string;
    stripeSubscriptionId?: string;
    billingCycle?: "monthly" | "yearly";
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date;
    trialStart?: Date;
    trialEnd?: Date;
}, {
    stripeCustomerId?: string;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    status?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
    planId?: string;
    stripeSubscriptionId?: string;
    billingCycle?: "monthly" | "yearly";
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date;
    trialStart?: Date;
    trialEnd?: Date;
}>;
export type UserSubscription = z.infer<typeof UserSubscriptionSchema>;
export declare const UsageRecordSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    featureKey: z.ZodString;
    count: z.ZodDefault<z.ZodNumber>;
    periodStart: z.ZodDate;
    periodEnd: z.ZodDate;
    lastUsedAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    count?: number;
    userId?: string;
    featureKey?: string;
    periodStart?: Date;
    periodEnd?: Date;
    lastUsedAt?: Date;
}, {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    count?: number;
    userId?: string;
    featureKey?: string;
    periodStart?: Date;
    periodEnd?: Date;
    lastUsedAt?: Date;
}>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
export declare const CreateCheckoutSessionSchema: z.ZodObject<{
    planId: z.ZodString;
    billingCycle: z.ZodEnum<["monthly", "yearly"]>;
    successUrl: z.ZodOptional<z.ZodString>;
    cancelUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    planId?: string;
    billingCycle?: "monthly" | "yearly";
    successUrl?: string;
    cancelUrl?: string;
}, {
    planId?: string;
    billingCycle?: "monthly" | "yearly";
    successUrl?: string;
    cancelUrl?: string;
}>;
export type CreateCheckoutSessionDto = z.infer<typeof CreateCheckoutSessionSchema>;
export declare const CreateCheckoutSessionResponseSchema: z.ZodObject<{
    sessionId: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url?: string;
    sessionId?: string;
}, {
    url?: string;
    sessionId?: string;
}>;
export type CreateCheckoutSessionResponse = z.infer<typeof CreateCheckoutSessionResponseSchema>;
export declare const CreateBillingPortalSessionSchema: z.ZodObject<{
    returnUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    returnUrl?: string;
}, {
    returnUrl?: string;
}>;
export type CreateBillingPortalSessionDto = z.infer<typeof CreateBillingPortalSessionSchema>;
export declare const BillingPortalSessionResponseSchema: z.ZodObject<{
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url?: string;
}, {
    url?: string;
}>;
export type BillingPortalSessionResponse = z.infer<typeof BillingPortalSessionResponseSchema>;
export declare const CancelSubscriptionSchema: z.ZodObject<{
    cancelAtPeriodEnd: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    cancelAtPeriodEnd?: boolean;
}, {
    cancelAtPeriodEnd?: boolean;
}>;
export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionSchema>;
export declare const CheckEntitlementSchema: z.ZodObject<{
    featureKey: z.ZodString;
    requiredValue: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>>;
}, "strip", z.ZodTypeAny, {
    featureKey?: string;
    requiredValue?: string | number | boolean;
}, {
    featureKey?: string;
    requiredValue?: string | number | boolean;
}>;
export type CheckEntitlementDto = z.infer<typeof CheckEntitlementSchema>;
export declare const EntitlementCheckResponseSchema: z.ZodObject<{
    allowed: z.ZodBoolean;
    currentValue: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>>;
    limit: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodNumber, z.ZodString]>>;
    usage: z.ZodOptional<z.ZodNumber>;
    remaining: z.ZodOptional<z.ZodNumber>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message?: string;
    limit?: string | number | boolean;
    usage?: number;
    allowed?: boolean;
    remaining?: number;
    currentValue?: string | number | boolean;
}, {
    message?: string;
    limit?: string | number | boolean;
    usage?: number;
    allowed?: boolean;
    remaining?: number;
    currentValue?: string | number | boolean;
}>;
export type EntitlementCheckResponse = z.infer<typeof EntitlementCheckResponseSchema>;
export declare const FeatureKeys: {
    readonly AI_RESUME_OPTIMIZATION: "ai_resume_optimization";
    readonly AI_COVER_LETTER: "ai_cover_letter";
    readonly AI_INTERVIEW_PREP: "ai_interview_prep";
    readonly HUMAN_AGENT_SUPPORT: "human_agent_support";
    readonly PRIORITY_JOB_MATCHING: "priority_job_matching";
    readonly RESUME_TEMPLATES_PREMIUM: "resume_templates_premium";
    readonly ANALYTICS_ADVANCED: "analytics_advanced";
    readonly JOB_APPLICATIONS_PER_MONTH: "job_applications_per_month";
    readonly RESUME_VERSIONS: "resume_versions";
    readonly AI_CREDITS_PER_MONTH: "ai_credits_per_month";
    readonly SAVED_JOBS: "saved_jobs";
    readonly JOB_ALERTS: "job_alerts";
    readonly AGENT_TYPE: "agent_type";
    readonly SUPPORT_LEVEL: "support_level";
};
export type FeatureKey = (typeof FeatureKeys)[keyof typeof FeatureKeys];
