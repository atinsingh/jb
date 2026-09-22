import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../app.module';
import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from '../schemas/subscription-plan.schema';
import {
  PlanEntitlement,
  PlanEntitlementDocument,
} from '../schemas/plan-entitlement.schema';
import { AiBudgetPolicyService } from '../ai-budget/ai-budget-policy.service';
import { reconcileCandidatePlans } from '../billing/candidate-plan-catalog';

async function seed() {
  console.log('🌱 Starting database seed...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const planModel = app.get<Model<SubscriptionPlanDocument>>(
    getModelToken(SubscriptionPlan.name),
  );
  const entitlementModel = app.get<Model<PlanEntitlementDocument>>(
    getModelToken(PlanEntitlement.name),
  );
  const aiBudgetPolicy = app.get(AiBudgetPolicyService);

  try {
    console.log('📦 Reconciling candidate plans and entitlements...');
    await reconcileCandidatePlans(
      planModel,
      entitlementModel,
      aiBudgetPolicy.stripePaid(),
    );

    console.log('\n✨ Database seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

seed();
