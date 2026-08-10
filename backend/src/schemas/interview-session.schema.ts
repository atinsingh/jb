import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type InterviewSessionDocument = InterviewSession & Document;

export enum InterviewMode {
  PRACTICE = 'PRACTICE',
  CONSENT = 'CONSENT',
  LIVE_NOTES = 'LIVE_NOTES',
}

export enum InterviewStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class InterviewSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: InterviewMode })
  mode: InterviewMode;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Resume', required: false })
  resumeVersionId?: Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Job' }], default: [] })
  jobDescriptionIds: Types.ObjectId[]; // Multiple if pasted

  @Prop({ required: true, maxlength: 140 })
  roleTitle: string;

  @Prop({ maxlength: 140 })
  companyName?: string;

  @Prop({ required: true, enum: InterviewStatus, default: InterviewStatus.CREATED })
  status: InterviewStatus;

  @Prop({ type: Object, required: false })
  contextPack?: Record<string, any>; // SessionContextPack JSON

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const InterviewSessionSchema = SchemaFactory.createForClass(InterviewSession);

// Indexes
InterviewSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
InterviewSessionSchema.index({ userId: 1, mode: 1 });
InterviewSessionSchema.index({ resumeVersionId: 1 });

