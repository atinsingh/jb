import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InterviewTurnDocument = InterviewTurn & Document;

export enum TurnType {
  QUESTION = 'QUESTION',
  ANSWER = 'ANSWER',
  COACHING = 'COACHING',
  SYSTEM = 'SYSTEM',
}

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
  speaker: 'INTERVIEWER' | 'CANDIDATE' | 'UNKNOWN';
}

@Schema({ timestamps: true })
export class InterviewTurn {
  @Prop({ type: Types.ObjectId, ref: 'InterviewSession', required: true, index: true })
  sessionId: Types.ObjectId;

  @Prop({ required: true, enum: TurnType })
  type: TurnType;

  @Prop({ required: true, maxlength: 12000 })
  text: string;

  @Prop({
    type: [
      {
        startMs: Number,
        endMs: Number,
        text: String,
        confidence: Number,
        speaker: String,
      },
    ],
    default: [],
  })
  segments?: TranscriptSegment[];

  @Prop({ type: Number, min: 0, max: 1 })
  sttConfidence?: number;

  @Prop({ type: Number })
  startTs?: number; // Unix timestamp in milliseconds

  @Prop({ type: Number })
  endTs?: number; // Unix timestamp in milliseconds

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const InterviewTurnSchema = SchemaFactory.createForClass(InterviewTurn);

// Indexes
InterviewTurnSchema.index({ sessionId: 1, createdAt: 1 });
InterviewTurnSchema.index({ sessionId: 1, type: 1 });

