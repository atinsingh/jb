import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import {
  JOB_LIFECYCLE,
  JOB_SOURCE_LABELS,
  IMPORT_METHODS,
  WORKPLACE_TYPES,
  SALARY_PERIODS,
  MODERATION_STATUS,
} from '../ingestion/ingestion.constants';

export type JobDocument = Job & Document;

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ default: 'Not specified' })
  location?: string;

  // ---- Structured geography (derived by the geography engine) ------------
  @Prop({ index: true })
  country?: string; // ISO2 primary work country

  @Prop()
  region?: string; // state/province/city label

  @Prop()
  city?: string;

  @Prop({ index: true })
  workplaceType?: string; // ONSITE | HYBRID | REMOTE | FIELD_BASED | UNSPECIFIED

  @Prop({ index: true })
  remoteScope?: string; // COUNTRY_ONLY | MULTI_COUNTRY | GLOBAL | UNSPECIFIED | ...

  @Prop({ type: [String], default: [], index: true })
  eligibleCountries?: string[]; // ISO2; empty + GLOBAL scope means anywhere

  @Prop({ type: [String], default: [] })
  excludedCountries?: string[];

  @Prop()
  sponsorship?: string; // AVAILABLE | NOT_AVAILABLE | CASE_BY_CASE | NOT_SPECIFIED

  @Prop({ type: Number })
  locationConfidence?: number; // 0..1

  @Prop({ default: false })
  needsGeoReview?: boolean;

  @Prop({ default: '' })
  geoEvidence?: string;

  // ---- Employer branding ------------------------------------------------
  @Prop({ default: '' })
  companyLogo?: string; // logo URL (frontend falls back to initials)

  @Prop({ default: '' })
  description?: string;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: [String], default: [] })
  requirements?: string[];

  @Prop({ default: 'Not specified' })
  salary?: string;

  @Prop({
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
    default: 'Full-time',
  })
  jobType?: string;

  @Prop({ default: 'Not specified' })
  experience?: string;

  @Prop({ enum: JOB_SOURCE_LABELS, required: true })
  source: string;

  @Prop({ default: '' })
  externalUrl?: string;

  @Prop({ default: '' })
  canonicalUrl?: string; // Normalized URL for deduplication

  // sparse so multiple jobs may legitimately have no externalId (manual/employer
  // bridged) without colliding on the unique index. The ingestion pipeline always
  // assigns a deterministic externalId, so upserts stay idempotent.
  @Prop({ unique: true, sparse: true, required: false })
  externalId?: string; // Made optional for manual entries

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, index: true })
  addedBy?: Types.ObjectId; // User who added this job manually

  @Prop({ default: false })
  isManualEntry?: boolean; // True if manually added/edited by user

  @Prop({ default: true })
  isActive?: boolean;

  @Prop({ default: Date.now })
  scrapedAt?: Date;

  // ---------------------------------------------------------------------------
  // Ingestion platform fields (all additive/optional; legacy docs keep working).
  // ---------------------------------------------------------------------------

  // -- Identity & provenance --
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'IngestionSource', required: false, index: true })
  sourceId?: Types.ObjectId; // which registered source produced this job

  @Prop({ required: false })
  sourceJobKey?: string; // the source's own id for the listing

  @Prop({ default: '' })
  sourceUrl?: string; // the listing page on the source

  @Prop({ default: '' })
  originalApplyUrl?: string; // where the candidate actually applies

  @Prop({ required: false })
  contentFingerprint?: string; // stable hash of company+title+location(+desc) for dedup

  @Prop({ required: false })
  firstDiscoveredAt?: Date;

  @Prop({ required: false })
  lastVerifiedAt?: Date; // last time the listing was confirmed live

  @Prop({ required: false })
  sourcePostedAt?: Date;

  @Prop({ required: false })
  sourceExpiresAt?: Date;

  @Prop({ required: false })
  internalExpiresAt?: Date; // our own max-age expiry when source gives none (indexed below)

  // -- Lifecycle --
  @Prop({ enum: JOB_LIFECYCLE, default: 'published', index: true })
  lifecycle?: string; // legacy docs default to 'published'

  @Prop({ default: false })
  isExternal?: boolean; // true = aggregated; false = posted directly on Jobocate

  @Prop({ enum: IMPORT_METHODS, required: false })
  importMethod?: string;

  @Prop({ default: '' })
  attributionText?: string; // e.g. "via Example Careers"

  @Prop({ required: false })
  removalReason?: string;

  // -- Structured location (workplaceType/region/country defined above by the
  //    geography engine; these remain for ingestion-pipeline compatibility) --
  @Prop({ default: false })
  isRemote?: boolean;

  @Prop({ required: false })
  normalizedCity?: string;

  // -- Structured compensation (alongside the existing `salary` string) --
  @Prop({ required: false })
  salaryMin?: number;

  @Prop({ required: false })
  salaryMax?: number;

  @Prop({ required: false })
  salaryCurrency?: string;

  @Prop({ enum: SALARY_PERIODS, required: false })
  salaryPeriod?: string;

  @Prop({ default: false })
  salaryDisclosed?: boolean; // true only when the SOURCE provided it

  @Prop({ default: false })
  salaryEstimated?: boolean; // true when inferred — never shown as employer-provided

  // -- Normalization / employer --
  @Prop({ required: false })
  normalizedTitle?: string;

  @Prop({ required: false })
  normalizedCompanyName?: string;

  @Prop({ required: false })
  employerDomain?: string;

  @Prop({ default: false })
  verifiedEmployer?: boolean;

  @Prop({ type: [String], default: [] })
  preferredSkills?: string[];

  @Prop({ enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'], required: false })
  employmentType?: string; // normalized; mirrors jobType with canonical values

  @Prop({ required: false })
  seniority?: string; // normalized seniority band

  // -- Quality / dedup / moderation --
  @Prop({ required: false })
  qualityScore?: number; // 0-100

  @Prop({ type: Object, required: false })
  qualityExplanation?: Record<string, unknown>; // human-readable score breakdown

  @Prop({ required: false })
  confidenceScore?: number; // 0-1 overall parse confidence

  @Prop({ required: false })
  duplicateGroupId?: string; // indexed below

  @Prop({ enum: MODERATION_STATUS, required: false })
  moderationStatus?: string;

  @Prop({ type: [Object], default: [] })
  validationResults?: Array<Record<string, unknown>>;

  // Per-field provenance: fieldName -> origin ('source'|'normalization'|'ai'|...).
  @Prop({ type: Object, default: {} })
  provenance?: Record<string, string>;

  @Prop({ default: 0 })
  verificationFailures?: number; // consecutive failed freshness checks
}

export const JobSchema = SchemaFactory.createForClass(Job);

// --- Text & legacy indexes (unchanged) ---
JobSchema.index({ title: 'text', description: 'text', companyName: 'text' });
JobSchema.index({ skills: 1 });
JobSchema.index({ location: 1 });

// --- Ingestion indexes (§17) ---
JobSchema.index({ sourceId: 1, externalId: 1 });
JobSchema.index({ contentFingerprint: 1 });
JobSchema.index({ companyName: 1, normalizedTitle: 1, location: 1 });
JobSchema.index({ lifecycle: 1, isActive: 1 });
JobSchema.index({ internalExpiresAt: 1 });
JobSchema.index({ lastVerifiedAt: 1 });
JobSchema.index({ duplicateGroupId: 1 });
JobSchema.index({ isExternal: 1, lifecycle: 1 });
