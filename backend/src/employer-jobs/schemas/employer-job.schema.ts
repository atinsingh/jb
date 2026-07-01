import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployerJobDocument = EmployerJob & Document;

@Schema({ timestamps: true })
export class EmployerJob {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ default: '' })
  companyName?: string;

  @Prop({ required: true })
  title: string;

  @Prop({
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time',
  })
  type?: string;

  @Prop({ default: '' })
  location?: string;

  @Prop({ default: false })
  isRemote?: boolean;

  @Prop()
  salaryMin?: number;

  @Prop()
  salaryMax?: number;

  @Prop({ enum: ['year', 'hour'], default: 'year' })
  salaryPeriod?: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ type: [String], default: [] })
  responsibilities?: string[];

  @Prop({ type: [String], default: [] })
  requirements?: string[];

  @Prop({ type: [String], default: [] })
  benefits?: string[];

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({
    type: [
      {
        question: String,
        type: String,
        required: Boolean,
      },
    ],
    default: [],
  })
  screeningQuestions?: Array<{
    question: string;
    type?: string;
    required?: boolean;
  }>;

  @Prop({
    enum: ['draft', 'active', 'paused', 'closed'],
    default: 'draft',
    index: true,
  })
  status?: string;

  @Prop({ enum: ['public', 'private'], default: 'public' })
  visibility?: string;

  @Prop({ default: 0 })
  views?: number;

  @Prop({ default: 0 })
  applicantCount?: number;
}

export const EmployerJobSchema = SchemaFactory.createForClass(EmployerJob);

// Add indexes
EmployerJobSchema.index({ ownerId: 1 });
EmployerJobSchema.index({ status: 1 });
EmployerJobSchema.index({ ownerId: 1, status: 1 });
