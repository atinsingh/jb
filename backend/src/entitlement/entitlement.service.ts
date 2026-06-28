import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import {
  PlanEntitlement,
  PlanEntitlementDocument,
} from '../schemas/plan-entitlement.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from '../schemas/subscription-plan.schema';
import { UsageRecord, UsageRecordDocument } from '../schemas/usage-record.schema';
import { UserSubscription, UserSubscriptionDocument } from '../schemas/user-subscription.schema';

// Define types locally
type PlanType = 'FREE' | 'PRO' | 'ELITE' | 'INTERVIEW';

export interface EntitlementCheckOptions {
  featureKey: string;
  requiredValue?: boolean | number | string;
  incrementUsage?: boolean;
}

export interface EntitlementCheckResponse {
  allowed: boolean;
  currentValue?: boolean | number | string;
  limit?: number;
  usage?: number;
  remaining?: number;
  message?: string;
}

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PlanEntitlement.name)
    private entitlementModel: Model<PlanEntitlementDocument>,
    @InjectModel(SubscriptionPlan.name)
    private planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(UsageRecord.name) private usageModel: Model<UsageRecordDocument>,
    @InjectModel(UserSubscription.name)
    private subscriptionModel: Model<UserSubscriptionDocument>,
  ) {}

  async checkEntitlement(
    userId: string,
    options: EntitlementCheckOptions,
  ): Promise<EntitlementCheckResponse> {
    const { featureKey, requiredValue, incrementUsage } = options;

    // Get user with plan info
    const user = await this.userModel.findById(userId);
    if (!user) {
      return {
        allowed: false,
        message: 'User not found',
      };
    }

    // Get the plan - default to FREE if not set
    const planType = user.currentPlanType || 'FREE';
    let plan = await this.planModel.findOne({
      type: planType,
      isActive: true,
    });

    // If plan not found, try to create a default FREE plan
    if (!plan && planType === 'FREE') {
      this.logger.warn(`FREE plan not found, creating default plan`);
      try {
        plan = await this.planModel.create({
          name: 'Free',
          type: 'FREE',
          description: 'Get started with basic job search features',
          priceMonthly: 0,
          priceYearly: 0,
          isActive: true,
        });
        this.logger.log('Created default FREE plan');
      } catch (error) {
        this.logger.error('Failed to create default FREE plan:', error);
      }
    }

    if (!plan) {
      this.logger.error(`Plan not found for type: ${planType}`);
      return {
        allowed: false,
        message: `Plan not found. Please contact support.`,
      };
    }

    // Get the entitlement for this feature
    let entitlement = await this.entitlementModel.findOne({
      planId: plan._id,
      featureKey,
    });

    // If entitlement doesn't exist and it's the FREE plan, create a default (deny) entitlement
    if (!entitlement && plan.type === 'FREE') {
      this.logger.warn(`Entitlement "${featureKey}" not found for FREE plan, creating default (denied)`);
      try {
        // Default to denied for FREE plan if not specified
        const defaultValue = featureKey.includes('per_month') || featureKey.includes('per_month') ? 0 : false;
        entitlement = await this.entitlementModel.create({
          planId: plan._id,
          featureKey,
          featureName: featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: typeof defaultValue === 'number' ? 'limit' : 'boolean',
          value: defaultValue,
        });
        this.logger.log(`Created default entitlement for ${featureKey}`);
      } catch (error) {
        this.logger.error(`Failed to create default entitlement for ${featureKey}:`, error);
      }
    }

    if (!entitlement) {
      // Feature not defined for this plan - deny by default
      return {
        allowed: false,
        message: `Feature "${featureKey}" not available on ${plan.name} plan`,
      };
    }

    // Check based on entitlement type
    switch (entitlement.type) {
      case 'boolean':
        return this.checkBooleanEntitlement(entitlement, plan.name);

      case 'limit':
        return this.checkLimitEntitlement(
          user,
          entitlement,
          plan.name,
          requiredValue as number,
          incrementUsage,
        );

      case 'tier':
        return this.checkTierEntitlement(
          entitlement,
          plan.name,
          requiredValue as string,
        );

      default:
        return {
          allowed: false,
          message: 'Unknown entitlement type',
        };
    }
  }

  private checkBooleanEntitlement(
    entitlement: PlanEntitlementDocument,
    planName: string,
  ): EntitlementCheckResponse {
    const allowed = entitlement.value === true;
    return {
      allowed,
      currentValue: entitlement.value,
      message: allowed
        ? undefined
        : `Feature "${entitlement.featureName}" requires upgrade from ${planName} plan`,
    };
  }

  private async checkLimitEntitlement(
    user: UserDocument,
    entitlement: PlanEntitlementDocument,
    planName: string,
    requiredCount: number = 1,
    incrementUsage: boolean = false,
  ): Promise<EntitlementCheckResponse> {
    const limit = entitlement.value as number;

    // -1 means unlimited
    if (limit === -1) {
      if (incrementUsage) {
        await this.incrementUsage(user._id.toString(), entitlement.featureKey);
      }
      return {
        allowed: true,
        limit,
        message: 'Unlimited',
      };
    }

    // Get current usage
    const subscription = await this.subscriptionModel.findOne({
      userId: user._id,
    });
    const periodStart = subscription?.currentPeriodStart || this.getMonthStart();
    const periodEnd = subscription?.currentPeriodEnd || this.getMonthEnd();

    const usageRecord = await this.usageModel.findOne({
      userId: user._id,
      featureKey: entitlement.featureKey,
      periodStart,
      periodEnd,
    });

    const currentUsage = usageRecord?.count || 0;
    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage + requiredCount <= limit;

    if (allowed && incrementUsage) {
      await this.incrementUsage(
        user._id.toString(),
        entitlement.featureKey,
        requiredCount,
        periodStart,
        periodEnd,
      );
    }

    return {
      allowed,
      limit,
      usage: currentUsage,
      remaining,
      currentValue: currentUsage,
      message: allowed
        ? undefined
        : `Limit reached for "${entitlement.featureName}" on ${planName} plan (${currentUsage}/${limit})`,
    };
  }

  private checkTierEntitlement(
    entitlement: PlanEntitlementDocument,
    planName: string,
    requiredTier?: string,
  ): EntitlementCheckResponse {
    const currentTier = entitlement.value as string;

    // If no required tier specified, just check if feature exists
    if (!requiredTier) {
      return {
        allowed: true,
        currentValue: currentTier,
      };
    }

    // Define tier hierarchy
    const tierHierarchy: Record<string, number> = {
      ai: 1,
      human: 2,
      dedicated: 3,
      community: 1,
      email: 2,
      priority: 3,
    };

    const currentLevel = tierHierarchy[currentTier.toLowerCase()] || 0;
    const requiredLevel = tierHierarchy[requiredTier.toLowerCase()] || 0;

    const allowed = currentLevel >= requiredLevel;

    return {
      allowed,
      currentValue: currentTier,
      message: allowed
        ? undefined
        : `Feature requires "${requiredTier}" tier or higher (current: ${currentTier})`,
    };
  }

  async incrementUsage(
    userId: string,
    featureKey: string,
    count: number = 1,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<void> {
    const start = periodStart || this.getMonthStart();
    const end = periodEnd || this.getMonthEnd();

    await this.usageModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        featureKey,
        periodStart: start,
        periodEnd: end,
      },
      {
        $inc: { count },
        $set: { lastUsedAt: new Date() },
      },
      { upsert: true },
    );

    this.logger.debug(`Usage incremented for user ${userId}, feature ${featureKey}`);
  }

  async getEntitlementsForUser(userId: string): Promise<PlanEntitlementDocument[]> {
    const user = await this.userModel.findById(userId);
    if (!user) return [];

    const plan = await this.planModel.findOne({
      type: user.currentPlanType || 'FREE',
      isActive: true,
    });

    if (!plan) return [];

    return this.entitlementModel.find({ planId: plan._id });
  }

  async getEntitlementsForPlan(planType: PlanType): Promise<PlanEntitlementDocument[]> {
    const plan = await this.planModel.findOne({ type: planType, isActive: true });
    if (!plan) return [];

    return this.entitlementModel.find({ planId: plan._id });
  }

  private getMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private getMonthEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
}
