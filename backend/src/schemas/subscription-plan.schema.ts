import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type PlanType = 'FREE' | 'PRO' | 'ELITE' | 'INTERVIEW';
export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>;

@Schema({ timestamps: true, collection: 'subscription_plans' })
export class SubscriptionPlan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: ['FREE', 'PRO', 'ELITE', 'INTERVIEW'], unique: true })
  type: PlanType;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 0 })
  priceMonthly: number;

  @Prop({ required: true, min: 0 })
  priceYearly: number;

  @Prop()
  stripePriceIdMonthly?: string;

  @Prop()
  stripePriceIdYearly?: string;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);

// Indexes
SubscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

