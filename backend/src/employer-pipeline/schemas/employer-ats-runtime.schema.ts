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
  sandboxId?: string;

  @Prop()
  sandboxKeyHash?: string;

  @Prop()
  sandboxLeaseId?: string;

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
