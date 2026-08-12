import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type EmployerApplicantDocument = EmployerApplicant & Document;

@Schema({ timestamps: true })
export class EmployerApplicant {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerJob', required: true, index: true })
  jobId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  ownerId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  candidateId?: Types.ObjectId;

  @Prop({ default: '' })
  candidateName?: string;

  @Prop({ default: '' })
  candidateHeadline?: string;

  @Prop({ default: '' })
  candidateEmail?: string;

  @Prop({ default: '' })
  source?: string;

  @Prop({ default: '' })
  candidateLocation?: string;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({ default: 0 })
  yearsExperience?: number;

  @Prop({ default: 0 })
  aiScore?: number;

  @Prop({
    enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'],
    default: 'applied',
    index: true,
  })
  stage?: string;

  @Prop({ default: 0 })
  rating?: number;

  @Prop({
    type: [
      {
        authorId: Types.ObjectId,
        text: String,
        createdAt: Date,
      },
    ],
    default: [],
  })
  notes?: Array<{
    authorId: Types.ObjectId;
    text: string;
    createdAt: Date;
  }>;

  @Prop({ default: Date.now })
  appliedAt?: Date;

  // Timestamps (automatically added by Mongoose with timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;
}

export const EmployerApplicantSchema =
  SchemaFactory.createForClass(EmployerApplicant);

EmployerApplicantSchema.index({ ownerId: 1, jobId: 1 });
EmployerApplicantSchema.index({ ownerId: 1, stage: 1 });

// Idempotency for the candidate-apply bridge: one applicant per (job, candidate).
// Partial so employer manual-adds without a linked candidateId are never subject
// to the uniqueness constraint (and don't collide on a null candidateId).
EmployerApplicantSchema.index(
  { jobId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { candidateId: { $exists: true } } },
);
