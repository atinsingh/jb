import { createHash, createHmac, timingSafeEqual } from 'crypto';

const DAY_MS = 24 * 60 * 60 * 1000;
const REFUND_AFTER_MS = 90 * DAY_MS;
const SIGNATURE_WINDOW_MS = 3 * 60 * 1000;

export type ConciergePayoutView = {
  status?: string;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  amountCents?: number;
  feeCents?: number;
  shareCents?: number;
  createdAt?: Date | string | null;
  paidOutAt?: Date | string | null;
  payoutTransferId?: string | null;
};

const asDate = (value?: Date | string | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function conciergeCoachShare(amountCents?: number, feeCents?: number) {
  if (!Number.isInteger(amountCents) || !Number.isInteger(feeCents) || amountCents < 0 || feeCents < 0) return 0;
  return Math.max(0, amountCents - feeCents);
}

export function conciergeTransferKey(employerId: string, bookingIds: string[]) {
  const body = [employerId, ...[...bookingIds].sort()].join(':');
  return `concierge_${createHash('sha256').update(body).digest('hex')}`;
}

const torontoParts = (value: Date) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit',
  }).formatToParts(value).map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month) };
};

export function endedBeforeThisTorontoMonth(endsAt: Date, now: Date) {
  const end = torontoParts(endsAt);
  const current = torontoParts(now);
  return end.year < current.year || (end.year === current.year && end.month < current.month);
}

export function conciergeDisputeClosed(endsAt: Date, now: Date) {
  return now.getTime() >= endsAt.getTime() + DAY_MS;
}

export function conciergePayoutEligible(booking: ConciergePayoutView, now: Date) {
  const endsAt = asDate(booking.endsAt);
  if (booking.status !== 'scheduled' || !endsAt) return false;
  if (!conciergeDisputeClosed(endsAt, now) || !endedBeforeThisTorontoMonth(endsAt, now)) return false;
  const share = booking.shareCents ?? conciergeCoachShare(booking.amountCents, booking.feeCents);
  return share > 0;
}

export function conciergePhase(booking: ConciergePayoutView, now: Date): 'unscheduled' | 'scheduled' | 'pending' | 'paid' | 'returned' {
  if (booking.status === 'missed' || booking.status === 'canceled' || booking.status === 'refunded') return 'returned';
  if (booking.status === 'paid') return 'paid';
  if (booking.status === 'scheduled') {
    const startsAt = asDate(booking.startsAt);
    if (startsAt && startsAt.getTime() > now.getTime()) return 'scheduled';
    return 'pending';
  }
  return 'unscheduled';
}

export function conciergeCanCancel(booking: ConciergePayoutView, now: Date) {
  if (booking.status === 'unscheduled') return true;
  const startsAt = asDate(booking.startsAt);
  return booking.status === 'scheduled' && !!startsAt && startsAt.getTime() > now.getTime();
}

export function conciergeCanReportMissed(booking: ConciergePayoutView, now: Date) {
  const endsAt = asDate(booking.endsAt);
  if (booking.status !== 'scheduled' || !endsAt) return false;
  const elapsed = now.getTime() - endsAt.getTime();
  return elapsed >= 0 && elapsed < DAY_MS;
}

export function conciergeUnusedExpired(booking: ConciergePayoutView, now: Date) {
  const createdAt = asDate(booking.createdAt);
  return booking.status === 'unscheduled' && !!createdAt && now.getTime() >= createdAt.getTime() + REFUND_AFTER_MS;
}

export function calendlySignatureValid(rawBody: string, header: string | undefined, secret: string, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((piece) => {
    const index = piece.indexOf('=');
    return index === -1 ? [] : [piece.slice(0, index).trim(), piece.slice(index + 1).trim()];
  }).filter((pair) => pair.length === 2));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > SIGNATURE_WINDOW_MS) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function calendlyDecision(
  booking: ConciergePayoutView,
  event: string,
  rescheduled: boolean,
  now: Date,
): 'schedule' | 'reschedule' | 'cancel' | 'ignore' {
  if (event === 'invitee.created') {
    if (booking.status === 'unscheduled') return 'schedule';
    if (booking.status === 'scheduled') return 'reschedule';
    return 'ignore';
  }
  if (event === 'invitee.canceled' && !rescheduled && conciergeCanCancel(booking, now)) return 'cancel';
  return 'ignore';
}

export function summarizeConciergePayouts(rows: ConciergePayoutView[], now: Date) {
  let owedShareCents = 0;
  let pendingShareCents = 0;
  const transfers = new Map<string, { at: number; total: number }>();
  for (const row of rows) {
    const share = row.shareCents ?? conciergeCoachShare(row.amountCents, row.feeCents);
    if (row.status === 'paid' && row.payoutTransferId && row.paidOutAt) {
      const at = asDate(row.paidOutAt)?.getTime() || 0;
      const current = transfers.get(row.payoutTransferId) || { at, total: 0 };
      current.total += share;
      transfers.set(row.payoutTransferId, current);
    } else if (conciergePayoutEligible(row, now)) owedShareCents += share;
    else if (conciergePhase(row, now) === 'pending') pendingShareCents += share;
  }
  let last: { at: number; total: number } | null = null;
  for (const value of transfers.values()) if (!last || value.at > last.at) last = value;
  return {
    owedShareCents,
    pendingShareCents,
    lastPayout: last ? { paidOutAt: new Date(last.at).toISOString(), totalCents: last.total } : null,
  };
}

export function presentConciergeBooking(booking: ConciergePayoutView & { rescheduleUrl?: string | null; cancelUrl?: string | null }, now: Date) {
  const startsAt = asDate(booking.startsAt);
  const endsAt = asDate(booking.endsAt);
  const paidOutAt = asDate(booking.paidOutAt);
  const view = { ...booking, startsAt, endsAt };
  return {
    status: booking.status || 'unscheduled',
    startsAt: startsAt ? startsAt.toISOString() : null,
    endsAt: endsAt ? endsAt.toISOString() : null,
    rescheduleUrl: booking.rescheduleUrl || null,
    cancelUrl: booking.cancelUrl || null,
    paidOutAt: paidOutAt ? paidOutAt.toISOString() : null,
    payoutTransferId: booking.payoutTransferId || null,
    shareCents: conciergeCoachShare(booking.amountCents, booking.feeCents),
    phase: conciergePhase(view, now),
    canReportMissed: conciergeCanReportMissed(view, now),
    canCancel: conciergeCanCancel(view, now),
  };
}
