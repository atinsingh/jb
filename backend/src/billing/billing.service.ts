import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { User, UserDocument } from '../schemas/user.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';
import { UserSubscription, UserSubscriptionDocument } from '../schemas/user-subscription.schema';
import { UsageRecord, UsageRecordDocument } from '../schemas/usage-record.schema';
import { EmployerBillingService } from '../employer-billing/employer-billing.service';
import { CreateCheckoutSessionDto, CancelSubscriptionDto } from './dto';

// Define types locally to avoid dependency on contracts package initially
type BillingCycle = 'monthly' | 'yearly';
type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | 'paused';
type PlanType = 'FREE' | 'PRO' | 'ELITE' | 'INTERVIEW';

@Injectable()
export class BillingService {
  private stripe: Stripe;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SubscriptionPlan.name) private planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(UserSubscription.name) private subscriptionModel: Model<UserSubscriptionDocument>,
    @InjectModel(UsageRecord.name) private usageModel: Model<UsageRecordDocument>,
    private configService: ConfigService,
    private employerBilling: EmployerBillingService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    if (!stripeSecretKey) {
      this.logger.warn(
        '⚠️  STRIPE_SECRET_KEY is not set — billing is INERT. Checkout, portal, ' +
          'cancellation and webhook signature verification will all fail until ' +
          'STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) are provided via env.',
      );
    }
    if (!this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '')) {
      this.logger.warn(
        '⚠️  STRIPE_WEBHOOK_SECRET is not set — incoming Stripe webhooks cannot be ' +
          'verified and subscription state will NOT sync until it is provided.',
      );
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async getPlans(): Promise<SubscriptionPlanDocument[]> {
    return this.planModel.find({ isActive: true }).sort({ sortOrder: 1 });
  }

  async getPlanById(planId: string): Promise<SubscriptionPlanDocument> {
    const plan = await this.planModel.findById(planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async getPlanByType(type: PlanType): Promise<SubscriptionPlanDocument | null> {
    return this.planModel.findOne({ type, isActive: true });
  }

  async getUserSubscription(userId: string): Promise<UserSubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('planId');
  }

  async createOrGetStripeCustomer(user: UserDocument): Promise<string> {
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user._id.toString(),
      },
    });

    await this.userModel.findByIdAndUpdate(user._id, {
      stripeCustomerId: customer.id,
    });

    this.logger.log({ userId: user._id, customerId: customer.id }, 'Stripe customer created');

    return customer.id;
  }

  async createCheckoutSession(
    user: UserDocument,
    dto: CreateCheckoutSessionDto,
  ): Promise<{ sessionId: string; url: string }> {
    const plan = await this.getPlanById(dto.planId);

    if (plan.type === 'FREE') {
      throw new BadRequestException('Cannot checkout for free plan');
    }

    const customerId = await this.createOrGetStripeCustomer(user);

    const priceId = dto.billingCycle === 'yearly'
      ? plan.stripePriceIdYearly
      : plan.stripePriceIdMonthly;

    if (!priceId) {
      throw new BadRequestException('Plan pricing not configured');
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: dto.successUrl || `${this.frontendUrl}/billing?success=true`,
      cancel_url: dto.cancelUrl || `${this.frontendUrl}/billing?canceled=true`,
      metadata: {
        userId: user._id.toString(),
        planId: plan._id.toString(),
        planType: plan.type,
        billingCycle: dto.billingCycle,
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          planId: plan._id.toString(),
          planType: plan.type,
        },
      },
    });

    this.logger.log(
      { userId: user._id, planId: plan._id, sessionId: session.id },
      'Checkout session created',
    );

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async createBillingPortalSession(
    user: UserDocument,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    if (!user.stripeCustomerId) {
      throw new BadRequestException('No billing information found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${this.frontendUrl}/billing`,
    });

    return { url: session.url };
  }

  async cancelSubscription(
    user: UserDocument,
    dto: CancelSubscriptionDto,
  ): Promise<{ message: string }> {
    const subscription = await this.getUserSubscription(user._id.toString());

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    if (dto.cancelAtPeriodEnd) {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      subscription.cancelAtPeriodEnd = true;
      await subscription.save();

      this.logger.log(
        { userId: user._id, subscriptionId: subscription._id },
        'Subscription set to cancel at period end',
      );

      return { message: 'Subscription will be canceled at the end of the billing period' };
    } else {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      await subscription.save();

      // Downgrade to free plan
      await this.downgradeToFree(user._id.toString());

      this.logger.log(
        { userId: user._id, subscriptionId: subscription._id },
        'Subscription canceled immediately',
      );

      return { message: 'Subscription canceled' };
    }
  }

  async reactivateSubscription(user: UserDocument): Promise<{ message: string }> {
    const subscription = await this.getUserSubscription(user._id.toString());

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new BadRequestException('No subscription found');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not set to cancel');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    subscription.cancelAtPeriodEnd = false;
    await subscription.save();

    this.logger.log(
      { userId: user._id, subscriptionId: subscription._id },
      'Subscription reactivated',
    );

    return { message: 'Subscription reactivated' };
  }

  async downgradeToFree(userId: string): Promise<void> {
    const freePlan = await this.getPlanByType('FREE');
    if (!freePlan) {
      throw new InternalServerErrorException('Free plan not found');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      currentPlanType: 'FREE',
      subscriptionStatus: undefined,
      subscriptionId: undefined,
    });

    this.logger.log({ userId }, 'User downgraded to free plan');
  }

  // ==================== WEBHOOK HANDLERS ====================

  async handleStripeWebhook(
    payload: Buffer,
    signature: string,
  ): Promise<{ received: boolean }> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error({ error: err.message }, 'Webhook signature verification failed');
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook');

    // Candidate and employer subscriptions share one endpoint (one URL, one
    // signing secret to operate). Employer objects are tagged with
    // `metadata.audience = 'employer'` at checkout, so route on that before the
    // candidate handlers — which would otherwise log "missing userId" and drop
    // the event.
    if (await this.delegateEmployerEvent(event)) {
      return { received: true };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.debug({ eventType: event.type }, 'Unhandled webhook event');
    }

    return { received: true };
  }

  /**
   * Hand an employer-tagged event to EmployerBillingService.
   *
   * Returns true when the event was employer-owned and has been dealt with, so
   * the caller skips the candidate handlers. Subscription objects carry the
   * metadata directly; invoices don't, so they are matched by customer id
   * inside `recordInvoice`.
   */
  private async delegateEmployerEvent(event: Stripe.Event): Promise<boolean> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.audience !== 'employer') return false;
        await this.employerBilling.applyStripeSubscription(subscription);
        return true;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription_details?.metadata?.audience !== 'employer') {
          return false;
        }
        await this.employerBilling.recordInvoice(invoice);
        return true;
      }
      default:
        return false;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    const planType = session.metadata?.planType as PlanType;
    const billingCycle = session.metadata?.billingCycle as BillingCycle;

    if (!userId || !planId) {
      this.logger.error({ sessionId: session.id }, 'Checkout session missing metadata');
      return;
    }

    this.logger.log(
      { userId, planId, planType, sessionId: session.id },
      'Checkout session completed',
    );

    // Subscription will be created/updated by subscription webhook
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    const planId = subscription.metadata?.planId;
    const planType = subscription.metadata?.planType as PlanType;

    if (!userId) {
      this.logger.error({ subscriptionId: subscription.id }, 'Subscription missing userId');
      return;
    }

    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'active',
      canceled: 'canceled',
      past_due: 'past_due',
      incomplete: 'incomplete',
      incomplete_expired: 'incomplete_expired',
      trialing: 'trialing',
      unpaid: 'unpaid',
      paused: 'paused',
    };

    const status = statusMap[subscription.status] || 'active';

    // Find or create user subscription
    let userSubscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    const subscriptionData = {
      userId: new Types.ObjectId(userId),
      planId: planId ? new Types.ObjectId(planId) : undefined,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status,
      billingCycle: subscription.items.data[0]?.price?.recurring?.interval === 'year'
        ? 'yearly'
        : 'monthly' as BillingCycle,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    };

    if (userSubscription) {
      await this.subscriptionModel.findByIdAndUpdate(userSubscription._id, subscriptionData);
    } else {
      userSubscription = await this.subscriptionModel.create(subscriptionData);
    }

    // Update user
    await this.userModel.findByIdAndUpdate(userId, {
      currentPlanType: planType || 'FREE',
      subscriptionStatus: status,
      subscriptionId: userSubscription._id,
      stripeCustomerId: subscription.customer as string,
    });

    this.logger.log(
      { userId, subscriptionId: subscription.id, status, planType },
      'Subscription updated',
    );
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;

    if (!userId) {
      this.logger.error({ subscriptionId: subscription.id }, 'Deleted subscription missing userId');
      return;
    }

    await this.subscriptionModel.updateOne(
      { stripeSubscriptionId: subscription.id },
      {
        status: 'canceled',
        canceledAt: new Date(),
      },
    );

    await this.downgradeToFree(userId);

    this.logger.log({ userId, subscriptionId: subscription.id }, 'Subscription deleted');
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const user = await this.userModel.findOne({ stripeCustomerId: customerId });
    if (user) {
      this.logger.log({ userId: user._id, invoiceId: invoice.id }, 'Payment succeeded');

      // Reset usage for the new billing period
      const subscription = await this.getUserSubscription(user._id.toString());
      if (subscription) {
        await this.resetUsageForPeriod(
          user._id.toString(),
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd,
        );
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const user = await this.userModel.findOne({ stripeCustomerId: customerId });
    if (user) {
      this.logger.warn({ userId: user._id, invoiceId: invoice.id }, 'Payment failed');

      // Update subscription status
      await this.userModel.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'past_due',
      });
    }
  }

  // ==================== USAGE TRACKING ====================

  async recordUsage(
    userId: string,
    featureKey: string,
    count: number = 1,
  ): Promise<UsageRecordDocument> {
    const subscription = await this.getUserSubscription(userId);
    const periodStart = subscription?.currentPeriodStart || this.getMonthStart();
    const periodEnd = subscription?.currentPeriodEnd || this.getMonthEnd();

    const usage = await this.usageModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        featureKey,
        periodStart,
        periodEnd,
      },
      {
        $inc: { count },
        $set: { lastUsedAt: new Date() },
      },
      { upsert: true, new: true },
    );

    return usage;
  }

  async getUsage(userId: string, featureKey: string): Promise<number> {
    const subscription = await this.getUserSubscription(userId);
    const periodStart = subscription?.currentPeriodStart || this.getMonthStart();
    const periodEnd = subscription?.currentPeriodEnd || this.getMonthEnd();

    const usage = await this.usageModel.findOne({
      userId: new Types.ObjectId(userId),
      featureKey,
      periodStart,
      periodEnd,
    });

    return usage?.count || 0;
  }

  async resetUsageForPeriod(
    userId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    // Mark old usage records as complete (for historical tracking)
    // New period usage will be created as needed
    this.logger.log({ userId, periodStart, periodEnd }, 'Usage reset for new period');
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

