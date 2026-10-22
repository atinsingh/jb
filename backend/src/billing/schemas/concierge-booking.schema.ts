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
  hours: number;

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
