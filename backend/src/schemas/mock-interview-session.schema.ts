import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MockInterviewSessionDocument = MockInterviewSession & Document;

export enum MockInterviewStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface InterviewQuestion {
  question: string;
  answer?: string;
  score?: number;
  feedback?: string;
  timestamp: Date;
}

export interface RubricScore {
  category: string; // e.g., "Technical Skills", "Communication", "Problem Solving"
  score: number; // 0-100
  feedback: string;
}

@Schema({ timestamps: true, collection: 'mock_interview_sessions' })
export class MockInterviewSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Application', required: false, index: true })
  applicationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: false, index: true })
  jobId?: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true, enum: MockInterviewStatus, default: MockInterviewStatus.IN_PROGRESS })
  status: MockInterviewStatus;

  @Prop({
    type: [
      {
        question: String,
        answer: String,
        score: Number,
        feedback: String,
        timestamp: Date,
      },
    ],
    default: [],
  })
  questions: InterviewQuestion[];

  @Prop({
    type: [
      {
        category: String,
        score: Number,
        feedback: String,
      },
    ],
    default: [],
  })
  rubricScores: RubricScore[];

  @Prop()
  overallScore?: number; // Average of rubric scores

  @Prop()
  feedbackSummary?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  duration?: number; // Duration in minutes

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const MockInterviewSessionSchema = SchemaFactory.createForClass(MockInterviewSession);

// Indexes
MockInterviewSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
MockInterviewSessionSchema.index({ applicationId: 1 });
MockInterviewSessionSchema.index({ jobId: 1 });

