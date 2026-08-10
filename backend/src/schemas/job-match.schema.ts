import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type JobMatchDocument = JobMatch & Document;

@Schema({ timestamps: true })
export class JobMatch {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Job', required: true })
  jobId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'JobProfile', required: false })
  profileId?: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 100 })
  matchScore: number;

  @Prop({ type: [String], default: [] })
  matchedSkills?: string[];

  @Prop({ type: [String], default: [] })
  missingSkills?: string[];

  @Prop({ default: '' })
  reasoning?: string;

  @Prop({ default: false })
  isInterested?: boolean;

  @Prop({
    enum: ['interested', 'not_interested', 'not_a_match', 'pending'],
    default: 'pending',
  })
  interestStatus?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  assignedAgentId?: Types.ObjectId; // Human or AI agent assigned

  @Prop({ enum: ['ai', 'human'], required: false })
  agentType?: string;

  @Prop()
  assignedAt?: Date;

  @Prop()
  viewedAt?: Date;

  @Prop()
  appliedAt?: Date;
}

export const JobMatchSchema = SchemaFactory.createForClass(JobMatch);

// Add indexes
JobMatchSchema.index({ userId: 1, jobId: 1, profileId: 1 }, { unique: true });
JobMatchSchema.index({ matchScore: -1 });
JobMatchSchema.index({ isInterested: 1 });
JobMatchSchema.index({ interestStatus: 1 });
JobMatchSchema.index({ profileId: 1 });
JobMatchSchema.index({ assignedAgentId: 1 });
JobMatchSchema.index({ userId: 1, interestStatus: 1 });

