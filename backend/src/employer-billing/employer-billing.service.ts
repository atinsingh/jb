import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BillingService } from '../billing/billing.service';
import { EmployerSubscription, EmployerSubscriptionDocument } from './schemas/employer-subscription.schema';
import { getEmployerPlan } from './employer-plans';
import { UpgradeDto } from './dto/upgrade.dto';

/** Employer limits and usage, backed by the account's shared Paid membership. */
@Injectable()
export class EmployerBillingService {
  private readonly frontendUrl: string;
  constructor(
    @InjectModel(EmployerSubscription.name) private subscriptionModel: Model<EmployerSubscriptionDocument>,
    config: ConfigService,
    private readonly billing: BillingService,
  ) { this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000'); }

  async getOrCreateSubscription(ownerId: string) {
    const user = await this.billing.getAccount(ownerId);
    const { subscription, currentPlan } = await this.billing.getReconciledSubscription(user);
    const plan = getEmployerPlan(currentPlan === 'PRO' ? 'paid' : 'free')!;
    const usage = await this.subscriptionModel.findOneAndUpdate(
      { ownerId: new Types.ObjectId(ownerId) }, { $setOnInsert: { ownerId: new Types.ObjectId(ownerId) } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    return {
      ownerId, plan: plan.key, billingCycle: subscription?.billingCycle === 'yearly' ? 'annual' : 'monthly',
      ...plan.limits, jobSlotsUsed: usage.jobSlotsUsed, seatsUsed: usage.seatsUsed, sourcingCreditsUsed: usage.sourcingCreditsUsed,
      stripeCustomerId: user.stripeCustomerId, stripeSubscriptionId: subscription?.stripeSubscriptionId,
      status: subscription?.status || 'active', cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      renewsAt: subscription?.currentPeriodEnd,
    };
  }

  async getUsage(ownerId: string) {
    const sub = await this.getOrCreateSubscription(ownerId);
    return { jobSlotsLimit: sub.jobSlotsLimit, jobSlotsUsed: sub.jobSlotsUsed, seatsLimit: sub.seatsLimit,
      seatsUsed: sub.seatsUsed, sourcingCreditsLimit: sub.sourcingCreditsLimit, sourcingCreditsUsed: sub.sourcingCreditsUsed };
  }

  async createCheckoutSession(ownerId: string, planKey: string, billingCycle: 'monthly' | 'annual') {
    const plan = getEmployerPlan(planKey);
    if (!plan) throw new BadRequestException('Unknown plan: ' + planKey);
    if (!plan.selfServe) throw new BadRequestException('The Free plan cannot be purchased. Use the billing portal to downgrade.');
    const user = await this.billing.getAccount(ownerId);
    const paid = await this.billing.getPlanByType('PRO');
    if (!paid) throw new NotFoundException('Paid plan is not configured');
    return this.billing.createCheckoutSession(user, {
      planId: paid._id.toString(), billingCycle: billingCycle === 'annual' ? 'yearly' : 'monthly',
    });
  }

  async upgrade(ownerId: string, dto: UpgradeDto, _email?: string) {
    const result = await this.createCheckoutSession(ownerId, dto.plan, dto.billingCycle === 'annual' ? 'annual' : 'monthly');
    return { checkoutUrl: result.url, subscription: await this.getOrCreateSubscription(ownerId), message: 'Complete checkout to activate Paid in both workspaces' };
  }

  async createBillingPortalSession(ownerId: string, returnUrl?: string) {
    return this.billing.createBillingPortalSession(await this.billing.getAccount(ownerId), returnUrl || this.frontendUrl + '/employer/settings');
  }

  async getPlans(ownerId: string) {
    const [sub, plans] = await Promise.all([this.getOrCreateSubscription(ownerId), this.getPlansCatalog()]);
    return { currentPlan: sub.plan, billingCycle: sub.billingCycle, plans: plans.map(plan => ({ ...plan, current: sub.plan === plan.key })) };
  }
  getPlansCatalog() { return this.billing.getEmployerPlansCatalog(); }
  getInvoices(ownerId: string) { return this.billing.getUserInvoices(ownerId); }
}
