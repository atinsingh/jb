import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IngestionLockDocument = IngestionLock & Document;

/**
 * Distributed lock via a unique index (spec §10 "distributed locks").
 *
 * Acquiring a lock = inserting a doc with a unique `key`; the unique-index
 * constraint guarantees only one holder even across processes. A TTL index on
 * `expiresAt` auto-releases stale locks if a holder crashes without cleanup, so
 * a dead worker can never permanently block a source.
 */
@Schema({ timestamps: true, collection: 'ingestionlocks' })
export class IngestionLock {
  @Prop({ required: true, unique: true })
  key: string; // e.g. "run:<sourceKey>"

  @Prop({ required: true })
  holder: string; // correlationId / process id of the holder

  @Prop({ required: true })
  expiresAt: Date; // TTL auto-release
}

export const IngestionLockSchema = SchemaFactory.createForClass(IngestionLock);

IngestionLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
