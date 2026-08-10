import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type UsageLogDocument = UsageLog & Document;

@Schema({ timestamps: true })
export class UsageLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  featureKey: string; // e.g., "interview_coaching", "interview_scoring"

  @Prop({ required: true })
  provider: string; // e.g., "openai", "mock"

  @Prop({ required: true })
  model: string; // e.g., "gpt-4", "gpt-3.5-turbo"

  @Prop({ type: Number, required: true, default: 0 })
  inputTokens: number;

  @Prop({ type: Number, required: true, default: 0 })
  outputTokens: number;

  @Prop({ type: Number, required: true, default: 0 })
  cost: number; // in USD

  @Prop({ type: String })
  correlationId?: string; // For linking related requests

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const UsageLogSchema = SchemaFactory.createForClass(UsageLog);

// Indexes
UsageLogSchema.index({ userId: 1, createdAt: -1 });
UsageLogSchema.index({ userId: 1, featureKey: 1, createdAt: -1 });
UsageLogSchema.index({ correlationId: 1 });

