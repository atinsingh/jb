import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { RUN_STATUS } from '../ingestion.constants';

export type IngestionRunDocument = IngestionRun & Document;

/**
 * One execution of a source (spec §10 / §14 Run Details). Provides the audit
 * trail, metrics, and checkpoint needed for idempotent resumable ingestion.
 */
@Schema({ timestamps: true, collection: 'ingestionruns' })
export class IngestionRun {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'IngestionSource',
    required: true,
    index: true,
  })
  sourceId: Types.ObjectId;

  @Prop({ required: true })
  sourceKey: string; // denormalized IngestionSource.sourceId for readability

  @Prop({ required: true, unique: true })
  correlationId: string; // ties logs + jobs to this run

  @Prop({ enum: RUN_STATUS, default: 'queued', index: true })
  status: string;

  @Prop({ default: 'scheduled' })
  trigger?: string; // 'scheduled' | 'manual' | 'reprocess'

  @Prop({ required: false })
  startedAt?: Date;

  @Prop({ required: false })
  finishedAt?: Date;

  // -- Counters (§14) --
  @Prop({ default: 0 }) pagesFetched?: number;
  @Prop({ default: 0 }) itemsDiscovered?: number;
  @Prop({ default: 0 }) jobsCreated?: number;
  @Prop({ default: 0 }) jobsUpdated?: number;
  @Prop({ default: 0 }) jobsSkipped?: number;
  @Prop({ default: 0 }) jobsRejected?: number;
  @Prop({ default: 0 }) jobsReview?: number;
  @Prop({ default: 0 }) duplicatesDetected?: number;
  @Prop({ default: 0 }) retryCount?: number;
  @Prop({ default: 0 }) deadLettered?: number;

  // -- Latency (ms) --
  @Prop({ default: 0 }) fetchMs?: number;
  @Prop({ default: 0 }) processMs?: number;

  @Prop({ default: '' })
  checkpoint?: string; // resumable cursor written at end of run

  // Named `runErrors` (not `errors`) — `errors` is a reserved Mongoose Document path.
  @Prop({ type: [Object], default: [] })
  runErrors?: Array<{ category: string; message: string; at?: Date }>;

  @Prop({ default: false })
  cancelRequested?: boolean; // cooperative cancellation flag
}

export const IngestionRunSchema = SchemaFactory.createForClass(IngestionRun);

IngestionRunSchema.index({ sourceId: 1, createdAt: -1 });
IngestionRunSchema.index({ status: 1, createdAt: -1 });
