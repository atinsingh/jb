import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ApplicationArtifactDocument = ApplicationArtifact & Document;

export enum ArtifactType {
  RESUME_VERSION = 'resume_version',
  COVER_LETTER_VERSION = 'cover_letter_version',
  ANSWERS_PACK = 'answers_pack',
}

@Schema({ timestamps: true })
export class ApplicationArtifact {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Application', required: true, index: true })
  applicationId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ArtifactType })
  type: ArtifactType;

  @Prop({ required: true })
  content: string; // JSON string for answers_pack, text for others

  @Prop()
  version?: number; // Version number for resume/cover letter

  @Prop()
  fileName?: string; // For resume/cover letter files

  @Prop()
  fileUrl?: string; // URL to stored file

  @Prop({ default: false })
  isActive?: boolean; // Currently active version

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // Additional metadata
}

export const ApplicationArtifactSchema = SchemaFactory.createForClass(ApplicationArtifact);

// Indexes
ApplicationArtifactSchema.index({ applicationId: 1, type: 1 });
ApplicationArtifactSchema.index({ userId: 1, type: 1 });
ApplicationArtifactSchema.index({ applicationId: 1, isActive: 1 });

