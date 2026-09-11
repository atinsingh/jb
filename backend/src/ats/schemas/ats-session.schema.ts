import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AtsSessionDocument = HydratedDocument<AtsSession>;

export type AtsSessionStatus = 'ready' | 'running' | 'completed' | 'ended' | 'failed';

@Schema({ timestamps: true, collection: 'ats_sessions' })
export class AtsSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ResumeHarnessSession', required: true, index: true })
  resumeSessionId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  sourceRevision: number;

  @Prop({ required: true, maxlength: 20000 })
  jobDescription: string;

  @Prop({ required: true })
  jobDescriptionHash: string;

  @Prop({ required: true })
  harness: string;

  @Prop({ required: true })
  alias: string;

  @Prop({ required: true, enum: ['ready', 'running', 'completed', 'ended', 'failed'], default: 'ready' })
  status: AtsSessionStatus;

  @Prop({ type: Number })
  semanticMatch?: number;

  @Prop({ type: Object })
  subScores?: {
    keywordMatch: number;
    skillsCoverage: number;
    sectionCompleteness: number;
  };

  @Prop({ type: [String], default: [] })
  keywordGaps?: string[];

  @Prop({ type: [String], default: [] })
  injectableKeywords?: string[];

  @Prop({ type: [String], default: [] })
  suggestions?: string[];

  @Prop()
  unavailableReason?: string;

  @Prop()
  analyzedAt?: Date;

  @Prop()
  endedAt?: Date;
}

export const AtsSessionSchema = SchemaFactory.createForClass(AtsSession);
AtsSessionSchema.index({ userId: 1, resumeSessionId: 1, createdAt: -1 });
