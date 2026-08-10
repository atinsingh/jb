import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type ClaimsReviewDocument = HydratedDocument<ClaimsReview>;

export enum ClaimsReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
}

@Schema({ timestamps: true, collection: 'claims_reviews' })
export class ClaimsReview {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  feature: string; // LLMFeature enum value

  @Prop({ required: true })
  originalContent: string; // Original content with unverifiable claim

  @Prop({ required: true })
  suggestedContent: string; // AI-suggested content

  @Prop({ required: true })
  claim: string; // The specific unverifiable claim

  @Prop({ required: true, enum: ClaimsReviewStatus, default: ClaimsReviewStatus.PENDING })
  status: ClaimsReviewStatus;

  @Prop()
  userDecision?: string; // User's decision: 'approve', 'reject', 'modify'

  @Prop()
  modifiedContent?: string; // User-modified content if status is MODIFIED

  @Prop()
  reviewedAt?: Date;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const ClaimsReviewSchema = SchemaFactory.createForClass(ClaimsReview);

// Indexes
ClaimsReviewSchema.index({ userId: 1, status: 1, createdAt: -1 });
ClaimsReviewSchema.index({ status: 1 }, { partialFilterExpression: { status: ClaimsReviewStatus.PENDING } });

