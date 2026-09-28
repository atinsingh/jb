import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { existingPaidSubscription, rejectExistingSubscription, reusableCheckout } from '../billing/stripe-checkout-guard';
import { EmployerSubscription, EmployerSubscriptionDocument } from './schemas/employer-subscription.schema';
import { UpgradeDto } from './dto/upgrade.dto';
import { EMPLOYER_PLANS, getEmployerPlan } from './employer-plans';
import {
  buildLiveStripeTiers,
  fetchConfiguredStripePrices,
  LiveStripeTier,
} from '../billing/stripe-catalog';

@Injectable()
export class EmployerBillingService {
  private readonly logger = new Logger(EmployerBillingService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(
    @InjectModel(EmployerSubscription.name)
    private subscriptionModel: Model<EmployerSubscriptionDocument>,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    if (!stripeSecretKey) {
      this.logger.warn('⚠️  STRIPE_SECRET_KEY is not set — employer checkout and the billing ' + 'portal will fail. Employers stay on the free tier, which is the safe ' + 'default: paid tiers are only ever granted by a Stripe webhook.');
    }
    this.stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async getOrCreateSubscription(ownerId: string): Promise<EmployerSubscriptionDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const renewsAt = new Date();
    renewsAt.setFullYear(renewsAt.getFullYear() + 1);

    return this.subscriptionModel.findOneAndUpdate({ ownerId: ownerObjectId }, { $setOnInsert: { ownerId: ownerObjectId, renewsAt } }, { new: true, upsert: true, setDefaultsOnInsert: true }).exec();
  }

  async getUsage(ownerId: string): Promise<{
    jobSlotsLimit: number;
    jobSlotsUsed: number;
    seatsLimit: number;
    seatsUsed: number;
    sourcingCreditsLimit: number;
    sourcingCreditsUsed: number;
  }> {
    const sub = await this.getOrCreateSubscription(ownerId);
    return {
      jobSlotsLimit: sub.jobSlotsLimit,
      jobSlotsUsed: sub.jobSlotsUsed,
      seatsLimit: sub.seatsLimit,
      seatsUsed: sub.seatsUsed,
      sourcingCreditsLimit: sub.sourcingCreditsLimit,
      sourcingCreditsUsed: sub.sourcingCreditsUsed,
    };
  }

  /**
   * Start a plan change.
   *
   * A paid tier is NEVER granted here — this used to write the plan straight to
   * the document (plus a fabricated `amount: 0, status: 'paid'` invoice), which
   * let an employer self-serve a paid tier without paying. The only path is Stripe Checkout →
   * webhook → `applyStripeSubscription`.
   *
   * Returns a `checkoutUrl` for self-serve plans; the caller must redirect.
   */
  async upgrade(
    ownerId: string,
    dto: UpgradeDto,
    email?: string,
  ): Promise<{
    checkoutUrl?: string;
    subscription: EmployerSubscriptionDocument;
    message: string;
  }> {
    const plan = getEmployerPlan(dto.plan);
    if (!plan) {
      throw new BadRequestException(`Unknown plan: ${dto.plan}`);
    }

    if (!plan.selfServe) {
      throw new BadRequestException(`The ${plan.name} plan cannot be purchased. Use the billing portal to downgrade.`);
    }

    const billingCycle = (dto.billingCycle || 'monthly') as 'monthly' | 'annual';
    const { url } = await this.createCheckoutSession(ownerId, plan.key, billingCycle, email);

    return {
      checkoutUrl: url,
      subscription: await this.getOrCreateSubscription(ownerId),
      message: 'Complete checkout to activate this plan',
    };
  }

  /**
   * Create a Stripe Checkout session for an employer plan.
   *
   * The price is resolved by lookup key rather than a hardcoded `price_...`, so
   * the same code works against the test and live accounts.
   */
  async createCheckoutSession(ownerId: string, planKey: string, billingCycle: 'monthly' | 'annual', email?: string): Promise<{ sessionId: string; url: string }> {
    const plan = getEmployerPlan(planKey);
    if (!plan?.selfServe) {
      throw new BadRequestException(`Plan ${planKey} is not purchasable`);
    }

    const sub = await this.getOrCreateSubscription(ownerId);
    const customerId = await this.resolveCustomerId(sub, email);

    if (await existingPaidSubscription(this.stripe, customerId)) rejectExistingSubscription();
    const pending = await reusableCheckout(
      this.stripe,
      customerId,
      (session) => session.metadata?.audience === 'employer' && session.metadata?.ownerId === ownerId,
      (session) => session.metadata?.plan === plan.key && session.metadata?.billingCycle === billingCycle,
    );
    if (pending) return { sessionId: pending.id, url: pending.url! };

    const livePlan = (await this.getEmployerStripeTiers()).find((tier) => tier.key === plan.key);
    const priceId = billingCycle === 'annual' ? livePlan?.stripePriceIdYearly : livePlan?.stripePriceIdMonthly;
    if (!priceId) {
      throw new NotFoundException(`No complete active Stripe price pair for ${plan.name}`);
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.frontendUrl}/employer/billing?success=true`,
      cancel_url: `${this.frontendUrl}/employer/billing?canceled=true`,
      // `audience` is what lets the shared webhook endpoint tell an employer
      // subscription apart from a candidate one.
      metadata: { audience: 'employer', ownerId, plan: plan.key, billingCycle },
      subscription_data: {
        metadata: {
          audience: 'employer',
          ownerId,
          plan: plan.key,
          billingCycle,
        },
      },
    }, { idempotencyKey: `employer:${ownerId}:${plan.key}:${billingCycle}:${Math.floor(Date.now() / 600000)}` });

    this.logger.log(`Employer checkout session ${session.id} created for ${ownerId} (${plan.key}/${billingCycle})`);
    return { sessionId: session.id, url: session.url! };
  }

  async createBillingPortalSession(ownerId: string, returnUrl?: string): Promise<{ url: string }> {
    const sub = await this.getOrCreateSubscription(ownerId);
    if (!sub.stripeCustomerId) {
      throw new BadRequestException('No billing information found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl || `${this.frontendUrl}/employer/billing`,
    });
    return { url: session.url };
  }

  /**
   * Apply a Stripe subscription to the employer record. This is the ONLY place a
   * paid tier is granted, and it is reached only from a signature-verified
   * webhook.
   */
  async applyStripeSubscription(subscription: Stripe.Subscription): Promise<void> {
    const ownerId = subscription.metadata?.ownerId;
    const planKey = subscription.metadata?.plan;
    if (!ownerId || !planKey) {
      this.logger.error(`Employer subscription ${subscription.id} is missing ownerId/plan metadata`);
      return;
    }

    const plan = getEmployerPlan(planKey);
    if (!plan) {
      this.logger.error(`Employer subscription ${subscription.id} names unknown plan ${planKey}`);
      return;
    }

    const sub = await this.getOrCreateSubscription(ownerId);
    const active = ['active', 'trialing'].includes(subscription.status);
    if (!active && sub.stripeSubscriptionId && sub.stripeSubscriptionId !== subscription.id && ['active', 'trialing'].includes(sub.status)) {
      return;
    }
    // Anything that is not currently paid falls back to free limits rather than
    // leaving a lapsed employer on a paid tier.
    const effective = active ? plan : getEmployerPlan('free')!;

    sub.plan = effective.key;
    sub.status = subscription.status;
    sub.billingCycle = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
    sub.jobSlotsLimit = effective.limits.jobSlotsLimit;
    sub.seatsLimit = effective.limits.seatsLimit;
    sub.sourcingCreditsLimit = effective.limits.sourcingCreditsLimit;
    sub.stripeSubscriptionId = subscription.id;
    sub.stripeCustomerId = String(subscription.customer);
    sub.cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
    if (subscription.current_period_end) {
      sub.renewsAt = new Date(subscription.current_period_end * 1000);
    }

    await sub.save();
    this.logger.log(`Employer ${ownerId} set to ${sub.plan} (stripe status: ${subscription.status})`);
  }

  /** Record a paid invoice against the employer, for the invoices screen. */
  async recordInvoice(invoice: Stripe.Invoice): Promise<void> {
    const customerId = String(invoice.customer);
    const sub = await this.subscriptionModel.findOne({
      stripeCustomerId: customerId,
    });
    if (!sub) return;

    sub.invoices.push({
      date: new Date((invoice.created ?? Date.now() / 1000) * 1000),
      description: invoice.lines?.data?.[0]?.description || `Invoice ${invoice.number ?? ''}`.trim(),
      // Stripe reports minor units; the UI shows dollars.
      amount: (invoice.amount_paid ?? 0) / 100,
      status: invoice.status === 'paid' ? 'paid' : (invoice.status ?? 'open'),
    });
    await sub.save();
  }

  private async getEmployerStripeTiers(): Promise<LiveStripeTier[]> {
    const prices = await fetchConfiguredStripePrices(this.stripe, 'employer');
    return buildLiveStripeTiers(prices, 'employer');
  }

  private async resolveCustomerId(sub: EmployerSubscriptionDocument, email?: string): Promise<string> {
    if (sub.stripeCustomerId) return sub.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email,
      metadata: { ownerId: sub.ownerId.toString(), audience: 'employer' },
    });
    sub.stripeCustomerId = customer.id;
    await sub.save();
    return customer.id;
  }

  /**
   * Plan catalog for the pricing/plans screen, with the caller's current plan
   * flagged. `selfServe` tells the UI which cards get a "Choose plan" button and
   * which get "Contact sales".
   */
  async getPlans(ownerId: string): Promise<{
    currentPlan: string;
    billingCycle: string;
    plans: Array<{
      key: string;
      name: string;
      tagline: string;
      priceMonthly: number;
      priceYearly: number;
      currency: string;
      stripePriceIdMonthly?: string;
      stripePriceIdYearly?: string;
      stripeProductIdMonthly?: string;
      stripeProductIdYearly?: string;
      current: boolean;
      popular: boolean;
      selfServe: boolean;
      levers: Array<[string, string]>;
    }>;
  }> {
    const [sub, plans] = await Promise.all([this.getOrCreateSubscription(ownerId), this.getPlansCatalog()]);
    return {
      currentPlan: sub.plan,
      billingCycle: sub.billingCycle,
      plans: plans.map((plan) => ({ ...plan, current: sub.plan === plan.key })),
    };
  }

  async getPlansCatalog(): Promise<
    Array<{
      key: string;
      name: string;
      tagline: string;
      priceMonthly: number;
      priceYearly: number;
      currency: string;
      stripePriceIdMonthly?: string;
      stripePriceIdYearly?: string;
      stripeProductIdMonthly?: string;
      stripeProductIdYearly?: string;
      current: boolean;
      popular: boolean;
      selfServe: boolean;
      levers: Array<[string, string]>;
    }>
  > {
    const stripeTiers = await this.getEmployerStripeTiers();
    const tiersByKey = new Map(stripeTiers.map((tier) => [tier.key, tier]));
    return EMPLOYER_PLANS.flatMap(({ limits, ...plan }) => {
      const live = tiersByKey.get(plan.key);
      if (plan.key !== 'free' && !live) return [];
      const stripeFields = live ?? {
        priceMonthly: 0,
        priceYearly: 0,
        currency: stripeTiers[0]?.currency ?? 'cad',
      };
      return [
        {
          ...plan,
          ...stripeFields,
          name: live?.name ?? plan.name,
          current: false,
          levers: [
            ['Job slots', String(limits.jobSlotsLimit)],
            ['Team seats', String(limits.seatsLimit)],
            ['AI credits / mo', String(limits.aiBudgetCreditsLimit)],
            ['Sourcing credits', String(limits.sourcingCreditsLimit)],
          ] as Array<[string, string]>,
        },
      ];
    });
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
