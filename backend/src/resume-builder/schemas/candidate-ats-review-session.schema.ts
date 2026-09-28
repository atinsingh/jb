import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import type { CandidateResumeReviewResult } from '../candidate-resume-review.agent';

export type CandidateAtsReviewSessionDocument = HydratedDocument<CandidateAtsReviewSession>;

@Schema({ timestamps: true, collection: 'candidate_ats_review_sessions' })
export class CandidateAtsReviewSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  resumeId: string;

  @Prop({ required: true })
  jobDescriptionHash: string;

  @Prop({ required: true })
  resumeTextHash: string;

  @Prop({ required: true })
  harness: string;

  @Prop({ required: true })
  alias: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  effort: string;

  @Prop({ enum: ['provisioning', 'active', 'completed', 'failed'], required: true })
  status: 'provisioning' | 'active' | 'completed' | 'failed';

  @Prop()
  sandboxId?: string;

  @Prop({ default: 0 })
  reviewAttempts: number;

  @Prop({ default: 0 })
  groundedAnnotations: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  result?: CandidateResumeReviewResult;

  @Prop()
  failureReason?: string;

  @Prop()
  completedAt?: Date;
}

export const CandidateAtsReviewSessionSchema = SchemaFactory.createForClass(
  CandidateAtsReviewSession,
);
CandidateAtsReviewSessionSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });
