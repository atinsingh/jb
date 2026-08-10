import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerDataRequestDocument = EmployerDataRequest & Document;

@Schema({ timestamps: true })
export class EmployerDataRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ enum: ['export', 'delete'], required: true })
  type: string;

  @Prop({ default: '' })
  detail: string;

  @Prop({ enum: ['pending', 'fulfilled', 'rejected'], default: 'pending' })
  status: string;

  @Prop({ type: Date, default: Date.now })
  requestedAt: Date;
}

export const EmployerDataRequestSchema =
  SchemaFactory.createForClass(EmployerDataRequest);
