import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApplicationDocument = Application & Document;

@Schema({ timestamps: true })
export class Application {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  candidateId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'JobProfile', required: false })
  profileId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  agentId?: Types.ObjectId; // Agent who applied on behalf

  @Prop({ enum: ['ai', 'human', 'self'], default: 'self' })
  appliedBy?: string; // Who applied: ai agent, human agent, or candidate themselves

  @Prop({ default: 0 })
  matchScore?: number;

  @Prop({ default: '' })
  coverLetter?: string;

  @Prop({ default: '' })
  resume?: string;

  @Prop({ default: '' })
  source?: string; // e.g. Indeed, LinkedIn, Greenhouse

  @Prop({ default: '' })
  atsType?: string; // e.g. greenhouse, lever, workday

  @Prop({ type: Object, default: {} })
  artifacts?: {
    screenshotUrl?: string;
    formJsonUrl?: string;
    resumeVersionId?: Types.ObjectId;
    coverLetterVersionId?: Types.ObjectId;
  };

  @Prop({ default: '' })
  failReason?: string;

  @Prop({ type: Object, default: {} })
  atsMetadata?: Record<string, any>;

  @Prop({
    enum: ['pending', 'submitted', 'reviewing', 'interviewed', 'rejected', 'accepted'],
    default: 'pending',
  })
  status?: string;

  @Prop({ default: false })
  autoApplied?: boolean;

  @Prop({ default: Date.now })
  appliedAt?: Date;

  @Prop()
  submittedAt?: Date;

  @Prop({ default: '' })
  notes?: string;

  @Prop({ default: '' })
  agentNotes?: string; // Notes from the agent

  @Prop({ type: [String], default: [] })
  proofDocuments?: string[]; // URLs to proof documents (screenshots, confirmation emails, etc.)

  @Prop()
  proofSubmittedAt?: Date;

  @Prop({
    type: [
      {
        status: String,
        timestamp: Date,
        notes: String,
        changedBy: String, // 'system', 'user', 'agent'
      },
    ],
    default: [],
  })
  statusTimeline?: Array<{
    status: string;
    timestamp: Date;
    notes?: string;
    changedBy?: string;
  }>;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// Add indexes
ApplicationSchema.index({ candidateId: 1, jobId: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ appliedAt: -1 });
ApplicationSchema.index({ agentId: 1 });
ApplicationSchema.index({ candidateId: 1, agentId: 1 });
