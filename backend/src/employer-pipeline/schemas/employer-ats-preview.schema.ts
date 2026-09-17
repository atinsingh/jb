import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type EmployerAtsPreviewDocument = HydratedDocument<EmployerAtsPreview>;

@Schema({ timestamps: true, collection: 'employer_ats_previews' })
export class EmployerAtsPreview {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'User' })
  ownerId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'EmployerJob' })
  jobId: Types.ObjectId;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  resumeText: string;

  @Prop({ required: true })
  resumeHash: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  assessment?: Record<string, unknown>;
}

export const EmployerAtsPreviewSchema = SchemaFactory.createForClass(EmployerAtsPreview);
EmployerAtsPreviewSchema.index({ ownerId: 1, jobId: 1 }, { unique: true });
