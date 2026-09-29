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

  // One-time grants apply only to the period in which they were awarded.
  @Prop({ min: 0, default: 0 })
  bonusCredits?: number;

  @Prop()
  bonusPeriodEnd?: Date;

  @Prop({ default: 0, min: 0 })
  creditsUsed: number;

  @Prop()
  creditsResetAt?: Date;

  @Prop({ type: String, required: true, enum: ['1mo'] })
  budgetDuration: '1mo';

  @Prop()
  lastSyncedAt?: Date;

  @Prop()
  activeRunId?: string;

  @Prop() runWorkerId?: string;
  @Prop() runWorkerHost?: string;
  @Prop() runWorkerPid?: number;
  @Prop({ type: [String], default: undefined }) runSandboxIds?: string[];

  @Prop()
  runLockUntil?: Date;

  @Prop()
  settlementPending?: boolean;

  @Prop({ min: 0 })
  runSpendBeforeUsd?: number;

  @Prop({ min: 0 })
  runCreditsBefore?: number;
}

export const AiBudgetAccountSchema =
  SchemaFactory.createForClass(AiBudgetAccount);

AiBudgetAccountSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });
