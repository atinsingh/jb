import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptVersionDocument = PromptVersion & Document;

@Schema({ timestamps: true })
export class PromptVersion {
  @Prop({ required: true, unique: true })
  promptKey: string; // e.g., "answers_pack_generation", "bullet_rewrite"

  @Prop({ required: true })
  version: string; // Semantic versioning: "1.0.0"

  @Prop({ required: true })
  prompt: string; // The actual prompt template

  @Prop()
  description?: string; // What changed in this version

  @Prop({ default: true })
  isActive?: boolean; // Currently active version

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // Variables, examples, etc.
}

export const PromptVersionSchema = SchemaFactory.createForClass(PromptVersion);

// Indexes
PromptVersionSchema.index({ promptKey: 1, isActive: 1 });
PromptVersionSchema.index({ promptKey: 1, version: 1 }, { unique: true });

