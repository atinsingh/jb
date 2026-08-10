import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerIntegrationDocument = EmployerIntegration & Document;

@Schema({ timestamps: true })
export class EmployerIntegration {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true, index: true })
  integrationId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  category: string;

  @Prop({ default: false })
  connected: boolean;

  @Prop({ default: 'idle' })
  syncStatus: string;

  @Prop({ type: Date })
  authDate?: Date;

  @Prop({ type: Date })
  lastSync?: Date;

  @Prop({ default: 0 })
  syncCount: number;

  @Prop({ default: 'daily' })
  frequency: string;
}

export const EmployerIntegrationSchema =
  SchemaFactory.createForClass(EmployerIntegration);

EmployerIntegrationSchema.index({ ownerId: 1, integrationId: 1 });
