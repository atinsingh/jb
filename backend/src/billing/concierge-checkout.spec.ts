import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';

describe('Concierge hour checkout', () => {
  const candidateId = '507f1f77bcf86cd799439011';
  const employerId = '507f1f77bcf86cd799439012';
  let service: BillingService;
  let candidate: any;
  let employer: any;
  let stripe: any;
  let bookings: any[];

  beforeEach(async () => {
    bookings = [];
    candidate = { _id: new Types.ObjectId(candidateId), email: 'student@example.com', name: 'Student', role: 'ROLE_CANDIDATE', stripeCustomerId: 'cus_student' };
    employer = {
      _id: new Types.ObjectId(employerId), name: 'Coach', connectPayoutsEnabled: true, stripeConnectAccountId: 'acct_coach',
      conciergeProfile: { published: true, hourlyRate: 100, headline: 'Hiring coach' },
    };
    stripe = {
      customers: { retrieve: jest.fn(async () => ({ id: 'cus_student', deleted: false })) },
      checkout: { sessions: { create: jest.fn(async () => ({ id: 'cs_hours', url: 'https://checkout.stripe.com/c/pay/cs_hours' })) } },
      webhooks: { constructEvent: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: ConfigService, useValue: { get: (key: string, fallback?: string) => ({ STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_WEBHOOK_SECRET: 'whsec_test', FRONTEND_URL: 'http://localhost:3000' })[key] ?? fallback } },
        { provide: getModelToken('User'), useValue: { findById: jest.fn(async (id: string) => String(id) === employerId ? employer : null), findByIdAndUpdate: jest.fn() } },
        { provide: getModelToken('SubscriptionPlan'), useValue: {} },
        { provide: getModelToken('UserSubscription'), useValue: {} },
        { provide: getModelToken('UsageRecord'), useValue: {} },
        { provide: getModelToken('ConciergeBooking'), useValue: {
          findOne: jest.fn(async (query: { stripeSessionId: string }) => bookings.find((booking) => booking.stripeSessionId === query.stripeSessionId) || null),
          create: jest.fn(async (doc: any) => { bookings.push(doc); return doc; }),
        } },
      ],
    }).compile();
    service = module.get(BillingService);
    (service as any).stripe = stripe;
  });

  it('charges the listed rate in CAD and keeps 20 percent for Jobocate', async () => {
    const result = await service.createConciergeCheckout(candidate, employerId, 2);

    expect(result.url).toBe('https://checkout.stripe.com/c/pay/cs_hours');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      customer: 'cus_student',
      line_items: [expect.objectContaining({ quantity: 2, price_data: expect.objectContaining({ currency: 'cad', unit_amount: 10000 }) })],
      payment_intent_data: { application_fee_amount: 4000, transfer_data: { destination: 'acct_coach' } },
      metadata: expect.objectContaining({ kind: 'concierge', candidateId, employerId, hours: '2', hourlyRate: '100' }),
    }));
  });

  it('refuses a coach who cannot be paid', async () => {
    employer.connectPayoutsEnabled = false;
    await expect(service.createConciergeCheckout(candidate, employerId, 1)).rejects.toThrow(BadRequestException);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('records one booking when Stripe confirms payment', async () => {
    const session = { id: 'cs_hours', amount_total: 20000, metadata: { kind: 'concierge', candidateId, employerId, hours: '2', hourlyRate: '100' } };
    stripe.webhooks.constructEvent.mockReturnValue({ type: 'checkout.session.completed', id: 'evt_1', data: { object: session } });
    await service.handleStripeWebhook(Buffer.from('payload'), 'sig');
    await service.handleStripeWebhook(Buffer.from('payload'), 'sig');
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({ hours: 2, hourlyRate: 100, amountCents: 20000, feeCents: 4000, currency: 'cad', stripeSessionId: 'cs_hours' });
  });
});
