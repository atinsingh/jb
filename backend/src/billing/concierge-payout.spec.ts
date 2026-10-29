import { createHmac } from 'crypto';
import {
  calendlyDecision,
  calendlySignatureValid,
  conciergeCanCancel,
  conciergeCanReportMissed,
  conciergeCoachShare,
  conciergePayoutEligible,
  conciergePhase,
  conciergeTransferKey,
  conciergeUnusedExpired,
  summarizeConciergePayouts,
} from './concierge-payout';

const toronto = (iso: string) => new Date(iso);

describe('Concierge monthly payout rules', () => {
  const marchEnd = toronto('2026-04-01T03:30:00.000Z');
  const aprilSecond = toronto('2026-04-02T04:05:00.000Z');
  const scheduled = (endsAt: Date, extra: Record<string, unknown> = {}) => ({
    status: 'scheduled', amountCents: 15000, feeCents: 3000, endsAt, startsAt: new Date(endsAt.getTime() - 90 * 60 * 1000), ...extra,
  });

  it('pays the stored coach share and ignores a later fee change', () => {
    expect(conciergeCoachShare(15000, 3000)).toBe(12000);
    expect(conciergeCoachShare(15000, 15000)).toBe(0);
    expect(conciergeCoachShare(100, 400)).toBe(0);
  });

  it('pays a session from a previous month only after the dispute day, including a catch-up day', () => {
    const march = scheduled(marchEnd);
    expect(conciergePayoutEligible(march, toronto('2026-04-01T04:05:00.000Z'))).toBe(false);
    expect(conciergePayoutEligible(march, aprilSecond)).toBe(true);
    expect(conciergePayoutEligible(march, toronto('2026-04-03T04:05:00.000Z'))).toBe(true);
    expect(conciergePayoutEligible(scheduled(toronto('2026-03-15T16:00:00.000Z')), toronto('2026-03-20T16:00:00.000Z'))).toBe(false);
  });

  it('holds the current month, an open dispute, a missed session, and a session with no end', () => {
    expect(conciergePayoutEligible(scheduled(toronto('2026-04-01T04:30:00.000Z')), aprilSecond)).toBe(false);
    expect(conciergePayoutEligible({ ...scheduled(marchEnd), endsAt: new Date(aprilSecond.getTime() - 60 * 60 * 1000) }, aprilSecond)).toBe(false);
    expect(conciergePayoutEligible({ ...scheduled(marchEnd), status: 'missed' }, aprilSecond)).toBe(false);
    expect(conciergePayoutEligible({ ...scheduled(marchEnd), status: 'canceled' }, aprilSecond)).toBe(false);
    expect(conciergePayoutEligible({ ...scheduled(marchEnd), status: 'paid' }, aprilSecond)).toBe(false);
    expect(conciergePayoutEligible({ status: 'scheduled', amountCents: 15000, feeCents: 3000, endsAt: null }, aprilSecond)).toBe(false);
    expect(conciergePayoutEligible({ ...scheduled(marchEnd), feeCents: 15000 }, aprilSecond)).toBe(false);
  });

  it('uses one stable transfer key for the same sessions in any order', () => {
    expect(conciergeTransferKey('coach', ['b', 'a'])).toBe(conciergeTransferKey('coach', ['a', 'b']));
    expect(conciergeTransferKey('coach', ['a'])).not.toBe(conciergeTransferKey('other', ['a']));
  });

  it('lets either side cancel only before the start, and only the candidate report a miss inside one day', () => {
    const start = toronto('2026-05-01T15:00:00.000Z');
    const end = toronto('2026-05-01T16:00:00.000Z');
    expect(conciergeCanCancel({ status: 'unscheduled' }, start)).toBe(true);
    expect(conciergeCanCancel({ status: 'scheduled', startsAt: start }, new Date(start.getTime() - 1000))).toBe(true);
    expect(conciergeCanCancel({ status: 'scheduled', startsAt: start }, start)).toBe(false);
    expect(conciergeCanCancel({ status: 'paid', startsAt: start }, new Date(start.getTime() - 1000))).toBe(false);
    expect(conciergeCanReportMissed({ status: 'scheduled', endsAt: end }, end)).toBe(true);
    expect(conciergeCanReportMissed({ status: 'scheduled', endsAt: end }, new Date(end.getTime() - 1))).toBe(false);
    expect(conciergeCanReportMissed({ status: 'scheduled', endsAt: end }, new Date(end.getTime() + 24 * 60 * 60 * 1000))).toBe(false);
    expect(conciergeCanReportMissed({ status: 'scheduled' }, end)).toBe(false);
  });

  it('refunds an unscheduled purchase after 90 days and keeps a scheduled one', () => {
    const createdAt = toronto('2026-01-01T00:00:00.000Z');
    const later = new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000);
    expect(conciergeUnusedExpired({ status: 'unscheduled', createdAt }, new Date(later.getTime() - 1))).toBe(false);
    expect(conciergeUnusedExpired({ status: 'unscheduled', createdAt }, later)).toBe(true);
    expect(conciergeUnusedExpired({ status: 'scheduled', createdAt }, later)).toBe(false);
  });

  it('treats a Calendly reschedule as a time change and a real cancel as a refund', () => {
    const future = { status: 'scheduled', startsAt: toronto('2026-06-01T15:00:00.000Z') };
    const now = toronto('2026-05-01T15:00:00.000Z');
    expect(calendlyDecision({ status: 'unscheduled' }, 'invitee.created', false, now)).toBe('schedule');
    expect(calendlyDecision(future, 'invitee.created', false, now)).toBe('reschedule');
    expect(calendlyDecision({ status: 'paid' }, 'invitee.created', false, now)).toBe('ignore');
    expect(calendlyDecision(future, 'invitee.canceled', true, now)).toBe('ignore');
    expect(calendlyDecision(future, 'invitee.canceled', false, now)).toBe('cancel');
    expect(calendlyDecision({ status: 'scheduled', startsAt: now }, 'invitee.canceled', false, now)).toBe('ignore');
  });

  it('rejects a missing, stale, or tampered Calendly signature', () => {
    const body = '{"event":"invitee.created"}';
    const timestamp = '1700000000';
    const now = Number(timestamp) * 1000;
    const signature = createHmac('sha256', 'signing-key').update(`${timestamp}.${body}`).digest('hex');
    const header = `t=${timestamp},v1=${signature}`;
    expect(calendlySignatureValid(body, header, 'signing-key', now)).toBe(true);
    expect(calendlySignatureValid(`${body} `, header, 'signing-key', now)).toBe(false);
    expect(calendlySignatureValid(body, header, 'other-key', now)).toBe(false);
    expect(calendlySignatureValid(body, header, 'signing-key', now + 4 * 60 * 1000)).toBe(false);
    expect(calendlySignatureValid(body, undefined, 'signing-key', now)).toBe(false);
  });

  it('splits owed, pending, and the latest payout', () => {
    const summary = summarizeConciergePayouts([
      scheduled(marchEnd),
      { status: 'scheduled', amountCents: 5000, feeCents: 1000, startsAt: toronto('2026-04-01T03:00:00.000Z'), endsAt: toronto('2026-04-01T04:30:00.000Z') },
      { status: 'paid', amountCents: 8000, feeCents: 1600, payoutTransferId: 'tr_old', paidOutAt: toronto('2026-03-02T05:00:00.000Z') },
      { status: 'paid', amountCents: 4000, feeCents: 800, payoutTransferId: 'tr_new', paidOutAt: toronto('2026-04-02T04:10:00.000Z') },
      { status: 'paid', amountCents: 2000, feeCents: 400, payoutTransferId: 'tr_new', paidOutAt: toronto('2026-04-02T04:10:00.000Z') },
    ], aprilSecond);
    expect(summary.owedShareCents).toBe(12000);
    expect(summary.pendingShareCents).toBe(4000);
    expect(summary.lastPayout).toEqual({ paidOutAt: toronto('2026-04-02T04:10:00.000Z').toISOString(), totalCents: 4800 });
    expect(conciergePhase({ status: 'scheduled', startsAt: toronto('2026-05-01T15:00:00.000Z') }, aprilSecond)).toBe('scheduled');
    expect(conciergePhase({ status: 'missed' }, aprilSecond)).toBe('returned');
  });
});
