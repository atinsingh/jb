import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LLMAuditLogDocument = LLMAuditLog & Document;

@Schema({ timestamps: true })
export class LLMAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  feature: string; // Feature name: "answers_pack", "bullet_rewrite", etc.

  @Prop({ required: true })
  promptKey: string; // Key to identify the prompt template

  @Prop({ required: true })
  promptVersion: string; // Version of the prompt used

  @Prop({ required: true })
  prompt: string; // Full prompt sent to LLM

  @Prop({ required: true })
  model: string; // Model used (e.g., "gpt-4o-mini")

  @Prop({ required: true })
  provider: string; // Provider used (e.g., "openai", "anthropic")

  @Prop({ required: true, default: 0 })
  promptTokens: number;

  @Prop({ required: true, default: 0 })
  completionTokens: number;

  @Prop({ required: true, default: 0 })
  totalTokens: number;

  @Prop({ required: true, default: 0 })
  cost: number; // Cost in USD

  @Prop()
  response?: string; // LLM response (may be truncated for large responses)

  @Prop()
  requestId?: string; // Unique request identifier

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // Additional context
}

export const LLMAuditLogSchema = SchemaFactory.createForClass(LLMAuditLog);

// Indexes
LLMAuditLogSchema.index({ userId: 1, feature: 1, createdAt: -1 });
LLMAuditLogSchema.index({ promptKey: 1, promptVersion: 1 });
LLMAuditLogSchema.index({ createdAt: -1 });

