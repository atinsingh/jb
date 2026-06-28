import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReminderDocument = Reminder & Document;

export enum ReminderType {
  FOLLOW_UP = 'follow_up',
  INTERVIEW = 'interview',
  DEADLINE = 'deadline',
  CUSTOM = 'custom',
}

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', required: false, index: true })
  applicationId?: Types.ObjectId;

  @Prop({ required: true, enum: ReminderType })
  type: ReminderType;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: true, enum: ReminderStatus, default: ReminderStatus.PENDING })
  status: ReminderStatus;

  @Prop()
  sentAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: false })
  isRecurring?: boolean;

  @Prop()
  recurrencePattern?: string; // e.g., "daily", "weekly", "monthly"

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

// Indexes
ReminderSchema.index({ userId: 1, status: 1, dueDate: 1 });
ReminderSchema.index({ applicationId: 1 });
ReminderSchema.index({ dueDate: 1, status: 1 }); // For background job queries

