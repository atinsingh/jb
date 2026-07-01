import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployerApplicantDocument = EmployerApplicant & Document;

@Schema({ timestamps: true })
export class EmployerApplicant {
  @Prop({ type: Types.ObjectId, ref: 'EmployerJob', required: true, index: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  ownerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
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
}

export const EmployerApplicantSchema =
  SchemaFactory.createForClass(EmployerApplicant);

EmployerApplicantSchema.index({ ownerId: 1, jobId: 1 });
EmployerApplicantSchema.index({ ownerId: 1, stage: 1 });
