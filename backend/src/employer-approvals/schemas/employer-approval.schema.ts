import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerApprovalDocument = EmployerApproval & Document;

@Schema({ timestamps: true })
export class EmployerApproval {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  team: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: '' })
  type: string;

  @Prop({ default: '' })
  level: string;

  @Prop({ default: '' })
  requester: string;

  @Prop({
    type: [
      {
        label: String,
        value: String,
      },
    ],
    default: [],
  })
  fields: Array<{ label: string; value: string }>;

  @Prop({
    type: [
      {
        name: String,
        role: String,
        state: String,
        note: String,
      },
    ],
    default: [],
  })
  chain: Array<{ name: string; role: string; state: string; note: string }>;

  @Prop({
    enum: ['pending', 'approved', 'rejected', 'changes'],
    default: 'pending',
  })
  status: string;
}

export const EmployerApprovalSchema =
  SchemaFactory.createForClass(EmployerApproval);

EmployerApprovalSchema.index({ ownerId: 1, createdAt: -1 });
