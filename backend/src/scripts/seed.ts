import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../app.module';
import { SubscriptionPlan } from '../schemas/subscription-plan.schema';
import { PlanEntitlement } from '../schemas/plan-entitlement.schema';

// Define types locally
type PlanType = 'FREE' | 'PRO' | 'ELITE' | 'INTERVIEW';

// Feature Keys
const FeatureKeys = {
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
  INTERVIEW_SESSIONS_PER_MONTH: 'interview_sessions_per_month',
  // Employer "AI Recruiter" allowance. NOTE: this key is intentionally NOT
  // seeded into the candidate PlanEntitlement collection below. Employer users
  // authenticate as ROLE_EMPLOYER and their AI allowance is provisioned per
  // employer plan on their EmployerSubscription (aiActionsLimit / aiActionsUsed
  // — see employer-billing PLAN_LIMITS: free 25, starter 200, growth 500,
  // scale 2000, enterprise 10000; new employers default to free/25). The key
  // is declared here only for discoverability; LLMQuotaService resolves it
  // against EmployerSubscription, not this candidate entitlement seed.
  EMPLOYER_AI_CREDITS_PER_MONTH: 'employer_ai_credits_per_month',
};

interface PlanConfig {
  name: string;
  type: PlanType;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  sortOrder: number;
}

interface EntitlementConfig {
  featureKey: string;
  featureName: string;
  type: 'boolean' | 'limit' | 'tier';
  value: boolean | number | string;
}

// ==================== PLAN CONFIGURATIONS ====================
const PLANS: PlanConfig[] = [
  {
    name: 'Free',
    type: 'FREE',
    description: 'Get started with basic job search features',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Basic job search',
      '5 job applications per month',
      '1 resume version',
      'Community support',
    ],
    sortOrder: 0,
  },
  {
    name: 'Pro',
    type: 'PRO',
    description: 'Enhanced job search with AI-powered features',
    priceMonthly: 29,
    priceYearly: 290,
    features: [
      'Everything in Free',
      'AI resume optimization',
      'AI cover letter generation',
      '50 job applications per month',
      '5 resume versions',
      'Priority job matching',
      'Email support',
    ],
    sortOrder: 1,
  },
  {
    name: 'Elite',
    type: 'ELITE',
    description: 'Premium features with human agent support',
    priceMonthly: 99,
    priceYearly: 990,
    features: [
      'Everything in Pro',
      'Human agent support',
      'Unlimited job applications',
      'Unlimited resume versions',
      'Advanced analytics',
      'Premium templates',
      'Priority support',
    ],
    sortOrder: 2,
  },
  {
    name: 'Interview',
    type: 'INTERVIEW',
    description: 'Complete interview preparation package',
    priceMonthly: 149,
    priceYearly: 1490,
    features: [
      'Everything in Elite',
      'AI interview preparation',
      'Mock interviews with AI',
      'Dedicated career coach',
      'Company research reports',
      'Salary negotiation tips',
      'Dedicated support',
    ],
    sortOrder: 3,
  },
];

// ==================== ENTITLEMENT CONFIGURATIONS ====================
const ENTITLEMENTS: Record<PlanType, EntitlementConfig[]> = {
  FREE: [
    { featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION, featureName: 'AI Resume Optimization', type: 'boolean', value: false },
    { featureKey: FeatureKeys.AI_COVER_LETTER, featureName: 'AI Cover Letter', type: 'boolean', value: false },
    { featureKey: FeatureKeys.AI_INTERVIEW_PREP, featureName: 'AI Interview Prep', type: 'boolean', value: false },
    { featureKey: FeatureKeys.HUMAN_AGENT_SUPPORT, featureName: 'Human Agent Support', type: 'boolean', value: false },
    { featureKey: FeatureKeys.PRIORITY_JOB_MATCHING, featureName: 'Priority Job Matching', type: 'boolean', value: false },
    { featureKey: FeatureKeys.RESUME_TEMPLATES_PREMIUM, featureName: 'Premium Resume Templates', type: 'boolean', value: false },
    { featureKey: FeatureKeys.ANALYTICS_ADVANCED, featureName: 'Advanced Analytics', type: 'boolean', value: false },
    { featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH, featureName: 'Job Applications per Month', type: 'limit', value: 5 },
    { featureKey: FeatureKeys.RESUME_VERSIONS, featureName: 'Resume Versions', type: 'limit', value: 1 },
    { featureKey: FeatureKeys.AI_CREDITS_PER_MONTH, featureName: 'AI Credits per Month', type: 'limit', value: 0 },
    { featureKey: FeatureKeys.SAVED_JOBS, featureName: 'Saved Jobs', type: 'limit', value: 10 },
    { featureKey: FeatureKeys.JOB_ALERTS, featureName: 'Job Alerts', type: 'limit', value: 1 },
    { featureKey: FeatureKeys.INTERVIEW_SESSIONS_PER_MONTH, featureName: 'Interview Sessions per Month', type: 'limit', value: 0 },
    { featureKey: FeatureKeys.AGENT_TYPE, featureName: 'Agent Type', type: 'tier', value: 'ai' },
    { featureKey: FeatureKeys.SUPPORT_LEVEL, featureName: 'Support Level', type: 'tier', value: 'community' },
  ],
  PRO: [
    { featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION, featureName: 'AI Resume Optimization', type: 'boolean', value: true },
    { featureKey: FeatureKeys.AI_COVER_LETTER, featureName: 'AI Cover Letter', type: 'boolean', value: true },
    { featureKey: FeatureKeys.AI_INTERVIEW_PREP, featureName: 'AI Interview Prep', type: 'boolean', value: false },
    { featureKey: FeatureKeys.HUMAN_AGENT_SUPPORT, featureName: 'Human Agent Support', type: 'boolean', value: false },
    { featureKey: FeatureKeys.PRIORITY_JOB_MATCHING, featureName: 'Priority Job Matching', type: 'boolean', value: true },
    { featureKey: FeatureKeys.RESUME_TEMPLATES_PREMIUM, featureName: 'Premium Resume Templates', type: 'boolean', value: false },
    { featureKey: FeatureKeys.ANALYTICS_ADVANCED, featureName: 'Advanced Analytics', type: 'boolean', value: false },
    { featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH, featureName: 'Job Applications per Month', type: 'limit', value: 50 },
    { featureKey: FeatureKeys.RESUME_VERSIONS, featureName: 'Resume Versions', type: 'limit', value: 5 },
    { featureKey: FeatureKeys.AI_CREDITS_PER_MONTH, featureName: 'AI Credits per Month', type: 'limit', value: 100 },
    { featureKey: FeatureKeys.SAVED_JOBS, featureName: 'Saved Jobs', type: 'limit', value: 50 },
    { featureKey: FeatureKeys.JOB_ALERTS, featureName: 'Job Alerts', type: 'limit', value: 5 },
    { featureKey: FeatureKeys.INTERVIEW_SESSIONS_PER_MONTH, featureName: 'Interview Sessions per Month', type: 'limit', value: 5 },
    { featureKey: FeatureKeys.AGENT_TYPE, featureName: 'Agent Type', type: 'tier', value: 'ai' },
    { featureKey: FeatureKeys.SUPPORT_LEVEL, featureName: 'Support Level', type: 'tier', value: 'email' },
  ],
  ELITE: [
    { featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION, featureName: 'AI Resume Optimization', type: 'boolean', value: true },
    { featureKey: FeatureKeys.AI_COVER_LETTER, featureName: 'AI Cover Letter', type: 'boolean', value: true },
    { featureKey: FeatureKeys.AI_INTERVIEW_PREP, featureName: 'AI Interview Prep', type: 'boolean', value: true },
    { featureKey: FeatureKeys.HUMAN_AGENT_SUPPORT, featureName: 'Human Agent Support', type: 'boolean', value: true },
    { featureKey: FeatureKeys.PRIORITY_JOB_MATCHING, featureName: 'Priority Job Matching', type: 'boolean', value: true },
    { featureKey: FeatureKeys.RESUME_TEMPLATES_PREMIUM, featureName: 'Premium Resume Templates', type: 'boolean', value: true },
    { featureKey: FeatureKeys.ANALYTICS_ADVANCED, featureName: 'Advanced Analytics', type: 'boolean', value: true },
    { featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH, featureName: 'Job Applications per Month', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.RESUME_VERSIONS, featureName: 'Resume Versions', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.AI_CREDITS_PER_MONTH, featureName: 'AI Credits per Month', type: 'limit', value: 500 },
    { featureKey: FeatureKeys.SAVED_JOBS, featureName: 'Saved Jobs', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.JOB_ALERTS, featureName: 'Job Alerts', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.INTERVIEW_SESSIONS_PER_MONTH, featureName: 'Interview Sessions per Month', type: 'limit', value: 20 },
    { featureKey: FeatureKeys.AGENT_TYPE, featureName: 'Agent Type', type: 'tier', value: 'human' },
    { featureKey: FeatureKeys.SUPPORT_LEVEL, featureName: 'Support Level', type: 'tier', value: 'priority' },
  ],
  INTERVIEW: [
    { featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION, featureName: 'AI Resume Optimization', type: 'boolean', value: true },
    { featureKey: FeatureKeys.AI_COVER_LETTER, featureName: 'AI Cover Letter', type: 'boolean', value: true },
    { featureKey: FeatureKeys.AI_INTERVIEW_PREP, featureName: 'AI Interview Prep', type: 'boolean', value: true },
    { featureKey: FeatureKeys.HUMAN_AGENT_SUPPORT, featureName: 'Human Agent Support', type: 'boolean', value: true },
    { featureKey: FeatureKeys.PRIORITY_JOB_MATCHING, featureName: 'Priority Job Matching', type: 'boolean', value: true },
    { featureKey: FeatureKeys.RESUME_TEMPLATES_PREMIUM, featureName: 'Premium Resume Templates', type: 'boolean', value: true },
    { featureKey: FeatureKeys.ANALYTICS_ADVANCED, featureName: 'Advanced Analytics', type: 'boolean', value: true },
    { featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH, featureName: 'Job Applications per Month', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.RESUME_VERSIONS, featureName: 'Resume Versions', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.AI_CREDITS_PER_MONTH, featureName: 'AI Credits per Month', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.SAVED_JOBS, featureName: 'Saved Jobs', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.JOB_ALERTS, featureName: 'Job Alerts', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.INTERVIEW_SESSIONS_PER_MONTH, featureName: 'Interview Sessions per Month', type: 'limit', value: -1 },
    { featureKey: FeatureKeys.AGENT_TYPE, featureName: 'Agent Type', type: 'tier', value: 'dedicated' },
    { featureKey: FeatureKeys.SUPPORT_LEVEL, featureName: 'Support Level', type: 'tier', value: 'dedicated' },
  ],
};

async function seed() {
  console.log('🌱 Starting database seed...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const planModel = app.get<Model<SubscriptionPlan>>(
    getModelToken(SubscriptionPlan.name),
  );
  const entitlementModel = app.get<Model<PlanEntitlement>>(
    getModelToken(PlanEntitlement.name),
  );

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing plans and entitlements...');
    await planModel.deleteMany({});
    await entitlementModel.deleteMany({});

    // Seed plans
    console.log('\n📦 Seeding subscription plans...');
    const createdPlans: Record<string, any> = {};

    for (const planConfig of PLANS) {
      const plan = await planModel.create(planConfig);
      createdPlans[plan.type] = plan;
      console.log(`   ✅ Created plan: ${plan.name} (${plan.type})`);
    }

    // Seed entitlements
    console.log('\n🔐 Seeding plan entitlements...');

    for (const [planType, entitlements] of Object.entries(ENTITLEMENTS)) {
      const plan = createdPlans[planType];
      if (!plan) {
        console.log(`   ⚠️  Plan ${planType} not found, skipping entitlements`);
        continue;
      }

      for (const entitlement of entitlements) {
        await entitlementModel.create({
          planId: plan._id,
          ...entitlement,
        });
      }

      console.log(
        `   ✅ Created ${entitlements.length} entitlements for ${planType} plan`,
      );
    }

    console.log('\n✨ Database seed completed successfully!\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`   Plans: ${PLANS.length}`);
    console.log(
      `   Entitlements: ${Object.values(ENTITLEMENTS).reduce(
        (sum, e) => sum + e.length,
        0,
      )}`,
    );
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

seed();
