import { IngestionSourceDocument } from '../schemas/ingestion-source.schema';
import { FetcherService } from '../pipeline/fetcher.service';

/**
 * Source adapter contract (spec §2).
 *
 * An adapter's single responsibility is: given a registered source (+ optional
 * uploaded payload for CSV/manual), acquire and parse listings into the common
 * `ParsedJob` shape. Everything downstream — normalization, validation, dedup,
 * quality, publish — is handled by separate pipeline services, so each stage is
 * independently testable. New sources are added by implementing this interface
 * and registering it in adapter.registry.ts; the core pipeline never changes.
 */

/** Common, pre-normalization job shape emitted by every adapter. */
export interface ParsedJob {
  sourceJobKey: string; // source's own id for the listing (required, drives idempotency)
  title?: string;
  company?: string;
  companyDomain?: string;
  location?: string;
  descriptionHtml?: string; // raw (unsanitized) HTML — sanitized by the pipeline
  applyUrl?: string; // where the candidate applies (may be external)
  sourceUrl?: string; // the listing page on the source
  postedAt?: string | Date;
  expiresAt?: string | Date;
  employmentType?: string; // source-flavored, normalized later
  workplaceType?: string; // source-flavored
  remote?: boolean;
  seniority?: string;
  salaryText?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  skills?: string[];
  requirements?: string[];
  language?: string;
  raw?: Record<string, unknown>; // original item for provenance/debug
}

/** A raw payload captured during a run, persisted for provenance/reprocess (§4). */
export interface RawPayloadRecord {
  sourceJobKey?: string;
  requestUrl?: string;
  httpStatus?: number;
  contentType?: string;
  checksum: string;
  payload: string;
}

/** Structured, non-throwing adapter error (§2 "return structured errors"). */
export interface AdapterError {
  category: 'permanent' | 'transient' | 'validation';
  stage: string;
  message: string;
  sourceJobKey?: string;
}

/** Result of a single adapter run. */
export interface AdapterRunResult {
  items: ParsedJob[];
  rawPayloads: RawPayloadRecord[];
  errors: AdapterError[];
  pagesFetched: number;
  discovered: number;
  nextCheckpoint?: string; // incremental cursor for the next run
  /** External keys still present at source this run — used to detect removals. */
  presentKeys?: string[];
  complete?: boolean; // false if the run was truncated (backpressure / caps)
}

/** Everything an adapter needs to execute. */
export interface AdapterContext {
  source: IngestionSourceDocument;
  fetcher: FetcherService;
  correlationId: string;
  checkpoint?: string;
  /** For CSV/manual adapters: the uploaded body. */
  uploadedContent?: string;
  /** Hard cap on items produced this run (backpressure). */
  maxItems?: number;
  /** Cooperative cancellation — adapters should check between pages. */
  isCancelled?: () => boolean;
}

export interface ConfigValidation {
  valid: boolean;
  errors: string[];
}

export interface AvailabilityResult {
  available: boolean;
  detail?: string;
}

export interface SourceAdapter {
  /** Must match an AdapterType and the source's adapterType. */
  readonly type: string;
  /** Bumped when parsing logic changes; stored on raw docs for reprocessing. */
  readonly version: string;

  /** Static config validation (no network). */
  validateConfig(source: IngestionSourceDocument): ConfigValidation;

  /** Lightweight liveness probe (may hit the network). */
  checkAvailability(ctx: AdapterContext): Promise<AvailabilityResult>;

  /** Acquire + parse + transform into ParsedJob[]. The core of the adapter. */
  run(ctx: AdapterContext): Promise<AdapterRunResult>;
}
