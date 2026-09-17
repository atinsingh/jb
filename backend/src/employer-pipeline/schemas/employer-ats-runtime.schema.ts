import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type EmployerAtsRuntimeDocument = HydratedDocument<EmployerAtsRuntime>;

@Schema({ timestamps: true, collection: 'employer_ats_runtimes' })
export class EmployerAtsRuntime {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  ownerId: Types.ObjectId;

  @Prop({ required: true, enum: ['employer'], default: 'employer' })
  ownerType: 'employer';

  @Prop()
  encryptedKey?: string;

  @Prop()
  keyHash?: string;

  @Prop()
  keyAlias?: string;

  @Prop({ type: [String], default: [] })
  models: string[];

  @Prop()
  plan?: string;

  @Prop()
  modelTier?: string;

  @Prop({ default: 0 })
  maxBudgetUsd: number;

  @Prop({ default: 0 })
  spendUsd: number;

  @Prop()
  sandboxId?: string;

  @Prop()
  sandboxLeaseId?: string;

  @Prop()
  provisioningToken?: string;

  @Prop()
  provisioningUntil?: Date;

  @Prop()
  sandboxProvisioningToken?: string;

  @Prop()
  sandboxProvisioningUntil?: Date;

  @Prop()
  activeRunId?: string;

  @Prop()
  runLockUntil?: Date;

  @Prop()
  interruptedRunId?: string;
}

export const EmployerAtsRuntimeSchema =
  SchemaFactory.createForClass(EmployerAtsRuntime);

EmployerAtsRuntimeSchema.index(
  { ownerId: 1, ownerType: 1 },
  { unique: true },
);
