import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { createHmac } from 'crypto';
import { ConciergePayoutService } from './concierge-payout.service';
import { sendConciergePayoutNotice, sendConciergeSessionNotice } from './concierge-booking-mail';

jest.mock('./concierge-booking-mail', () => ({
  sendConciergePayoutNotice: jest.fn(async () => true),
  sendConciergeSessionNotice: jest.fn(async () => true),
}));

describe('Concierge payout service', () => {
  const coachId = '507f1f77bcf86cd799439012';
  const candidateId = '507f1f77bcf86cd799439011';
  const otherCoachId = '507f1f77bcf86cd799439013';
  let service: ConciergePayoutService;
  let bookings: any[];
  let stripe: { transfers: { create: jest.Mock }; refunds: { create: jest.Mock } };
  const candidate = { _id: new Types.ObjectId(candidateId), email: 'student@example.com', name: 'Student' };
  const coach = { _id: new Types.ObjectId(coachId), email: 'coach@example.com', name: 'Coach', connectPayoutsEnabled: true, stripeConnectAccountId: 'acct_coach' };
  const otherCoach = { _id: new Types.ObjectId(otherCoachId), email: 'other@example.com', name: 'Other', connectPayoutsEnabled: false, stripeConnectAccountId: 'acct_other' };

  const row = (extra: Record<string, unknown>): any => ({
    _id: new Types.ObjectId(),
    candidateId: candidate._id,
    employerId: coach._id,
    amountCents: 15000,
    feeCents: 3000,
    paymentIntentId: 'pi_one',
    status: 'scheduled',
    save: jest.fn(async function save() { return this; }),
    ...extra,
  });

  beforeEach(async () => {
    bookings = [];
    stripe = { transfers: { create: jest.fn(async () => ({ id: 'tr_month' })) }, refunds: { create: jest.fn(async () => ({ id: 're_1' })) } };
    const module = await Test.createTestingModule({
      providers: [
        ConciergePayoutService,
        { provide: ConfigService, useValue: { get: (key: string, fallback?: string) => (key === 'CALENDLY_WEBHOOK_SIGNING_KEY' ? 'signing-key' : fallback) } },
        { provide: getModelToken('User'), useValue: { findById: jest.fn(async (id: string) => {
          const key = String(id);
          if (key === coachId) return coach;
          if (key === candidateId) return candidate;
          if (key === otherCoachId) return otherCoach;
          return null;
        }) } },
        { provide: getModelToken('ConciergeBooking'), useValue: {
          find: jest.fn(async (query: { status?: string }) => bookings.filter((booking) => !query.status || booking.status === query.status)),
          findById: jest.fn(async (id: string) => bookings.find((booking) => String(booking._id) === String(id)) || null),
          findOneAndUpdate: jest.fn(async (query: { _id: Types.ObjectId; status: { $in: string[] } }, update: { status: string }) => {
            const booking = bookings.find((item) => String(item._id) === String(query._id) && query.status.$in.includes(item.status));
            if (!booking) return null;
            Object.assign(booking, update);
            return booking;
          }),
          updateMany: jest.fn(async (query: { _id: { $in: Types.ObjectId[] }; status: string }, update: { status: string; payoutTransferId: string; paidOutAt: Date }) => {
            bookings.forEach((booking) => {
              if (booking.status === query.status && query._id.$in.some((id) => String(id) === String(booking._id))) Object.assign(booking, update);
            });
          }),
        } },
      ],
    }).compile();
    service = module.get(ConciergePayoutService);
    (service as any).stripe = stripe;
    process.env.CONCIERGE_PLATFORM_FEE_PERCENT = '50';
    (sendConciergePayoutNotice as jest.Mock).mockClear();
    (sendConciergeSessionNotice as jest.Mock).mockClear();
  });

  const signed = (body: string) => {
    const timestamp = '1700000000';
    const signature = createHmac('sha256', 'signing-key').update(`${timestamp}.${body}`).digest('hex');
    return { body, header: `t=${timestamp},v1=${signature}`, now: Number(timestamp) * 1000 };
  };

  it('sends one transfer per coach for the stored share and does not pay it twice', async () => {
    const due = row({ endsAt: new Date('2026-04-01T03:30:00.000Z'), startsAt: new Date('2026-04-01T02:00:00.000Z') });
    const sameCoach = row({ endsAt: new Date('2026-03-15T16:00:00.000Z'), startsAt: new Date('2026-03-15T15:00:00.000Z'), amountCents: 5000, feeCents: 1000, paymentIntentId: 'pi_two' });
    const blocked = row({ employerId: otherCoach._id, endsAt: new Date('2026-03-15T16:00:00.000Z'), startsAt: new Date('2026-03-15T15:00:00.000Z'), paymentIntentId: 'pi_blocked' });
    const currentMonth = row({ endsAt: new Date('2026-04-01T04:30:00.000Z'), startsAt: new Date('2026-04-01T03:00:00.000Z'), paymentIntentId: 'pi_current' });
    bookings.push(due, sameCoach, blocked, currentMonth);
    const now = new Date('2026-04-02T04:05:00.000Z');
    await service.runMonthlyPayouts(now);
    await service.runMonthlyPayouts(now);
    expect(stripe.transfers.create).toHaveBeenCalledTimes(1);
    expect(stripe.transfers.create).toHaveBeenCalledWith(
      { amount: 16000, currency: 'cad', destination: 'acct_coach' },
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^concierge_/) }),
    );
    expect(due.status).toBe('paid');
    expect(sameCoach.status).toBe('paid');
    expect(due.payoutTransferId).toBe('tr_month');
    expect(blocked.status).toBe('scheduled');
    expect(currentMonth.status).toBe('scheduled');
    expect(sendConciergePayoutNotice).toHaveBeenCalledWith('coach@example.com', expect.objectContaining({ totalCents: 16000 }));
  });

  it('refunds a 90-day unscheduled purchase and leaves a scheduled one', async () => {
    const stale = row({ status: 'unscheduled', createdAt: new Date('2026-01-01T00:00:00.000Z'), paymentIntentId: 'pi_old', endsAt: null, startsAt: null });
    const held = row({ status: 'scheduled', createdAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2027-06-01T15:00:00.000Z'), startsAt: new Date('2027-06-01T14:00:00.000Z') });
    bookings.push(stale, held);
    await service.runMonthlyPayouts(new Date('2026-04-02T04:05:00.000Z'));
    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_old' });
    expect(stale.status).toBe('refunded');
    expect(held.status).toBe('scheduled');
  });

  it('rejects a bad Calendly signature and a cancel after the start', async () => {
    await expect(service.handleCalendlyWebhook('{}', 't=1,v1=nope')).rejects.toBeInstanceOf(BadRequestException);
    const started = row({ startsAt: new Date('2026-01-01T15:00:00.000Z'), endsAt: new Date('2026-01-01T16:00:00.000Z') });
    bookings.push(started);
    await expect(service.cancelBooking(candidate as any, started._id.toString())).rejects.toThrow(/no longer be canceled/i);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it('refunds a cancel before the start without reversing a transfer', async () => {
    const future = row({ startsAt: new Date('2027-06-01T15:00:00.000Z'), endsAt: new Date('2027-06-01T16:00:00.000Z'), status: 'scheduled' });
    bookings.push(future);
    await service.cancelBooking(coach as any, future._id.toString());
    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_one' });
    expect(future.status).toBe('canceled');
    expect(sendConciergeSessionNotice).toHaveBeenCalledWith('student@example.com', expect.objectContaining({ kind: 'canceled' }));
    expect(sendConciergeSessionNotice).toHaveBeenCalledWith('coach@example.com', expect.objectContaining({ kind: 'canceled' }));
  });

  it('lets the candidate report a miss inside the day and refuses the coach', async () => {
    const endsAt = new Date(Date.now() - 60 * 60 * 1000);
    const finished = row({ startsAt: new Date(endsAt.getTime() - 60 * 60 * 1000), endsAt });
    bookings.push(finished);
    await expect(service.reportMissed(coach as any, finished._id.toString())).rejects.toThrow(/candidate/i);
    await service.reportMissed(candidate as any, finished._id.toString());
    expect(finished.status).toBe('missed');
    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_one' });
  });

  it('moves a Calendly reschedule onto the same booking and does not refund it', async () => {
    const booking = row({ status: 'scheduled', startsAt: new Date('2027-06-01T15:00:00.000Z'), endsAt: new Date('2027-06-01T16:00:00.000Z'), calendlyEventUri: 'event-1' });
    bookings.push(booking);
    const body = JSON.stringify({
      event: 'invitee.created',
      payload: {
        rescheduled: false,
        reschedule_url: 'https://calendly.com/reschedule/abc',
        cancel_url: 'https://calendly.com/cancel/abc',
        email: 'student@example.com',
        tracking: { utm_content: booking._id.toString() },
        scheduled_event: { uri: 'event-2', start_time: '2027-06-08T15:00:00.000Z', end_time: '2027-06-08T16:30:00.000Z' },
      },
    });
    const { header } = signed(body);
    jest.spyOn(Date, 'now').mockReturnValue(1700000000 * 1000);
    await service.handleCalendlyWebhook(body, header);
    expect(booking.endsAt?.toISOString()).toBe('2027-06-08T16:30:00.000Z');
    expect(booking.status).toBe('scheduled');
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(sendConciergeSessionNotice).toHaveBeenCalledWith('coach@example.com', expect.objectContaining({ kind: 'rescheduled' }));
    const wrong = JSON.stringify(JSON.parse(body).payload ? { event: 'invitee.canceled', payload: { ...JSON.parse(body).payload, email: 'attacker@example.com', rescheduled: false } } : {});
    const forged = signed(wrong);
    await service.handleCalendlyWebhook(wrong, forged.header);
    expect(booking.status).toBe('scheduled');
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    jest.spyOn(Date, 'now').mockRestore();
  });
});
