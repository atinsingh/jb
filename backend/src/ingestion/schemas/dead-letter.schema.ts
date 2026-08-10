import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type DeadLetterDocument = DeadLetter & Document;

/**
 * Dead-letter store (spec §10). An item that exhausts its retries — or hits a
 * permanent failure (invalid config, unauthorized) — is parked here rather than
 * retried forever. Admins can inspect and reprocess from here.
 */
@Schema({ timestamps: true, collection: 'ingestiondeadletters' })
export class DeadLetter {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'IngestionSource',
    required: true,
    index: true,
  })
  sourceId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'IngestionRun',
    required: false,
    index: true,
  })
  runId?: Types.ObjectId;

  @Prop({ required: false })
  correlationId?: string;

  @Prop({ required: false })
  sourceJobKey?: string;

  @Prop({ required: true })
  stage: string; // pipeline stage that failed: fetch|parse|normalize|validate|publish

  @Prop({ required: true })
  errorCategory: string; // 'permanent' | 'transient' | 'validation'

  @Prop({ required: true })
  errorMessage: string;

  @Prop({ type: Object, required: false })
  itemSnapshot?: Record<string, unknown>; // enough to reprocess

  @Prop({ default: 0 })
  attempts?: number;

  @Prop({ default: false })
  reprocessed?: boolean;
}

export const DeadLetterSchema = SchemaFactory.createForClass(DeadLetter);

DeadLetterSchema.index({ sourceId: 1, reprocessed: 1, createdAt: -1 });
