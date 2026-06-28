import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StoryBankDocument = StoryBank & Document;

export interface STAREntry {
  situation: string;
  task: string;
  action: string;
  result: string;
}

@Schema({ timestamps: true })
export class StoryBank {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({
    type: {
      situation: String,
      task: String,
      action: String,
      result: String,
    },
    required: true,
  })
  star: STAREntry;

  @Prop({ type: [String], default: [] })
  competencies: string[]; // e.g., "Leadership", "Problem Solving", "Teamwork"

  @Prop({ type: [String], default: [] })
  skills: string[]; // Related skills

  @Prop({ type: [String], default: [] })
  tags: string[]; // Custom tags for organization

  @Prop({ default: false })
  isFavorite?: boolean;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const StoryBankSchema = SchemaFactory.createForClass(StoryBank);

// Indexes
StoryBankSchema.index({ userId: 1, competencies: 1 });
StoryBankSchema.index({ userId: 1, skills: 1 });
StoryBankSchema.index({ userId: 1, isFavorite: 1 });
StoryBankSchema.index({ userId: 1, createdAt: -1 });

