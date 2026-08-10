import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type CandidateNotificationDocument = CandidateNotification & Document;

@Schema({ timestamps: true })
export class CandidateNotification {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ default: 'today' })
  group: string;

  @Prop({ default: '' })
  tag: string;

  @Prop({ default: '' })
  text: string;

  @Prop({ default: '' })
  href: string;

  @Prop({ default: false })
  ai: boolean;

  @Prop({ default: false })
  read: boolean;
}

export const CandidateNotificationSchema =
  SchemaFactory.createForClass(CandidateNotification);

CandidateNotificationSchema.index({ userId: 1, type: 1 });
