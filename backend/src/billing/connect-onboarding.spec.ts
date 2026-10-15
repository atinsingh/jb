import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BillingService } from './billing.service';

describe('Connect onboarding', () => {
  const userId = '507f1f77bcf86cd799439011';
  let service: BillingService;
  let user: any;
  let stripe: any;

  beforeEach(async () => {
    user = { _id: new Types.ObjectId(userId), email: 'coach@example.com' };
    stripe = {
      accounts: {
        create: jest.fn(async () => ({ id: 'acct_test_ca' })),
        retrieve: jest.fn(async () => ({ id: 'acct_test_ca', payouts_enabled: true, charges_enabled: true, details_submitted: true })),
      },
      accountLinks: { create: jest.fn(async () => ({ url: 'https://connect.stripe.com/setup/s/test' })) },
    };
    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: ConfigService, useValue: { get: (key: string, fallback?: string) => ({ STRIPE_SECRET_KEY: 'sk_test_mock', FRONTEND_URL: 'http://localhost:3000' })[key] ?? fallback } },
        { provide: getModelToken('User'), useValue: { findByIdAndUpdate: jest.fn(async (_id: unknown, update: { $set: Record<string, unknown> }) => Object.assign(user, update.$set)) } },
        { provide: getModelToken('SubscriptionPlan'), useValue: {} },
        { provide: getModelToken('UserSubscription'), useValue: {} },
        { provide: getModelToken('UsageRecord'), useValue: {} },
      ],
    }).compile();
    service = module.get(BillingService);
    (service as any).stripe = stripe;
  });

  it('creates one Canadian Express account and sends the employer to Stripe', async () => {
    const first = await service.createConnectOnboardingLink(user);
    const second = await service.createConnectOnboardingLink(user);

    expect(first.url).toBe('https://connect.stripe.com/setup/s/test');
    expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
    expect(stripe.accounts.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'express', country: 'CA', email: 'coach@example.com',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    }));
    expect(stripe.accountLinks.create).toHaveBeenLastCalledWith(expect.objectContaining({
      account: 'acct_test_ca', type: 'account_onboarding',
      return_url: 'http://localhost:3000/employer/settings?connect=return',
      refresh_url: 'http://localhost:3000/employer/settings?connect=refresh',
    }));
    expect(second.url).toBe(first.url);
    expect(user.stripeConnectAccountId).toBe('acct_test_ca');
  });

  it('stores whether Stripe can pay the employer', async () => {
    user.stripeConnectAccountId = 'acct_test_ca';
    await expect(service.getConnectStatus(user)).resolves.toEqual({
      payoutsEnabled: true, chargesEnabled: true, detailsSubmitted: true,
    });
    expect(user.connectPayoutsEnabled).toBe(true);
  });
});
