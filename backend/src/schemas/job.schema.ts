import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JobDocument = Job & Document;

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ default: 'Not specified' })
  location?: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: [String], default: [] })
  requirements?: string[];

  @Prop({ default: 'Not specified' })
  salary?: string;

  @Prop({
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
    default: 'Full-time',
  })
  jobType?: string;

  @Prop({ default: 'Not specified' })
  experience?: string;

  @Prop({ enum: ['LinkedIn', 'Indeed', 'Glassdoor', 'Manual', 'Greenhouse', 'Lever', 'Workday'], required: true })
  source: string;

  @Prop({ default: '' })
  externalUrl?: string;

  @Prop({ default: '' })
  canonicalUrl?: string; // Normalized URL for deduplication

  @Prop({ unique: true, required: false })
  externalId?: string; // Made optional for manual entries

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  addedBy?: Types.ObjectId; // User who added this job manually

  @Prop({ default: false })
  isManualEntry?: boolean; // True if manually added/edited by user

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ default: Date.now })
  scrapedAt?: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Add indexes
JobSchema.index({ title: 'text', description: 'text', companyName: 'text' });
JobSchema.index({ skills: 1 });
JobSchema.index({ location: 1 });
