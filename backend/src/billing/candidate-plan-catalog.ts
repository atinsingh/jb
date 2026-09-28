import { Model, Types } from 'mongoose';
import { PlanEntitlementDocument } from '../schemas/plan-entitlement.schema';
import { SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';

type StripePaidPrices = {
  monthly: { productId: string; priceId: string; amountUsd: number };
  yearly: { productId: string; priceId: string; amountUsd: number };
};

type Entitlement = {
  featureKey: string;
  featureName: string;
  type: 'boolean' | 'limit' | 'tier';
  value: boolean | number | string;
};

const commonFree: Entitlement[] = [
  { featureKey: 'ai_resume_optimization', featureName: 'AI Resume Optimization', type: 'boolean', value: false },
  { featureKey: 'ai_cover_letter', featureName: 'AI Cover Letter', type: 'boolean', value: false },
  { featureKey: 'ai_interview_prep', featureName: 'AI Interview Prep', type: 'boolean', value: false },
  { featureKey: 'human_agent_support', featureName: 'Human Agent Support', type: 'boolean', value: false },
  { featureKey: 'priority_job_matching', featureName: 'Priority Job Matching', type: 'boolean', value: false },
  { featureKey: 'resume_templates_premium', featureName: 'Premium Resume Templates', type: 'boolean', value: false },
  { featureKey: 'analytics_advanced', featureName: 'Advanced Analytics', type: 'boolean', value: false },
  { featureKey: 'job_applications_per_month', featureName: 'Job Applications per Month', type: 'limit', value: 5 },
  { featureKey: 'resume_versions', featureName: 'Resume Versions', type: 'limit', value: 1 },
  { featureKey: 'saved_jobs', featureName: 'Saved Jobs', type: 'limit', value: 10 },
  { featureKey: 'job_alerts', featureName: 'Job Alerts', type: 'limit', value: 1 },
  { featureKey: 'interview_sessions_per_month', featureName: 'Interview Sessions per Month', type: 'limit', value: 1 },
  { featureKey: 'agent_type', featureName: 'Agent Type', type: 'tier', value: 'ai' },
  { featureKey: 'support_level', featureName: 'Support Level', type: 'tier', value: 'community' },
];

const commonPaid: Entitlement[] = [
  { featureKey: 'ai_resume_optimization', featureName: 'AI Resume Optimization', type: 'boolean', value: true },
  { featureKey: 'ai_cover_letter', featureName: 'AI Cover Letter', type: 'boolean', value: true },
  { featureKey: 'ai_interview_prep', featureName: 'AI Interview Prep', type: 'boolean', value: false },
  { featureKey: 'human_agent_support', featureName: 'Human Agent Support', type: 'boolean', value: false },
  { featureKey: 'priority_job_matching', featureName: 'Priority Job Matching', type: 'boolean', value: true },
  { featureKey: 'resume_templates_premium', featureName: 'Premium Resume Templates', type: 'boolean', value: false },
  { featureKey: 'analytics_advanced', featureName: 'Advanced Analytics', type: 'boolean', value: false },
  { featureKey: 'job_applications_per_month', featureName: 'Job Applications per Month', type: 'limit', value: 50 },
  { featureKey: 'resume_versions', featureName: 'Resume Versions', type: 'limit', value: 5 },
  // Action-count quota; the paid USD AI allowance remains $4/month and
  // resets monthly even when Stripe bills the subscription annually.
  { featureKey: 'saved_jobs', featureName: 'Saved Jobs', type: 'limit', value: 50 },
  { featureKey: 'job_alerts', featureName: 'Job Alerts', type: 'limit', value: 5 },
  { featureKey: 'interview_sessions_per_month', featureName: 'Interview Sessions per Month', type: 'limit', value: 5 },
  { featureKey: 'agent_type', featureName: 'Agent Type', type: 'tier', value: 'ai' },
  { featureKey: 'support_level', featureName: 'Support Level', type: 'tier', value: 'email' },
];

export async function reconcileCandidatePlans(
  planModel: Model<SubscriptionPlanDocument>,
  entitlementModel: Model<PlanEntitlementDocument>,
  stripe: StripePaidPrices,
): Promise<void> {
  const catalogue = [
    {
      type: 'FREE', name: 'Free', description: 'Get started with essential job search and AI features',
      priceMonthly: 0, priceYearly: 0, features: ['Basic job search', 'Monthly AI allowance'],
      isActive: true, sortOrder: 0, entitlements: commonFree,
    },
    {
      type: 'PRO', name: 'Paid', description: 'More capacity for an active AI-powered job search',
      priceMonthly: stripe.monthly.amountUsd, priceYearly: stripe.yearly.amountUsd,
      stripePriceIdMonthly: stripe.monthly.priceId, stripePriceIdYearly: stripe.yearly.priceId,
      features: ['Everything in Free', 'Higher monthly AI allowance', 'Priority job matching'],
      isActive: true, sortOrder: 1, entitlements: commonPaid,
    },
  ] as const;

  const planIds: Array<{ id: Types.ObjectId; entitlements: readonly Entitlement[] }> = [];
  for (const { entitlements, ...plan } of catalogue) {
    const saved = await planModel.findOneAndUpdate(
      { type: plan.type },
      { $set: plan },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (!saved) throw new Error(`Failed to reconcile candidate plan ${plan.type}`);
    planIds.push({ id: saved._id, entitlements });
  }

  await planModel.updateMany(
    { type: { $in: ['ELITE', 'INTERVIEW'] } },
    { $set: { isActive: false } },
  );

  for (const plan of planIds) {
    const featureKeys = plan.entitlements.map((item) => item.featureKey);
    for (const entitlement of plan.entitlements) {
      await entitlementModel.updateOne(
        { planId: plan.id, featureKey: entitlement.featureKey },
        { $set: entitlement },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }
    await entitlementModel.deleteMany({
      planId: plan.id,
      featureKey: { $nin: featureKeys },
    });
  }
}
