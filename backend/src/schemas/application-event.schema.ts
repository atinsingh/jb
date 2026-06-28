import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApplicationEventDocument = ApplicationEvent & Document;

@Schema({ timestamps: true })
export class ApplicationEvent {
  @Prop({ type: Types.ObjectId, ref: 'Application', required: false, index: true })
  applicationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  type: string; // e.g., queued, submitted, failed, retry_scheduled

  @Prop({ default: '' })
  message?: string;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, any>;
}

export const ApplicationEventSchema = SchemaFactory.createForClass(ApplicationEvent);

ApplicationEventSchema.index({ createdAt: -1 });
ApplicationEventSchema.index({ applicationId: 1, createdAt: -1 });
ApplicationEventSchema.index({ userId: 1, createdAt: -1 });
