import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResumeDocument = Resume & Document;

@Schema({ timestamps: true })
export class Resume {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  template: string;

  @Prop({ default: 'Untitled Resume' })
  name: string;

  // Personal Information
  @Prop()
  fullName?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  location?: string;

  @Prop()
  website?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  github?: string;

  // Professional Summary
  @Prop()
  summary?: string;

  // Profile Summary (separate from summary)
  @Prop()
  profileSummary?: string;

  // Skills
  @Prop([{ type: String }])
  skills?: string[];

  // Work Experience
  @Prop([{
    title: String,
    company: String,
    location: String,
    startDate: String,
    endDate: String,
    current: Boolean,
    description: String,
    achievements: [String],
  }])
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
  }>;

  // Education
  @Prop([{
    degree: String,
    institution: String,
    location: String,
    startDate: String,
    endDate: String,
    gpa: String,
    description: String,
  }])
  education?: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
    description?: string;
  }>;

  // Certifications
  @Prop([{
    name: String,
    issuer: String,
    date: String,
    expiryDate: String,
    credentialId: String,
    credentialUrl: String,
  }])
  certifications?: Array<{
    name: string;
    issuer: string;
    date?: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;

  // Projects
  @Prop([{
    name: String,
    description: String,
    technologies: [String],
    url: String,
    startDate: String,
    endDate: String,
  }])
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;

  // Languages
  @Prop([{
    language: String,
    proficiency: String,
  }])
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;

  // Additional Sections (customizable)
  @Prop({ type: Object })
  customSections?: Record<string, any>;

  // PDF Generation
  @Prop()
  pdfUrl?: string;

  @Prop()
  pdfPath?: string;

  @Prop({ default: 1 })
  version: number;

  @Prop({
    type: Object,
    default: {
      color: '#000000',
      font: 'inter',
      spacing: 'normal', // compact, normal, loose
    }
  })
  theme: {
    color: string;
    font: string;
    spacing: string;
  };

  @Prop({ default: false })
  isDefault?: boolean;

  @Prop({ default: false })
  isPublic?: boolean;

  @Prop()
  publicUrl?: string;

  // Timestamps (automatically added by Mongoose with timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

