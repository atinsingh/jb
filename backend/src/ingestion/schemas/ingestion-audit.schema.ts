import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IngestionAuditEventDocument = IngestionAuditEvent & Document;

/**
 * Platform-level audit log for ingestion administration (spec §14, §15).
 *
 * Deliberately separate from EmployerAuditService, which is hard-scoped to an
 * employer ownerId. Ingestion actions are performed by platform admins against
 * global resources, so they need their own, non-owner-scoped trail.
 */
@Schema({ timestamps: true, collection: 'ingestionauditevents' })
export class IngestionAuditEvent {
  @Prop({ required: true, index: true })
  actorUserId: string; // admin who performed the action

  @Prop({ required: false })
  actorEmail?: string;

  @Prop({ required: true, index: true })
  action: string; // e.g. 'source.create', 'source.disable', 'run.trigger', 'job.reject'

  @Prop({ required: false })
  targetType?: string; // 'source' | 'run' | 'job'

  @Prop({ required: false, index: true })
  targetId?: string;

  @Prop({ default: '' })
  reason?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ required: false })
  ip?: string;

  @Prop({ required: false })
  correlationId?: string;
}

export const IngestionAuditEventSchema =
  SchemaFactory.createForClass(IngestionAuditEvent);

IngestionAuditEventSchema.index({ createdAt: -1 });
IngestionAuditEventSchema.index({ action: 1, createdAt: -1 });
