import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LLMUsageDocument = HydratedDocument<LLMUsage>;

@Schema({ timestamps: true, collection: 'llm_usage' })
export class LLMUsage {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  feature: string; // LLMFeature enum value

  @Prop({ required: true })
  provider: string; // 'openai', 'mock', 'anthropic', etc.

  @Prop({ required: true })
  model: string;

  @Prop({ required: true, default: 0 })
  promptTokens: number;

  @Prop({ required: true, default: 0 })
  completionTokens: number;

  @Prop({ required: true, default: 0 })
  totalTokens: number;

  @Prop({ required: true, default: 0 })
  cost: number; // Cost in USD

  @Prop({ required: true })
  requestId: string; // Unique identifier for this request

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // Additional metadata (feature-specific)

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  @Prop()
  periodStart: Date; // Start of billing/usage period

  @Prop()
  periodEnd: Date; // End of billing/usage period
}

export const LLMUsageSchema = SchemaFactory.createForClass(LLMUsage);

// Indexes for efficient queries
LLMUsageSchema.index({ userId: 1, feature: 1, timestamp: -1 });
LLMUsageSchema.index({ userId: 1, periodStart: 1, periodEnd: 1 });
LLMUsageSchema.index({ timestamp: -1 });

