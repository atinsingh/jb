import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type ConciergeBookingDocument = HydratedDocument<ConciergeBooking>;

@Schema({ timestamps: true, collection: 'concierge_bookings' })
export class ConciergeBooking {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  employerId: Types.ObjectId;

  @Prop({ required: true })
  minutes: number;

  @Prop({ required: true })
  durationUrl: string;

  @Prop({ default: 'unscheduled' })
  status: string;

  @Prop()
  paymentIntentId?: string;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  rescheduleUrl?: string;

  @Prop()
  cancelUrl?: string;

  @Prop()
  calendlyEventUri?: string;

  @Prop()
  payoutTransferId?: string;

  @Prop()
  paidOutAt?: Date;

  @Prop({ required: true })
  hourlyRate: number;

  @Prop({ required: true })
  amountCents: number;

  @Prop({ required: true })
  feeCents: number;

  @Prop({ required: true, default: 'cad' })
  currency: string;

  @Prop({ required: true, unique: true })
  stripeSessionId: string;
}

export const ConciergeBookingSchema = SchemaFactory.createForClass(ConciergeBooking);

// One unpaid unscheduled booking per pair. A second insert loses and that payment is refunded.
ConciergeBookingSchema.index(
  { candidateId: 1, employerId: 1 },
  { unique: true, partialFilterExpression: { status: 'unscheduled' } },
);
