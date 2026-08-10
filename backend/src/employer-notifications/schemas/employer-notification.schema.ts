import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerNotificationDocument = EmployerNotification & Document;

@Schema({ timestamps: true })
export class EmployerNotification {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

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

export const EmployerNotificationSchema =
  SchemaFactory.createForClass(EmployerNotification);

EmployerNotificationSchema.index({ ownerId: 1, type: 1 });
