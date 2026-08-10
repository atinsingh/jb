import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerAuditEventDocument = EmployerAuditEvent & Document;

@Schema({ timestamps: true })
export class EmployerAuditEvent {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ default: '' })
  actor: string;

  @Prop({ default: '' })
  actorRole: string;

  @Prop({ default: false })
  ai: boolean;

  @Prop({ required: true })
  action: string;

  @Prop({ default: '' })
  target: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ default: '' })
  ip: string;
}

export const EmployerAuditEventSchema =
  SchemaFactory.createForClass(EmployerAuditEvent);
