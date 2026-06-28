import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type EntitlementType = 'boolean' | 'limit' | 'tier';
export type PlanEntitlementDocument = HydratedDocument<PlanEntitlement>;

@Schema({ timestamps: true, collection: 'plan_entitlements' })
export class PlanEntitlement {
  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  planId: Types.ObjectId;

  @Prop({ required: true })
  featureKey: string;

  @Prop({ required: true })
  featureName: string;

  @Prop({ required: true, enum: ['boolean', 'limit', 'tier'] })
  type: EntitlementType;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  value: boolean | number | string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const PlanEntitlementSchema = SchemaFactory.createForClass(PlanEntitlement);

// Indexes
PlanEntitlementSchema.index({ planId: 1, featureKey: 1 }, { unique: true });
PlanEntitlementSchema.index({ planId: 1 });
PlanEntitlementSchema.index({ featureKey: 1 });

