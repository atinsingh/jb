import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { User, UserDocument } from '../schemas/user.schema';
import { ConciergeBooking, ConciergeBookingDocument } from './schemas/concierge-booking.schema';
import { sendConciergePayoutNotice, sendConciergeSessionNotice } from './concierge-booking-mail';
import {
  calendlyDecision,
  calendlySignatureValid,
  conciergeCanCancel,
  conciergeCanReportMissed,
  conciergeCoachShare,
  conciergePayoutEligible,
  conciergeTransferKey,
  conciergeUnusedExpired,
} from './concierge-payout';

type CalendlyPayload = {
  email?: string;
  rescheduled?: boolean;
  reschedule_url?: string;
  cancel_url?: string;
  tracking?: { utm_content?: string };
  scheduled_event?: { uri?: string; start_time?: string; end_time?: string };
};

@Injectable()
export class ConciergePayoutService {
  private stripe: Stripe;
  private readonly logger = new Logger(ConciergePayoutService.name);

  constructor(
    @InjectModel(ConciergeBooking.name) private bookingModel: Model<ConciergeBookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY', ''), { apiVersion: '2023-10-16' });
  }

  @Cron('5 0 * * *', { name: 'concierge-monthly-payout', timeZone: 'America/Toronto' })
  async handleMonthlyPayout() {
    await this.runMonthlyPayouts();
  }

  async handleCalendlyWebhook(rawBody: string, header?: string) {
    const secret = this.configService.get<string>('CALENDLY_WEBHOOK_SIGNING_KEY', '');
    if (!calendlySignatureValid(rawBody, header, secret)) throw new BadRequestException('Calendly signature was rejected');
    let event = '';
    let payload: CalendlyPayload = {};
    try {
      const body = JSON.parse(rawBody) as { event?: string; payload?: CalendlyPayload };
      event = body.event || '';
      payload = body.payload || {};
    } catch {
      throw new BadRequestException('Calendly payload was rejected');
    }
    const bookingId = payload.tracking?.utm_content || '';
    if (!Types.ObjectId.isValid(bookingId)) return { received: true };
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) return { received: true };
    const candidate = await this.userModel.findById(booking.candidateId);
    const invitee = (payload.email || '').trim().toLowerCase();
    if (!candidate?.email || candidate.email.trim().toLowerCase() !== invitee) return { received: true };
    const now = new Date();
    const decision = calendlyDecision(booking, event, payload.rescheduled === true, now);
    if (decision === 'ignore') return { received: true };
    if (decision === 'cancel') {
      await this.refundAndClose(booking, 'canceled');
      return { received: true };
    }
    const startsAt = new Date(payload.scheduled_event?.start_time || '');
    const endsAt = new Date(payload.scheduled_event?.end_time || '');
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { received: true };
    const sameEvent = booking.calendlyEventUri && booking.calendlyEventUri === payload.scheduled_event?.uri && booking.endsAt?.getTime() === endsAt.getTime();
    if (decision === 'reschedule' && sameEvent) return { received: true };
    booking.status = 'scheduled';
    booking.startsAt = startsAt;
    booking.endsAt = endsAt;
    booking.scheduledAt = startsAt;
    booking.rescheduleUrl = payload.reschedule_url || booking.rescheduleUrl;
    booking.cancelUrl = payload.cancel_url || booking.cancelUrl;
    booking.calendlyEventUri = payload.scheduled_event?.uri || booking.calendlyEventUri;
    await booking.save();
    await this.notify(booking, decision === 'reschedule' ? 'rescheduled' : 'scheduled');
    return { received: true };
  }

  async cancelBooking(user: UserDocument, bookingId: string) {
    const booking = await this.ownedBooking(user, bookingId);
    if (!conciergeCanCancel(booking, new Date())) throw new BadRequestException('This session can no longer be canceled');
    await this.refundAndClose(booking, 'canceled');
    return { id: bookingId, status: 'canceled' };
  }

  async reportMissed(user: UserDocument, bookingId: string) {
    const booking = await this.ownedBooking(user, bookingId);
    if (booking.candidateId.toString() !== user._id.toString()) throw new BadRequestException('Only the candidate can report a missed session');
    if (!conciergeCanReportMissed(booking, new Date())) throw new BadRequestException('That report window has closed');
    await this.refundAndClose(booking, 'missed');
    return { id: bookingId, status: 'missed' };
  }

  async runMonthlyPayouts(now = new Date()) {
    const rows = await this.bookingModel.find({ status: 'scheduled' });
    const groups = new Map<string, ConciergeBookingDocument[]>();
    for (const row of rows) {
      if (!conciergePayoutEligible(row, now)) continue;
      const employerId = row.employerId.toString();
      groups.set(employerId, [...(groups.get(employerId) || []), row]);
    }
    for (const [employerId, group] of groups) {
      const employer = await this.userModel.findById(employerId);
      if (!employer?.connectPayoutsEnabled || !employer.stripeConnectAccountId) continue;
      const amount = group.reduce((sum, row) => sum + conciergeCoachShare(row.amountCents, row.feeCents), 0);
      if (amount <= 0) continue;
      const ids = group.map((row) => row._id);
      const transfer = await this.stripe.transfers.create({
        amount,
        currency: 'cad',
        destination: employer.stripeConnectAccountId,
      }, { idempotencyKey: conciergeTransferKey(employerId, ids.map((id) => id.toString())) });
      await this.bookingModel.updateMany({ _id: { $in: ids }, status: 'scheduled' }, { status: 'paid', payoutTransferId: transfer.id, paidOutAt: now });
      if (employer.email) {
        const monthLabel = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: 'long', year: 'numeric' }).format(now);
        try { await sendConciergePayoutNotice(employer.email, { totalCents: amount, monthLabel }); } catch (err) {
          this.logger.warn(`Concierge payout email failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
    const open = await this.bookingModel.find({ status: 'unscheduled' });
    for (const row of open) {
      if (conciergeUnusedExpired(row, now)) await this.refundAndClose(row, 'refunded');
    }
  }

  private async ownedBooking(user: UserDocument, bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) throw new BadRequestException('Choose a booking you paid for');
    const booking = await this.bookingModel.findById(bookingId);
    const me = user._id.toString();
    if (!booking || (booking.candidateId.toString() !== me && booking.employerId.toString() !== me)) throw new BadRequestException('Choose a booking you paid for');
    return booking;
  }

  private async refundAndClose(booking: ConciergeBookingDocument, status: 'canceled' | 'missed' | 'refunded') {
    await this.refundPlatformCharge(booking.paymentIntentId);
    const updated = await this.bookingModel.findOneAndUpdate(
      { _id: booking._id, status: { $in: ['unscheduled', 'scheduled'] } },
      { status, scheduledAt: booking.scheduledAt || new Date() },
      { new: true },
    );
    if (updated && status !== 'refunded') await this.notify(updated, status);
  }

  private async refundPlatformCharge(paymentIntentId?: string) {
    if (!paymentIntentId) return;
    try {
      await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    } catch (err) {
      if ((err as { code?: string }).code === 'charge_already_refunded') return;
      throw err;
    }
  }

  private async notify(booking: ConciergeBookingDocument, kind: 'scheduled' | 'rescheduled' | 'canceled' | 'missed') {
    const candidate = await this.userModel.findById(booking.candidateId);
    const employer = await this.userModel.findById(booking.employerId);
    const when = booking.startsAt && booking.endsAt
      ? `${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' }).format(booking.startsAt)} Toronto`
      : 'the booked time';
    const send = async (to: string | undefined, audience: 'candidate' | 'concierge', otherName: string) => {
      if (!to) return;
      try { await sendConciergeSessionNotice(to, { audience, kind, when, otherName }); } catch (err) {
        this.logger.warn(`Concierge ${kind} email failed: ${err instanceof Error ? err.message : err}`);
      }
    };
    await send(candidate?.email, 'candidate', employer?.name || 'your concierge');
    await send(employer?.email, 'concierge', candidate?.name || 'A candidate');
  }
}
