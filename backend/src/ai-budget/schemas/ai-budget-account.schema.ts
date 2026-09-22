import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { AiBudgetOwnerType } from '../ai-budget-policy.types';

export type AiBudgetAccountDocument = HydratedDocument<AiBudgetAccount>;

@Schema({ timestamps: true, collection: 'ai_budget_accounts' })
export class AiBudgetAccount {
  @Prop({ type: String, required: true, enum: ['candidate', 'employer'] })
  ownerType: AiBudgetOwnerType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  keyId: string;

  @Prop({ required: true })
  keyAlias: string;

  @Prop({ required: true, select: false })
  encryptedKey: string;

  @Prop({ required: true })
  appliedTier: string;

  @Prop({ required: true, min: 0 })
  appliedLimitUsd: number;

  @Prop({ type: String, required: true, enum: ['1mo'] })
  budgetDuration: '1mo';

  @Prop()
  lastSyncedAt?: Date;

  @Prop()
  activeRunId?: string;

  @Prop()
  runLockUntil?: Date;
}

export const AiBudgetAccountSchema =
  SchemaFactory.createForClass(AiBudgetAccount);

AiBudgetAccountSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });
