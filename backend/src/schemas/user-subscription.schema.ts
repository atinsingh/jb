import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | 'paused';
export type BillingCycle = 'monthly' | 'yearly';

export type UserSubscriptionDocument = HydratedDocument<UserSubscription>;

@Schema({ timestamps: true, collection: 'user_subscriptions' })
export class UserSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  planId: Types.ObjectId;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripeSubscriptionId?: string;

  @Prop({
    required: true,
    enum: ['active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused'],
    default: 'active',
  })
  status: SubscriptionStatus;

  @Prop({ required: true, enum: ['monthly', 'yearly'], default: 'monthly' })
  billingCycle: BillingCycle;

  @Prop({ required: true })
  currentPeriodStart: Date;

  @Prop({ required: true })
  currentPeriodEnd: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd: boolean;

  @Prop()
  canceledAt?: Date;

  @Prop()
  trialStart?: Date;

  @Prop()
  trialEnd?: Date;
}

export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription);

// Indexes
UserSubscriptionSchema.index({ stripeCustomerId: 1 });
UserSubscriptionSchema.index({ stripeSubscriptionId: 1 });
UserSubscriptionSchema.index({ status: 1 });
UserSubscriptionSchema.index({ currentPeriodEnd: 1 });

