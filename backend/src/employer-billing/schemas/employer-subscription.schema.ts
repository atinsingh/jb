import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
export type EmployerSubscriptionDocument = EmployerSubscription & Document;

// Membership and Stripe linkage live in UserSubscription; this collection holds employer usage only.
@Schema({ timestamps: true })
export class EmployerSubscription {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  ownerId: Types.ObjectId;
  @Prop({ default: 0 }) jobSlotsUsed: number;
  @Prop({ default: 1 }) seatsUsed: number;
  @Prop({ default: 0 }) sourcingCreditsUsed: number;
}
export const EmployerSubscriptionSchema = SchemaFactory.createForClass(EmployerSubscription);
