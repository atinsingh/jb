import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployerInterviewDocument = EmployerInterview & Document;

@Schema({ timestamps: true })
export class EmployerInterview {
  @Prop({ type: Types.ObjectId, ref: 'EmployerJob', required: false })
  jobId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EmployerApplicant', required: false })
  applicantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
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
        interviewerId: { type: Types.ObjectId },
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

EmployerInterviewSchema.index({ ownerId: 1 });
EmployerInterviewSchema.index({ status: 1 });
EmployerInterviewSchema.index({ ownerId: 1, status: 1 });
