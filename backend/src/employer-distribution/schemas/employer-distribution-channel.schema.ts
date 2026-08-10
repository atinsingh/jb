import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerDistributionChannelDocument = EmployerDistributionChannel &
  Document;

@Schema({ timestamps: true })
export class EmployerDistributionChannel {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, index: true })
  key: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  tagline: string;

  @Prop({ enum: ['live', 'paused', 'off'], default: 'off' })
  status: string;

  @Prop({ default: false })
  enabled: boolean;

  @Prop({ default: 0 })
  spend: number;

  @Prop({ default: false })
  sponsorable: boolean;
}

export const EmployerDistributionChannelSchema = SchemaFactory.createForClass(
  EmployerDistributionChannel,
);

EmployerDistributionChannelSchema.index({ ownerId: 1, key: 1 });
