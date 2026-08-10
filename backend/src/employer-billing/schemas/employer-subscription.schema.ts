import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerSubscriptionDocument = EmployerSubscription & Document;

@Schema({ timestamps: true })
export class EmployerSubscription {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  ownerId: Types.ObjectId;

  // New employers start on the free tier — never a paid plan they didn't buy.
  @Prop({ enum: ['free', 'starter', 'growth', 'scale', 'enterprise'], default: 'free' })
  plan: string;

  @Prop({ enum: ['monthly', 'annual'], default: 'monthly' })
  billingCycle: string;

  @Prop({ default: 1 })
  jobSlotsLimit: number;

  @Prop({ default: 0 })
  jobSlotsUsed: number;

  @Prop({ default: 1 })
  seatsLimit: number;

  @Prop({ default: 1 })
  seatsUsed: number;

  @Prop({ default: 25 })
  aiActionsLimit: number;

  @Prop({ default: 0 })
  aiActionsUsed: number;

  @Prop({ default: 10 })
  sourcingCreditsLimit: number;

  @Prop({ default: 0 })
  sourcingCreditsUsed: number;

  @Prop({ type: Date })
  renewsAt?: Date;

  // ---- Stripe linkage. A paid plan is only ever granted by a Stripe webhook,
  // so these are the record of *why* this subscription is on its current tier.
  @Prop({ index: true })
  stripeCustomerId?: string;

  @Prop({ index: true })
  stripeSubscriptionId?: string;

  @Prop({
    enum: [
      'active',
      'trialing',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused',
    ],
    default: 'active',
  })
  status: string;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;

  @Prop({
    type: [
      {
        date: Date,
        description: String,
        amount: Number,
        status: String,
      },
    ],
    default: [],
  })
  invoices: Array<{
    date: Date;
    description: string;
    amount: number;
    status: string;
  }>;
}

export const EmployerSubscriptionSchema = SchemaFactory.createForClass(EmployerSubscription);

// ownerId already has a unique index via @Prop({ unique: true }).
