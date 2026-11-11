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

  createdAt?: Date;
}

export const EmployerAtsPreviewSchema = SchemaFactory.createForClass(EmployerAtsPreview);
EmployerAtsPreviewSchema.index({ ownerId: 1, jobId: 1, createdAt: -1 });

// Older deploys created a unique ownerId+jobId index. A second upload for the same job is a new session.
export function staleUniquePreviewIndex(
  indexes: { name?: string; unique?: boolean; key?: Record<string, unknown> }[],
): string | null {
  const stale = indexes.find((index) =>
    index.unique === true
    && index.key?.ownerId === 1
    && index.key?.jobId === 1
    && index.key.createdAt == null,
  );
  return stale?.name || null;
}
