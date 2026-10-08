import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BillingService } from './billing.service';
import { AiBudgetService } from '../ai-budget/ai-budget.service';
import { AiBudgetPolicyService } from '../ai-budget/ai-budget-policy.service';
import { EmployerBillingService } from '../employer-billing/employer-billing.service';

// Real billing services, with only MongoDB and Stripe replaced at their boundaries.
describe('one membership across candidate and employer workspaces', () => {
  const userId = '507f1f77bcf86cd799439011';
  const planId = '507f1f77bcf86cd799439012';
  let candidate: BillingService;
  let employer: EmployerBillingService;
  let user: any;
  let membership: any;
  let stripe: any;
  let subscriptions: any[];
  let sessions: any[];
  let event: any;
  const pro = { _id: new Types.ObjectId(planId), type: 'PRO', isActive: true, name: 'Paid' };
  const free = { _id: new Types.ObjectId('507f1f77bcf86cd799439013'), type: 'FREE', isActive: true, name: 'Free' };
  const query = (value: any) => Object.assign(Promise.resolve(value), { populate: () => Promise.resolve(value), exec: async () => value });

  beforeEach(async () => {
    user = { _id: new Types.ObjectId(userId), email: 'shared@example.com', name: 'Shared Account', currentPlanType: 'FREE' };
    membership = null; subscriptions = []; sessions = [];
    stripe = {
      customers: {
        retrieve: jest.fn(async (id: string) => ({ id })),
        create: jest.fn(async () => ({ id: 'cus_shared' })),
      },
      subscriptions: { list: jest.fn(async ({ customer }: any) => ({ data: subscriptions.filter(sub => sub.customer === customer), has_more: false })) },
      checkout: { sessions: {
        list: jest.fn(async ({ customer }: any) => ({ data: sessions.filter(session => session.customer === customer), has_more: false })),
        create: jest.fn(async (options: any) => {
          const session = { id: 'cs_shared', url: 'https://checkout.stripe.com/shared', status: 'open', mode: 'subscription', ...options };
          sessions.push(session); return session;
        }),
      } },
      billingPortal: { sessions: { create: jest.fn(async () => ({ url: 'https://billing.stripe.com/shared' })) } },
      webhooks: { constructEvent: jest.fn(() => event) },
    };
    const meters = { ownerId: userId, plan: 'free', billingCycle: 'monthly', status: 'active', jobSlotsLimit: 1, seatsLimit: 1, sourcingCreditsLimit: 10, jobSlotsUsed: 0, seatsUsed: 1, sourcingCreditsUsed: 0, save: jest.fn(), invoices: [] };
    const module = await Test.createTestingModule({ providers: [
      BillingService, EmployerBillingService,
      { provide: ConfigService, useValue: { get: (key: string, fallback: any) => ({ STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_WEBHOOK_SECRET: 'whsec_test_mock', FRONTEND_URL: 'http://localhost:3000' })[key] || fallback } },
      { provide: getModelToken('User'), useValue: { findById: jest.fn(async () => user),
        findOneAndUpdate: jest.fn(async (_filter: any, update: any) => {
          if (user.checkoutLockUntil && user.checkoutLockUntil > new Date()) return null;
          Object.assign(user, update.$set); return user;
        }),
        updateOne: jest.fn(async (filter: any, update: any) => {
          if (user.checkoutLockUntil?.getTime() === filter.checkoutLockUntil?.getTime()) delete user.checkoutLockUntil;
        }),
        findByIdAndUpdate: jest.fn(async (_id: any, update: any) => {
          for (const key of Object.keys(update.$unset || {})) delete user[key];
          return Object.assign(user, update.$set || (update.$unset ? {} : update));
        }), } },
      { provide: getModelToken('SubscriptionPlan'), useValue: { findById: jest.fn(async () => pro), findOne: jest.fn(async ({ type }: any) => type === 'PRO' ? pro : free) } },
      { provide: getModelToken('UserSubscription'), useValue: {
        findOne: jest.fn(() => query(membership)), create: jest.fn(async (value: any) => membership = { _id: 'membership', ...value }),
        findByIdAndUpdate: jest.fn(async (_id: any, value: any) => Object.assign(membership, value)),
        updateOne: jest.fn(async (_filter: any, value: any) => { if (membership) Object.assign(membership, value); }),
      } },
      { provide: getModelToken('UsageRecord'), useValue: {} },
      { provide: getModelToken('EmployerSubscription'), useValue: { findOneAndUpdate: jest.fn(() => ({ exec: async () => meters })), findOne: jest.fn(async () => meters) } },
    ] }).compile();
    candidate = module.get(BillingService); employer = module.get(EmployerBillingService);
    (candidate as any).stripe = stripe; (employer as any).stripe = stripe;
    const paidTier = [{ key: 'paid', name: 'Paid', priceMonthly: 10, priceYearly: 100, currency: 'usd', stripePriceIdMonthly: 'price_monthly', stripePriceIdYearly: 'price_yearly' }];
    jest.spyOn(candidate as any, 'getCandidateStripeTiers').mockResolvedValue(paidTier);
    if ((employer as any).getEmployerStripeTiers) jest.spyOn(employer as any, 'getEmployerStripeTiers').mockResolvedValue(paidTier);
  });

  const checkout = (origin: string) => origin === 'candidate'
    ? candidate.createCheckoutSession(user, { planId, billingCycle: 'monthly' })
    : employer.createCheckoutSession(userId, 'paid', 'monthly');
  const publish = async (status = 'active', type = 'customer.subscription.updated') => {
    const paid = { id: 'sub_shared', customer: 'cus_shared', status, metadata: sessions[0].subscription_data.metadata,
      items: { data: [{ price: { product: process.env.STRIPE_CANDIDATE_PAID_MONTHLY_PRODUCT_ID, recurring: { interval: 'month' } } }] },
      current_period_start: 1790812800, current_period_end: 1793491200, cancel_at_period_end: false };
    subscriptions = status === 'canceled' ? [] : [paid];
    event = { type, data: { object: paid } };
    await candidate.handleStripeWebhook(Buffer.from('verified fixture'), 'test-signature');
  };

  it.each(['candidate', 'employer'])('reuses one customer and pending checkout when opened from %s first', async origin => {
    await checkout(origin); await checkout(origin === 'candidate' ? 'employer' : 'candidate');
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    expect(sessions[0].subscription_data.metadata).toMatchObject({ userId, planId, planType: 'PRO' });
    expect(user.stripeCustomerId).toBe('cus_shared');
  });

  it.each(['candidate', 'employer'])('activates both views from a %s purchase, prevents another purchase, and shares cancellation', async origin => {
    await checkout(origin); await publish();
    expect((await candidate.getReconciledSubscription(user)).currentPlan).toBe('PRO');
    expect(await employer.getOrCreateSubscription(userId)).toMatchObject({ plan: 'paid', stripeCustomerId: 'cus_shared', stripeSubscriptionId: 'sub_shared', jobSlotsLimit: 3 });
    await expect(checkout('candidate')).rejects.toThrow(/already has a subscription/i);
    await expect(checkout('employer')).rejects.toThrow(/already has a subscription/i);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    await candidate.createBillingPortalSession(user);
    expect(stripe.billingPortal.sessions.create).toHaveBeenLastCalledWith(expect.objectContaining({ customer: 'cus_shared', return_url: 'http://localhost:3000/app/billing' }));
    await employer.createBillingPortalSession(userId);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_shared', return_url: 'http://localhost:3000/employer/settings' }));
    await publish('canceled', 'customer.subscription.deleted');
    expect((await candidate.getReconciledSubscription(user)).currentPlan).toBe('FREE');
    expect(await employer.getOrCreateSubscription(userId)).toMatchObject({ plan: 'free', jobSlotsLimit: 1 });
  });

  it('keeps both workspaces Paid until a scheduled cancellation ends', async () => {
    await checkout('candidate'); await publish();
    subscriptions[0].cancel_at_period_end = true;
    await candidate.handleStripeWebhook(Buffer.from('verified fixture'), 'test-signature');
    expect(await candidate.getReconciledSubscription(user)).toMatchObject({ currentPlan: 'PRO', subscription: { cancelAtPeriodEnd: true } });
    expect(await employer.getOrCreateSubscription(userId)).toMatchObject({ plan: 'paid', cancelAtPeriodEnd: true, renewsAt: membership.currentPeriodEnd });
    await publish('canceled', 'customer.subscription.deleted');
    expect((await candidate.getReconciledSubscription(user)).currentPlan).toBe('FREE');
    expect((await employer.getOrCreateSubscription(userId)).plan).toBe('free');
  });

  it('grants 400 credits to each pool after one purchase and keeps their usage separate', async () => {
    const accounts = new Map<string, any>();
    const limits = new Map<string, number>();
    const used = new Map<string, number>();
    const model = {
      findOne: (filter: any) => ({ select: () => ({ exec: async () => accounts.get(filter.ownerType + ':' + filter.ownerId) || null }) }),
      create: async (value: any) => { const account = { _id: value.keyAlias, ...value }; accounts.set(value.keyAlias, account); return account; },
      updateOne: (filter: any, update: any) => ({ exec: async () => Object.assign(accounts.get(filter._id), update.$set) }),
    };
    const telemetry = {
      generate: async (options: any) => { limits.set(options.keyAlias, options.maxBudgetUsd); return { key: options.keyAlias, keyId: options.keyAlias }; },
      update: async (key: string, options: any) => { limits.set(key, options.maxBudgetUsd); },
      info: async (key: string) => ({ limitUsd: limits.get(key), spendUsd: (used.get(key) || 0) / 100, resetAt: new Date('2026-11-01T00:00:00.000Z') }),
      usage: async (key: string) => ({ spendUsd: (used.get(key) || 0) / 100, credits: used.get(key) || 0 }),
    };
    const aliases = { tierFor: (id: string) => candidate.reconcileCandidateTier(id), listForTier: async () => [{ alias: 'bedrock/nova-2-lite/low' }] };
    const budget = new AiBudgetService(model as any, new AiBudgetPolicyService(), telemetry as any, { encrypt: (key: string) => key, decrypt: (key: string) => key } as any, aliases as any, employer);
    expect(await budget.statusCandidate(userId)).toMatchObject({ limit: 50, remaining: 50 });
    expect(await budget.statusOwner('employer', userId)).toMatchObject({ limit: 100, remaining: 100 });
    used.set('candidate:' + userId, 7); used.set('employer:' + userId, 5);
    await checkout('employer'); await publish();
    expect(await budget.statusCandidate(userId)).toMatchObject({ limit: 400, spent: 7, remaining: 393 });
    expect(await budget.statusOwner('employer', userId)).toMatchObject({ limit: 400, spent: 5, remaining: 395 });
    expect(accounts.size).toBe(2);
    await publish('canceled', 'customer.subscription.deleted');
    expect(await budget.statusCandidate(userId)).toMatchObject({ limit: 50, spent: 7, remaining: 43 });
    expect(await budget.statusOwner('employer', userId)).toMatchObject({ limit: 100, spent: 5, remaining: 95 });
  });

  it('allows only one checkout when both views request it simultaneously', async () => {
    let begin: () => void;
    let release: () => void;
    const started = new Promise<void>(resolve => { begin = resolve; });
    const pending = new Promise<void>(resolve => { release = resolve; });
    stripe.checkout.sessions.create.mockImplementation(async (options: any) => {
      begin(); await pending;
      const session = { id: 'cs_shared', url: 'https://checkout.stripe.com/shared', status: 'open', mode: 'subscription', ...options };
      sessions.push(session); return session;
    });
    const first = checkout('candidate');
    await started;
    const second = checkout('employer').then(() => 'opened', error => error.message);
    try {
      await new Promise(resolve => setImmediate(resolve));
      expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    } finally { release(); await Promise.allSettled([first, second]); }
    expect(await second).toMatch(/checkout.*being prepared/i);
    expect(user.checkoutLockUntil).toBeUndefined();
  });

  it('recovers a past_due subscription before showing either view when the webhook was missed', async () => {
    await checkout('candidate'); await publish('past_due');
    membership = null; user.currentPlanType = 'FREE';
    expect(await employer.getOrCreateSubscription(userId)).toMatchObject({ status: 'past_due', stripeSubscriptionId: 'sub_shared', plan: 'free' });
  });

  it('removes paid access from both workspaces on past_due while preventing a new purchase', async () => {
    await checkout('candidate'); await publish('past_due');
    expect(user.currentPlanType).toBe('FREE');
    expect(await employer.getOrCreateSubscription(userId)).toMatchObject({ plan: 'free', status: 'past_due' });
    await expect(checkout('employer')).rejects.toThrow(/already has a subscription/i);
  });
});
