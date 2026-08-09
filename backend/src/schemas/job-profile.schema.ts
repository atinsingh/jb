import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type JobProfileDocument = JobProfile & Document;

export enum JobType {
  HYBRID = 'hybrid',
  ONSITE = 'onsite',
  REMOTE = 'remote',
}

@Schema({ timestamps: true })
export class JobProfile {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  profileName: string;

  @Prop()
  role?: string;

  @Prop()
  level?: string; // entry, junior, mid, senior, lead, principal, staff, director

  @Prop()
  location?: string;

  @Prop({ enum: JobType, default: JobType.REMOTE })
  jobType?: JobType;

  @Prop({ type: Number })
  salaryMin?: number;

  @Prop({ type: Number })
  salaryMax?: number;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({
    type: [
      {
        title: String,
        company: String,
        duration: String,
        description: String,
      },
    ],
    default: [],
  })
  experience?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;

  @Prop({
    type: [
      {
        degree: String,
        institution: String,
        year: String,
      },
    ],
    default: [],
  })
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;

  @Prop({ type: [String], default: [] })
  preferredLocations?: string[];

  /**
   * ISO2 country codes this profile is TARGETING — where the candidate wants to
   * work. Distinct from `UserPreferences.country` (where they currently are) and
   * from `UserPreferences.workAuthCountries` (where they may legally work).
   *
   * Drives the Stage-1a geo pre-filter and gates auto-apply. Empty means "fall
   * back to the candidate's current country" (see `resolveTargetCountries`), so
   * existing profiles keep their current behaviour until a target is set.
   */
  @Prop({ type: [String], default: [] })
  targetCountries?: string[];

  @Prop({ type: [String], default: [] })
  preferredJobTypes?: string[];

  @Prop({ default: false })
  active?: boolean;

  @Prop({ default: false })
  complete?: boolean;

  @Prop()
  resumePath?: string;

  @Prop()
  resumeText?: string;

  @Prop({ default: 75 })
  minMatchScore?: number;

  @Prop({ default: false })
  autoApply?: boolean;
}

export const JobProfileSchema = SchemaFactory.createForClass(JobProfile);

// Index for efficient queries
JobProfileSchema.index({ userId: 1, active: 1 });

