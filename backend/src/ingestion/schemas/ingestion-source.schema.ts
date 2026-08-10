import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  SOURCE_TYPES,
  ADAPTER_TYPES,
  SOURCE_HEALTH,
  CIRCUIT_STATES,
  COMPLIANCE_STATUS,
} from '../ingestion.constants';

export type IngestionSourceDocument = IngestionSource & Document;

/**
 * The Source Registry (spec §1). One document per approved job source.
 *
 * Sources are PLATFORM-LEVEL (no ownerId) — they are managed by admins and shared
 * across the whole marketplace, unlike the ownerId-scoped employer resources.
 *
 * Credentials are NEVER stored here. `authConfigRef` holds the NAME of an env var
 * / secret key (resolved at run time via ConfigService), so the DB and API never
 * contain a secret value.
 */
@Schema({ timestamps: true, collection: 'ingestionsources' })
export class IngestionSource {
  @Prop({ required: true, unique: true, trim: true })
  sourceId: string; // stable human key, e.g. "acme-jsonld"

  @Prop({ required: true })
  name: string;

  @Prop({ enum: SOURCE_TYPES, required: true })
  sourceType: string;

  @Prop({ enum: ADAPTER_TYPES, required: true })
  adapterType: string;

  @Prop({ default: '' })
  baseUrl?: string;

  @Prop({ default: '' })
  endpoint?: string; // API/feed endpoint

  // Name of the env/secret key holding credentials — NOT the secret itself.
  @Prop({ default: '' })
  authConfigRef?: string;

  // -- Markets / language --
  @Prop({ type: [String], default: [] })
  countries?: string[];

  @Prop({ default: 'en' })
  defaultLanguage?: string;

  // -- Governance / compliance --
  @Prop({ default: false })
  enabled?: boolean; // disabled by default; admin must turn on

  @Prop({ enum: COMPLIANCE_STATUS, default: 'pending' })
  complianceStatus?: string;

  @Prop({ default: '' })
  termsRef?: string; // link/reference to terms or written permission

  @Prop({ default: '' })
  attributionText?: string; // required attribution string, stamped on every job

  @Prop({ default: true })
  respectRobotsTxt?: boolean;

  // -- Scheduling / rate control --
  @Prop({ default: 60 })
  pollIntervalMinutes?: number;

  @Prop({ default: 60 })
  rateLimitPerMinute?: number;

  @Prop({ default: 2 })
  maxConcurrency?: number;

  @Prop({ default: 15000 })
  requestTimeoutMs?: number;

  @Prop({ type: Object, default: { maxRetries: 3, backoffMs: 1000 } })
  retryPolicy?: { maxRetries: number; backoffMs: number };

  // Adapter-specific parse config (field mappings, selectors, board tokens, etc.)
  @Prop({ type: Object, default: {} })
  parseConfig?: Record<string, unknown>;

  // -- Retention / expiry policy --
  @Prop({ default: 30 })
  rawRetentionDays?: number;

  @Prop({ default: 30 })
  jobMaxAgeDays?: number; // internal expiry when source gives no expiration

  // -- Priority / trust --
  @Prop({ default: 100 })
  priority?: number; // lower = scheduled sooner

  @Prop({ default: 0.5, min: 0, max: 1 })
  trustScore?: number; // feeds quality scoring & dedup preference

  // -- Health / operational state --
  @Prop({ enum: SOURCE_HEALTH, default: 'unknown' })
  health?: string;

  @Prop({ enum: CIRCUIT_STATES, default: 'closed' })
  circuitState?: string;

  @Prop({ default: 0 })
  failureCount?: number; // consecutive failures (drives circuit breaker)

  @Prop({ required: false })
  circuitOpenedAt?: Date;

  @Prop({ required: false })
  lastSuccessfulRunAt?: Date;

  @Prop({ required: false })
  lastAttemptedRunAt?: Date;

  @Prop({ default: '' })
  lastCheckpoint?: string; // incremental sync cursor (page token / since timestamp)

  @Prop({ default: false })
  emergencyStopped?: boolean; // manual kill-switch, overrides `enabled`

  @Prop({ required: false })
  createdByUserId?: string;
}

export const IngestionSourceSchema =
  SchemaFactory.createForClass(IngestionSource);

IngestionSourceSchema.index({ enabled: 1, complianceStatus: 1 });
IngestionSourceSchema.index({ priority: 1 });
IngestionSourceSchema.index({ health: 1 });
