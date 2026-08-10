import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerInterviewDocument = EmployerInterview & Document;

@Schema({ timestamps: true })
export class EmployerInterview {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerJob', required: false })
  jobId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EmployerApplicant', required: false })
  applicantId?: Types.ObjectId;

  // Real candidate (User) the interview is for. Resolved from the linked
  // EmployerApplicant on create; drives the candidate-side notification.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  candidateId?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ default: '' })
  candidateName?: string;

  @Prop({ type: [String], default: [] })
  interviewers?: string[];

  @Prop({ enum: ['phone', 'video', 'onsite'], default: 'video' })
  type?: string;

  @Prop()
  scheduledAt?: Date;

  @Prop({ default: 45 })
  durationMins?: number;

  @Prop({
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true,
  })
  status?: string;

  @Prop({
    type: [
      {
        question: String,
      },
    ],
    default: [],
  })
  kit?: Array<{
    question: string;
  }>;

  @Prop({
    type: [
      {
        interviewerId: { type: MongooseSchema.Types.ObjectId },
        interviewerName: String,
        competencies: [
          {
            name: String,
            rating: Number,
          },
        ],
        notes: String,
        recommendation: String,
      },
    ],
    default: [],
  })
  scorecards?: Array<{
    interviewerId?: Types.ObjectId;
    interviewerName?: string;
    competencies?: Array<{
      name: string;
      rating: number;
    }>;
    notes?: string;
    recommendation?: string;
  }>;
}

export const EmployerInterviewSchema =
  SchemaFactory.createForClass(EmployerInterview);

// ownerId and status are already single-field indexed via @Prop({ index: true }).
EmployerInterviewSchema.index({ ownerId: 1, status: 1 });
