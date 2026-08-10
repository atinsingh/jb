import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type InterviewScoreDocument = InterviewScore & Document;

@Schema({ timestamps: true })
export class InterviewScore {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true })
  sessionId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InterviewTurn', required: true, index: true })
  turnId: Types.ObjectId; // The answer turn being scored

  @Prop({ type: Object, required: true })
  rubricJson: Record<string, any>; // The rubric used for scoring

  @Prop({ type: Object, required: true })
  scoresJson: Record<string, any>; // Dimension scores and details

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  overallScore: number;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const InterviewScoreSchema = SchemaFactory.createForClass(InterviewScore);

// Indexes
InterviewScoreSchema.index({ sessionId: 1, createdAt: -1 });
InterviewScoreSchema.index({ turnId: 1 }, { unique: true });

