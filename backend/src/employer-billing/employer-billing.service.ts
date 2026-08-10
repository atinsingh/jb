import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import {
  EmployerSubscription,
  EmployerSubscriptionDocument,
} from './schemas/employer-subscription.schema';
import { UpgradeDto } from './dto/upgrade.dto';
import {
  EMPLOYER_PLANS,
  employerPriceLookupKey,
  getEmployerPlan,
} from './employer-plans';

@Injectable()
export class EmployerBillingService {
  private readonly logger = new Logger(EmployerBillingService.name);
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;
  /** lookup key → price id. Prices are immutable in Stripe, so this never goes stale. */
  private readonly priceIdCache = new Map<string, string>();

  constructor(
    @InjectModel(EmployerSubscription.name)
    private subscriptionModel: Model<EmployerSubscriptionDocument>,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>(
      'STRIPE_SECRET_KEY',
      '',
    );
    if (!stripeSecretKey) {
      this.logger.warn(
        '⚠️  STRIPE_SECRET_KEY is not set — employer checkout and the billing ' +
          'portal will fail. Employers stay on the free tier, which is the safe ' +
          'default: paid tiers are only ever granted by a Stripe webhook.',
      );
    }
    this.stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

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

  /**
   * Start a plan change.
   *
   * A paid tier is NEVER granted here — this used to write the plan straight to
   * the document (plus a fabricated `amount: 0, status: 'paid'` invoice), which
   * let any employer self-serve themselves the enterprise tier and its 10,000 AI
   * actions for free. The only path to a paid plan is now Stripe Checkout →
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
      throw new BadRequestException(
        plan.key === 'enterprise'
          ? 'The Enterprise plan is sales-led — contact sales to be provisioned.'
          : `The ${plan.name} plan cannot be purchased. Use the billing portal to downgrade.`,
      );
    }

    const billingCycle = (dto.billingCycle || 'monthly') as 'monthly' | 'annual';
    const { url } = await this.createCheckoutSession(
      ownerId,
      plan.key,
      billingCycle,
      email,
    );

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
  async createCheckoutSession(
    ownerId: string,
    planKey: string,
    billingCycle: 'monthly' | 'annual',
    email?: string,
  ): Promise<{ sessionId: string; url: string }> {
    const plan = getEmployerPlan(planKey);
    if (!plan?.selfServe) {
      throw new BadRequestException(`Plan ${planKey} is not purchasable`);
    }

    const priceId = await this.resolvePriceId(
      employerPriceLookupKey(plan.key, billingCycle),
    );
    const sub = await this.getOrCreateSubscription(ownerId);
    const customerId = await this.resolveCustomerId(sub, email);

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
    });

    this.logger.log(
      `Employer checkout session ${session.id} created for ${ownerId} (${plan.key}/${billingCycle})`,
    );
    return { sessionId: session.id, url: session.url! };
  }

  async createBillingPortalSession(
    ownerId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
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
  async applyStripeSubscription(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const ownerId = subscription.metadata?.ownerId;
    const planKey = subscription.metadata?.plan;
    if (!ownerId || !planKey) {
      this.logger.error(
        `Employer subscription ${subscription.id} is missing ownerId/plan metadata`,
      );
      return;
    }

    const plan = getEmployerPlan(planKey);
    if (!plan) {
      this.logger.error(`Employer subscription ${subscription.id} names unknown plan ${planKey}`);
      return;
    }

    const sub = await this.getOrCreateSubscription(ownerId);
    const active = ['active', 'trialing'].includes(subscription.status);
    // Anything that is not currently paid falls back to free limits rather than
    // leaving a lapsed employer on a paid tier.
    const effective = active ? plan : getEmployerPlan('free')!;

    sub.plan = effective.key;
    sub.status = subscription.status;
    sub.billingCycle =
      subscription.items.data[0]?.price?.recurring?.interval === 'year'
        ? 'annual'
        : 'monthly';
    sub.jobSlotsLimit = effective.limits.jobSlotsLimit;
    sub.seatsLimit = effective.limits.seatsLimit;
    sub.aiActionsLimit = effective.limits.aiActionsLimit;
    sub.sourcingCreditsLimit = effective.limits.sourcingCreditsLimit;
    sub.stripeSubscriptionId = subscription.id;
    sub.stripeCustomerId = String(subscription.customer);
    sub.cancelAtPeriodEnd = !!subscription.cancel_at_period_end;
    if (subscription.current_period_end) {
      sub.renewsAt = new Date(subscription.current_period_end * 1000);
    }

    await sub.save();
    this.logger.log(
      `Employer ${ownerId} set to ${sub.plan} (stripe status: ${subscription.status})`,
    );
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
      description:
        invoice.lines?.data?.[0]?.description || `Invoice ${invoice.number ?? ''}`.trim(),
      // Stripe reports minor units; the UI shows dollars.
      amount: (invoice.amount_paid ?? 0) / 100,
      status: invoice.status === 'paid' ? 'paid' : (invoice.status ?? 'open'),
    });
    await sub.save();
  }

  private async resolvePriceId(lookupKey: string): Promise<string> {
    const cached = this.priceIdCache.get(lookupKey);
    if (cached) return cached;

    const prices = await this.stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (!price) {
      throw new NotFoundException(
        `No active Stripe price with lookup key "${lookupKey}". Run: npm run stripe:sync -- --apply`,
      );
    }

    this.priceIdCache.set(lookupKey, price.id);
    return price.id;
  }

  private async resolveCustomerId(
    sub: EmployerSubscriptionDocument,
    email?: string,
  ): Promise<string> {
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
      monthly: number;
      annual: number;
      current: boolean;
      popular: boolean;
      selfServe: boolean;
      levers: Array<[string, string]>;
    }>;
  }> {
    const sub = await this.getOrCreateSubscription(ownerId);
    return {
      currentPlan: sub.plan,
      billingCycle: sub.billingCycle,
      plans: EMPLOYER_PLANS.map(({ limits, ...p }) => ({
        ...p,
        current: sub.plan === p.key,
        levers: [
          ['Job slots', String(limits.jobSlotsLimit)],
          ['Team seats', String(limits.seatsLimit)],
          ['AI actions / mo', String(limits.aiActionsLimit)],
          ['Sourcing credits', String(limits.sourcingCreditsLimit)],
        ] as Array<[string, string]>,
      })),
    };
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
