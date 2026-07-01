import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerSubscription,
  EmployerSubscriptionDocument,
} from './schemas/employer-subscription.schema';
import { UpgradeDto } from './dto/upgrade.dto';

const PLAN_LIMITS: Record<
  string,
  {
    jobSlotsLimit: number;
    seatsLimit: number;
    aiActionsLimit: number;
    sourcingCreditsLimit: number;
  }
> = {
  starter: { jobSlotsLimit: 3, seatsLimit: 3, aiActionsLimit: 200, sourcingCreditsLimit: 50 },
  growth: { jobSlotsLimit: 5, seatsLimit: 6, aiActionsLimit: 500, sourcingCreditsLimit: 100 },
  scale: { jobSlotsLimit: 15, seatsLimit: 15, aiActionsLimit: 2000, sourcingCreditsLimit: 500 },
  enterprise: {
    jobSlotsLimit: 100,
    seatsLimit: 100,
    aiActionsLimit: 10000,
    sourcingCreditsLimit: 5000,
  },
};

@Injectable()
export class EmployerBillingService {
  constructor(
    @InjectModel(EmployerSubscription.name)
    private subscriptionModel: Model<EmployerSubscriptionDocument>,
  ) {}

  async getOrCreateSubscription(ownerId: string): Promise<EmployerSubscriptionDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const renewsAt = new Date();
    renewsAt.setFullYear(renewsAt.getFullYear() + 1);

    return this.subscriptionModel
      .findOneAndUpdate(
        { ownerId: ownerObjectId },
        { $setOnInsert: { ownerId: ownerObjectId, renewsAt } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async getUsage(ownerId: string): Promise<{
    jobSlotsLimit: number;
    jobSlotsUsed: number;
    seatsLimit: number;
    seatsUsed: number;
    aiActionsLimit: number;
    aiActionsUsed: number;
    sourcingCreditsLimit: number;
    sourcingCreditsUsed: number;
  }> {
    const sub = await this.getOrCreateSubscription(ownerId);
    return {
      jobSlotsLimit: sub.jobSlotsLimit,
      jobSlotsUsed: sub.jobSlotsUsed,
      seatsLimit: sub.seatsLimit,
      seatsUsed: sub.seatsUsed,
      aiActionsLimit: sub.aiActionsLimit,
      aiActionsUsed: sub.aiActionsUsed,
      sourcingCreditsLimit: sub.sourcingCreditsLimit,
      sourcingCreditsUsed: sub.sourcingCreditsUsed,
    };
  }

  async upgrade(ownerId: string, dto: UpgradeDto): Promise<EmployerSubscriptionDocument> {
    const sub = await this.getOrCreateSubscription(ownerId);

    const limits = PLAN_LIMITS[dto.plan] || PLAN_LIMITS.growth;
    sub.plan = dto.plan;
    if (dto.billingCycle) {
      sub.billingCycle = dto.billingCycle;
    }
    sub.jobSlotsLimit = limits.jobSlotsLimit;
    sub.seatsLimit = limits.seatsLimit;
    sub.aiActionsLimit = limits.aiActionsLimit;
    sub.sourcingCreditsLimit = limits.sourcingCreditsLimit;

    sub.invoices.push({
      date: new Date(),
      description: `Upgraded to ${dto.plan} (${sub.billingCycle})`,
      amount: 0,
      status: 'paid',
    });

    return sub.save();
  }

  async getInvoices(ownerId: string): Promise<
    Array<{
      date: Date;
      description: string;
      amount: number;
      status: string;
    }>
  > {
    const sub = await this.getOrCreateSubscription(ownerId);
    return sub.invoices;
  }
}
