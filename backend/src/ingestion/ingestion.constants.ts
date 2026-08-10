/**
 * Shared enums and constants for the job ingestion platform.
 *
 * Single source of truth referenced by schemas, adapters, the pipeline, and the
 * admin API. Keeping these as const arrays (not TS enums) lets us reuse them
 * directly as Mongoose `enum` validators and class-validator `@IsIn` sets.
 */

/** How a source is technically acquired. Ordered by compliance preference. */
export const SOURCE_TYPES = [
  'official_api', // 1. official job-board/employer API
  'json_feed', // 2. partner JSON feed
  'xml_feed', // 2. partner XML feed
  'rss_feed', // 2. RSS/Atom feed
  'jsonld', // 3. Schema.org JobPosting JSON-LD
  'html_careerpage', // 4. approved public career page (allowlist-gated)
  'ats_connector', // 1. ATS (Greenhouse/Lever/Workday)
  'csv_import', // 5. CSV upload
  'manual_import', // 5. manual JSON/admin entry
  'employer_integration', // direct employer integration
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Which adapter implementation handles the source. */
export const ADAPTER_TYPES = [
  'json_feed',
  'xml_feed',
  'jsonld',
  'html_careerpage',
  'csv_import',
  'greenhouse',
  'manual',
] as const;
export type AdapterType = (typeof ADAPTER_TYPES)[number];

/**
 * Canonical job lifecycle. Legacy `jobs` docs (created before ingestion) default
 * to `published` so existing search behaviour is unchanged.
 */
export const JOB_LIFECYCLE = [
  'draft',
  'pending_validation',
  'pending_review',
  'published',
  'paused',
  'expired',
  'removed_at_source',
  'rejected',
  'archived',
  'duplicate',
] as const;
export type JobLifecycle = (typeof JOB_LIFECYCLE)[number];

/** Lifecycle states that are visible in candidate search. */
export const SEARCHABLE_LIFECYCLES: JobLifecycle[] = ['published'];

/** How a given job record entered the system. */
export const IMPORT_METHODS = [
  'official_api',
  'feed',
  'jsonld',
  'html',
  'csv',
  'manual',
  'employer_direct',
] as const;
export type ImportMethod = (typeof IMPORT_METHODS)[number];

/** Workplace arrangement. */
export const WORKPLACE_TYPES = ['onsite', 'hybrid', 'remote'] as const;
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];

/** Compensation period, normalized. */
export const SALARY_PERIODS = ['year', 'month', 'week', 'day', 'hour'] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

/** Provenance of an individual normalized field. */
export const PROVENANCE_ORIGINS = [
  'source', // verbatim from the source
  'normalization', // deterministic normalization rule
  'enrichment', // enrichment provider
  'ai', // AI inference (Phase 3)
  'manual', // admin correction
] as const;
export type ProvenanceOrigin = (typeof PROVENANCE_ORIGINS)[number];

/** Health/circuit state for a source. */
export const SOURCE_HEALTH = [
  'healthy',
  'degraded',
  'unhealthy',
  'unknown',
] as const;
export type SourceHealth = (typeof SOURCE_HEALTH)[number];

export const CIRCUIT_STATES = ['closed', 'open', 'half_open'] as const;
export type CircuitState = (typeof CIRCUIT_STATES)[number];

/** Compliance/approval status of a source. */
export const COMPLIANCE_STATUS = [
  'approved',
  'pending',
  'unsupported',
  'revoked',
] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUS)[number];

/** Run status. */
export const RUN_STATUS = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'partial',
] as const;
export type RunStatus = (typeof RUN_STATUS)[number];

/** Validation verdict. */
export const VALIDATION_VERDICT = ['pass', 'review', 'reject'] as const;
export type ValidationVerdict = (typeof VALIDATION_VERDICT)[number];

/** Moderation status once a human or rules engine has looked at a job. */
export const MODERATION_STATUS = [
  'auto_approved',
  'needs_review',
  'approved',
  'rejected',
] as const;
export type ModerationStatus = (typeof MODERATION_STATUS)[number];

/**
 * Values written to the existing `Job.source` enum. The legacy monitor values
 * (Greenhouse/Lever/Workday/LinkedIn/Indeed/Glassdoor/Manual) are preserved; we
 * add generic + first-party values so ingested and employer-bridged jobs are
 * representable without breaking existing writers.
 */
export const JOB_SOURCE_LABELS = [
  'LinkedIn',
  'Indeed',
  'Glassdoor',
  'Manual',
  'Greenhouse',
  'Lever',
  'Workday',
  'Jobocate', // first-party employer-posted job bridged into search
  'JSON Feed',
  'XML Feed',
  'RSS',
  'JSON-LD',
  'CSV',
  'Career Page',
  'Partner',
] as const;

/** Preferred-source ranking for deduplication (lower = wins). */
export const SOURCE_PRIORITY: Record<string, number> = {
  employer_direct: 0, // direct employer-posted
  employer_integration: 1, // verified employer integration
  official_api: 2, // official career page / ATS
  ats_connector: 2,
  json_feed: 3, // authorized partner feed
  xml_feed: 3,
  rss_feed: 3,
  jsonld: 4, // approved third-party structured data
  html_careerpage: 5,
  csv_import: 6,
  manual_import: 6,
};
