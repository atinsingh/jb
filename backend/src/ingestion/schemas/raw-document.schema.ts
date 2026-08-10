import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type RawDocumentDocument = RawDocument & Document;

/**
 * Raw fetched payload + provenance (spec §4). Kept OUT of the hot `jobs`
 * collection. A TTL index on `expiresAt` enforces retention automatically so raw
 * payloads are not stored indefinitely; `expiresAt` is stamped from the source's
 * rawRetentionDays at write time.
 */
@Schema({ timestamps: true, collection: 'rawdocuments' })
export class RawDocument {
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

  @Prop({ required: true, index: true })
  correlationId: string;

  @Prop({ required: false })
  sourceJobKey?: string; // the source's own identifier for the item

  @Prop({ required: false })
  requestUrl?: string;

  @Prop({ required: false })
  httpStatus?: number;

  @Prop({ required: false })
  contentType?: string;

  @Prop({ required: true, index: true })
  checksum: string; // sha256 of the raw payload — dedupes re-fetches

  @Prop({ required: false })
  parserVersion?: string;

  @Prop({ required: false })
  adapterVersion?: string;

  // The raw payload. For large HTML this is the sanitized/truncated body; the
  // TTL index keeps it from accumulating.
  @Prop({ required: false })
  payload?: string;

  @Prop({ default: 'stored' })
  processingStatus?: string; // 'stored' | 'parsed' | 'failed'

  @Prop({ type: [String], default: [] })
  processingErrors?: string[];

  // TTL anchor — Mongo removes the doc automatically once this time passes.
  @Prop({ required: true })
  expiresAt: Date;
}

export const RawDocumentSchema = SchemaFactory.createForClass(RawDocument);

// TTL index: expire exactly at `expiresAt` (expireAfterSeconds: 0).
RawDocumentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RawDocumentSchema.index({ sourceId: 1, checksum: 1 });
