import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { sendConciergeHoursBooked } from './concierge-booking-mail';

jest.mock('./concierge-booking-mail', () => ({ sendConciergeHoursBooked: jest.fn(async () => true) }));

describe('Concierge duration checkout', () => {
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
      _id: new Types.ObjectId(employerId), name: 'Coach', email: 'coach@example.com', connectPayoutsEnabled: true, stripeConnectAccountId: 'acct_coach',
      conciergeProfile: { published: true, hourlyRate: 100, headline: 'Hiring coach', durations: [{ minutes: 30, url: 'https://calendly.com/coach/30' }, { minutes: 90, url: 'https://meet.google.com/abc-defg-hij' }] },
    };
    stripe = {
      customers: { retrieve: jest.fn(async () => ({ id: 'cus_student', deleted: false })) },
      checkout: { sessions: { create: jest.fn(async () => ({ id: 'cs_hours', url: 'https://checkout.stripe.com/c/pay/cs_hours' })), list: jest.fn(async () => ({ data: [] })) } },
      refunds: { create: jest.fn(async () => ({ id: 're_dup' })) },
      webhooks: { constructEvent: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: ConfigService, useValue: { get: (key: string, fallback?: string) => ({ STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_WEBHOOK_SECRET: 'whsec_test', FRONTEND_URL: 'http://localhost:3000' })[key] ?? fallback } },
        { provide: getModelToken('User'), useValue: {
          findById: jest.fn(async (id: string) => {
            const key = String(id);
            if (key === employerId) return employer;
            if (key === candidateId) return candidate;
            return null;
          }),
          findByIdAndUpdate: jest.fn(),
          find: jest.fn(() => ({ select: async () => [employer, candidate] })),
        } },
        { provide: getModelToken('SubscriptionPlan'), useValue: {} },
        { provide: getModelToken('UserSubscription'), useValue: {} },
        { provide: getModelToken('UsageRecord'), useValue: {} },
        { provide: getModelToken('ConciergeBooking'), useValue: {
          findOne: jest.fn(async (query: { stripeSessionId?: string; _id?: Types.ObjectId; candidateId?: Types.ObjectId; employerId?: Types.ObjectId; scheduledAt?: null }) => bookings.find((booking) => {
            if (query.stripeSessionId) return booking.stripeSessionId === query.stripeSessionId;
            if (query._id && String(booking._id) !== String(query._id)) return false;
            if (query.candidateId && String(booking.candidateId) !== String(query.candidateId)) return false;
            if (query.employerId && String(booking.employerId) !== String(query.employerId)) return false;
            if (query.scheduledAt === null && booking.scheduledAt) return false;
            return !query.stripeSessionId;
          }) || null),
          find: jest.fn(() => ({ sort: () => ({ limit: async () => bookings }) })),
          create: jest.fn(async (doc: any) => { const row = { _id: new Types.ObjectId(), ...doc }; bookings.push(row); return row; }),
        } },
      ],
    }).compile();
    service = module.get(BillingService);
    (service as any).stripe = stripe;
    process.env.CONCIERGE_PLATFORM_FEE_PERCENT = '20';
    (sendConciergeHoursBooked as jest.Mock).mockClear();
  });

  it('charges the hourly rate for the selected duration and keeps 20 percent', async () => {
    const result = await service.createConciergeCheckout(candidate, employerId, 90);

    expect(result.url).toBe('https://checkout.stripe.com/c/pay/cs_hours');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      customer: 'cus_student',
      line_items: [expect.objectContaining({ quantity: 1, price_data: expect.objectContaining({ currency: 'cad', unit_amount: 15000 }) })],
      metadata: expect.objectContaining({ kind: 'concierge', candidateId, employerId, minutes: '90', hourlyRate: '100', durationUrl: 'https://meet.google.com/abc-defg-hij', feeCents: '3000' }),
    }));
  });

  it('refuses a duration the concierge does not offer', async () => {
    await expect(service.createConciergeCheckout(candidate, employerId, 15)).rejects.toThrow(/duration/i);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('refuses a coach who cannot be paid', async () => {
    employer.connectPayoutsEnabled = false;
    await expect(service.createConciergeCheckout(candidate, employerId, 30)).rejects.toThrow(BadRequestException);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('uses the fee percent from the environment', async () => {
    process.env.CONCIERGE_PLATFORM_FEE_PERCENT = '10';
    await service.createConciergeCheckout(candidate, employerId, 90);
    const payload = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(payload.payment_intent_data).toBeUndefined();
    expect(payload.metadata.feeCents).toBe('1500');
  });

  it('records one booking when Stripe confirms payment', async () => {
    const session = { id: 'cs_hours', amount_total: 15000, metadata: { kind: 'concierge', candidateId, employerId, minutes: '90', hourlyRate: '100', durationUrl: 'https://meet.google.com/abc-defg-hij' } };
    stripe.webhooks.constructEvent.mockReturnValue({ type: 'checkout.session.completed', id: 'evt_1', data: { object: session } });
    await service.handleStripeWebhook(Buffer.from('payload'), 'sig');
    await service.handleStripeWebhook(Buffer.from('payload'), 'sig');
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({ minutes: 90, durationUrl: 'https://meet.google.com/abc-defg-hij', hourlyRate: 100, amountCents: 15000, feeCents: 3000, currency: 'cad', stripeSessionId: 'cs_hours', status: 'unscheduled' });
  });

  it('saves a paid checkout the webhook missed and emails both people once', async () => {
    const paid = { id: 'cs_paid', payment_status: 'paid', amount_total: 5000, metadata: { kind: 'concierge', candidateId, employerId, minutes: '30', hourlyRate: '100', durationUrl: 'https://calendly.com/coach/30' } };
    const open = { id: 'cs_open', payment_status: 'unpaid', metadata: { kind: 'concierge', candidateId, employerId, minutes: '30', hourlyRate: '100', durationUrl: 'https://calendly.com/coach/30' } };
    stripe.checkout.sessions.list.mockResolvedValue({ data: [open, paid] });
    const first = await service.listConciergeBookings(candidateId, 'candidate');
    const second = await service.listConciergeBookings(candidateId, 'candidate');
    expect(bookings).toHaveLength(1);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]).toMatchObject({ minutes: 30, durationUrl: 'https://calendly.com/coach/30', counterpartId: employerId });
    expect(sendConciergeHoursBooked).toHaveBeenCalledTimes(2);
    expect(sendConciergeHoursBooked).toHaveBeenCalledWith('student@example.com', expect.objectContaining({ minutes: 30, durationUrl: 'https://calendly.com/coach/30' }));
  });

  it('refuses another session while a calendar booking is still open', async () => {
    bookings.push({ candidateId: candidate._id, employerId: employer._id, durationUrl: 'https://calendly.com/coach/30', status: 'unscheduled', scheduledAt: null });
    await expect(service.createConciergeCheckout(candidate, employerId, 90)).rejects.toThrow(/current session/i);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('refunds a second paid checkout while a session is still open', async () => {
    const metadata = { kind: 'concierge', candidateId, employerId, hourlyRate: '100' };
    const first = { id: 'cs_one', payment_intent: 'pi_one', amount_total: 5000, metadata: { ...metadata, minutes: '30', durationUrl: 'https://calendly.com/coach/30' } };
    const second = { id: 'cs_two', payment_intent: 'pi_two', amount_total: 15000, metadata: { ...metadata, minutes: '90', durationUrl: 'https://meet.google.com/abc-defg-hij' } };
    stripe.webhooks.constructEvent
      .mockReturnValueOnce({ type: 'checkout.session.completed', id: 'evt_1', data: { object: first } })
      .mockReturnValueOnce({ type: 'checkout.session.completed', id: 'evt_2', data: { object: second } });
    await service.handleStripeWebhook(Buffer.from('a'), 'sig');
    await service.handleStripeWebhook(Buffer.from('b'), 'sig');
    expect(bookings).toHaveLength(1);
    expect(bookings[0].stripeSessionId).toBe('cs_one');
    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_two' });
    expect(sendConciergeHoursBooked).toHaveBeenCalledTimes(2);
  });

  it('marks a paid booking scheduled once', async () => {
    const row = { _id: new Types.ObjectId(), candidateId: candidate._id, durationUrl: 'https://calendly.com/coach/30', status: 'unscheduled', scheduledAt: null, save: jest.fn(async function save() { return this; }) };
    bookings.push(row);
    const first = await service.markConciergeBookingScheduled(candidateId, row._id.toString());
    row.scheduledAt = first.scheduledAt;
    const second = await service.markConciergeBookingScheduled(candidateId, row._id.toString());
    expect(first.scheduledAt).toBeInstanceOf(Date);
    expect(second.scheduledAt).toEqual(first.scheduledAt);
    expect(row.status).toBe('unscheduled');
    expect(row.save).toHaveBeenCalledTimes(1);
  });
});
