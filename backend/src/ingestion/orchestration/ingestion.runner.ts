import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AppLoggerService } from '../../common/logger/logger.service';
import { Job, JobDocument } from '../../schemas/job.schema';
import {
  IngestionSource,
  IngestionSourceDocument,
} from '../schemas/ingestion-source.schema';
import { IngestionRun, IngestionRunDocument } from '../schemas/ingestion-run.schema';
import { RawDocument, RawDocumentDocument } from '../schemas/raw-document.schema';
import { DeadLetter, DeadLetterDocument } from '../schemas/dead-letter.schema';
import { IngestionLock, IngestionLockDocument } from '../schemas/ingestion-lock.schema';
import { AdapterRegistry } from '../adapters/adapter.registry';
import { FetcherService } from '../pipeline/fetcher.service';
import { NormalizerService } from '../pipeline/normalizer.service';
import { ValidatorService } from '../pipeline/validator.service';
import { DedupService } from '../pipeline/dedup.service';
import { QualityService } from '../pipeline/quality.service';
import { PublisherService } from '../pipeline/publisher.service';
import { IngestionMetricsService } from './metrics.service';
import { AdapterRunResult } from '../adapters/adapter.interface';

export interface RunOptions {
  trigger?: string; // 'scheduled' | 'manual' | 'reprocess'
  uploadedContent?: string; // CSV/manual upload
  force?: boolean; // bypass enabled/circuit gates (admin manual run)
}

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 15 * 60 * 1000;
const LOCK_TTL_MS = 30 * 60 * 1000;

/**
 * Ingestion runner — the orchestrator (spec §10).
 *
 * Executes one source end-to-end with: a Mongo unique-index distributed lock
 * (no double-runs), a persisted IngestionRun (checkpoints + metrics), bounded
 * retries with exponential backoff + jitter for transient failures, a
 * circuit-breaker per source, a dead-letter store for permanent/exhausted
 * failures, cooperative cancellation, and removal detection. Idempotency comes
 * from the publisher's upsert-by-externalId, so re-running never duplicates.
 */
@Injectable()
export class IngestionRunner {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(IngestionSource.name)
    private readonly sourceModel: Model<IngestionSourceDocument>,
    @InjectModel(IngestionRun.name) private readonly runModel: Model<IngestionRunDocument>,
    @InjectModel(RawDocument.name) private readonly rawModel: Model<RawDocumentDocument>,
    @InjectModel(DeadLetter.name) private readonly dlqModel: Model<DeadLetterDocument>,
    @InjectModel(IngestionLock.name) private readonly lockModel: Model<IngestionLockDocument>,
    private readonly registry: AdapterRegistry,
    private readonly fetcher: FetcherService,
    private readonly normalizer: NormalizerService,
    private readonly validator: ValidatorService,
    private readonly dedup: DedupService,
    private readonly quality: QualityService,
    private readonly publisher: PublisherService,
    private readonly metrics: IngestionMetricsService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('IngestionRunner');
  }

  /**
   * Run a single source. Returns the persisted run document (or null if it could
   * not start — disabled, stopped, locked, or circuit-open).
   */
  async runSource(sourceIdOrKey: string, opts: RunOptions = {}): Promise<IngestionRunDocument | null> {
    const source = await this.loadSource(sourceIdOrKey);
    if (!source) {
      this.logger.warn(`runSource: source not found ${sourceIdOrKey}`);
      return null;
    }

    // Governance gates (manual force bypasses enabled/circuit but never emergency stop).
    if (source.emergencyStopped) {
      this.logger.warn(`runSource: ${source.sourceId} is emergency-stopped`);
      return null;
    }
    if (!opts.force && (!source.enabled || source.complianceStatus !== 'approved')) {
      this.logger.debug(`runSource: ${source.sourceId} not enabled/approved; skipping`);
      return null;
    }
    if (!opts.force && this.isCircuitOpen(source)) {
      this.logger.warn(`runSource: ${source.sourceId} circuit open; skipping`);
      return null;
    }

    const correlationId = uuidv4();
    const lockKey = `run:${source.sourceId}`;
    const locked = await this.acquireLock(lockKey, correlationId);
    if (!locked) {
      this.logger.warn(`runSource: ${source.sourceId} already running (lock held)`);
      return null;
    }

    const run = await this.runModel.create({
      sourceId: source._id,
      sourceKey: source.sourceId,
      correlationId,
      status: 'running',
      trigger: opts.trigger || 'scheduled',
      startedAt: new Date(),
    });
    await this.sourceModel.updateOne({ _id: source._id }, { $set: { lastAttemptedRunAt: new Date() } });

    const fetchStart = Date.now();
    try {
      const adapter = this.registry.get(source.adapterType);
      const validation = adapter.validateConfig(source);
      if (!validation.valid) {
        await this.deadLetter(source, run, 'config', 'permanent', validation.errors.join('; '));
        await this.finishRun(run, 'failed', source, false, [
          { category: 'permanent', message: `invalid config: ${validation.errors.join('; ')}` },
        ]);
        return this.runModel.findById(run._id);
      }

      const result = await this.runAdapterWithRetries(source, run, opts, correlationId);
      const fetchMs = Date.now() - fetchStart;

      // Persist raw payloads (TTL-bound).
      await this.storeRaw(source, run, correlationId, result, adapter.version);

      // Process each parsed item through the pipeline.
      const processStart = Date.now();
      const counters = await this.processItems(source, run, result);
      const processMs = Date.now() - processStart;

      // Removal detection — only trust a complete run.
      let removed = 0;
      if (result.complete && Array.isArray(result.presentKeys)) {
        removed = await this.detectRemovals(source, result.presentKeys);
      }

      const status = result.errors.some((e) => e.category === 'permanent') ? 'partial' : 'completed';
      await this.runModel.updateOne(
        { _id: run._id },
        {
          $set: {
            ...counters,
            pagesFetched: result.pagesFetched,
            itemsDiscovered: result.discovered,
            checkpoint: result.nextCheckpoint || source.lastCheckpoint || '',
            fetchMs,
            processMs,
            status,
            finishedAt: new Date(),
          },
          $push: { runErrors: { $each: result.errors.map((e) => ({ category: e.category, message: e.message, at: new Date() })) } },
        },
      );

      await this.markSourceSuccess(source, result.nextCheckpoint);
      this.metrics.recordRun({
        sourceKey: source.sourceId,
        correlationId,
        status,
        itemsDiscovered: result.discovered,
        fetchMs,
        processMs,
        ...counters,
      });
      this.logger.log(`run ${correlationId} ${source.sourceId}: ${status} (${counters.jobsCreated} new, ${removed} removed)`);
      return this.runModel.findById(run._id);
    } catch (err: any) {
      this.logger.error(`run ${correlationId} ${source.sourceId} failed: ${err.message}`, err.stack);
      await this.deadLetter(source, run, 'run', 'transient', err.message);
      await this.finishRun(run, 'failed', source, true, [{ category: 'transient', message: err.message }]);
      return this.runModel.findById(run._id);
    } finally {
      await this.releaseLock(lockKey, correlationId);
    }
  }

  // ---- adapter execution with retries ----
  private async runAdapterWithRetries(
    source: IngestionSourceDocument,
    run: IngestionRunDocument,
    opts: RunOptions,
    correlationId: string,
  ): Promise<AdapterRunResult> {
    const adapter = this.registry.get(source.adapterType);
    const maxRetries = source.retryPolicy?.maxRetries ?? 3;
    const baseBackoff = source.retryPolicy?.backoffMs ?? 1000;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      if (await this.isCancelled(run._id as Types.ObjectId)) {
        throw new Error('run cancelled');
      }
      try {
        const result = await adapter.run({
          source,
          fetcher: this.fetcher,
          correlationId,
          checkpoint: source.lastCheckpoint,
          uploadedContent: opts.uploadedContent,
          maxItems: 1000,
          isCancelled: () => false, // periodic check handled at item loop
        });
        // A permanent adapter error (bad config/unauthorized) must not be retried.
        if (result.errors.some((e) => e.category === 'permanent') && result.items.length === 0) {
          return result;
        }
        if (attempt > 0) {
          await this.runModel.updateOne({ _id: run._id }, { $inc: { retryCount: attempt } });
        }
        return result;
      } catch (err: any) {
        lastError = err;
        if (attempt === maxRetries) break;
        const delay = baseBackoff * 2 ** attempt + Math.floor(Math.random() * baseBackoff);
        this.logger.warn(`adapter attempt ${attempt + 1} failed (${err.message}); backoff ${delay}ms`);
        await this.sleep(delay);
        attempt++;
      }
    }
    throw lastError || new Error('adapter failed');
  }

  // ---- per-item pipeline ----
  private async processItems(
    source: IngestionSourceDocument,
    run: IngestionRunDocument,
    result: AdapterRunResult,
  ) {
    const counters = {
      jobsCreated: 0,
      jobsUpdated: 0,
      jobsSkipped: 0,
      jobsRejected: 0,
      jobsReview: 0,
      duplicatesDetected: 0,
      deadLettered: 0,
    };
    let i = 0;
    for (const item of result.items) {
      // Cooperative cancellation check every 25 items.
      if (i++ % 25 === 0 && (await this.isCancelled(run._id as Types.ObjectId))) break;
      try {
        const normalized = this.normalizer.normalize(item, source);
        const validation = await this.validator.validate(normalized);
        const dup = await this.dedup.findDuplicate(normalized);
        if (dup.isDuplicate) counters.duplicatesDetected++;
        const q = this.quality.score(normalized, validation, dup, source);
        const outcome = await this.publisher.publishNormalized(normalized, validation, dup, q, source);
        switch (outcome.action) {
          case 'created':
            counters.jobsCreated++;
            break;
          case 'updated':
            counters.jobsUpdated++;
            break;
          case 'rejected':
            counters.jobsRejected++;
            break;
          case 'review':
            counters.jobsReview++;
            break;
          case 'duplicate':
          case 'skipped_direct_employer':
            counters.jobsSkipped++;
            break;
        }
      } catch (err: any) {
        counters.deadLettered++;
        await this.deadLetter(source, run, 'process', 'transient', err.message, item.sourceJobKey, item as any);
      }
    }
    return counters;
  }

  private async storeRaw(
    source: IngestionSourceDocument,
    run: IngestionRunDocument,
    correlationId: string,
    result: AdapterRunResult,
    adapterVersion: string,
  ) {
    if (!result.rawPayloads.length) return;
    const expiresAt = new Date(Date.now() + (source.rawRetentionDays ?? 30) * 86400000);
    const docs = result.rawPayloads.map((p) => ({
      sourceId: source._id,
      runId: run._id,
      correlationId,
      sourceJobKey: p.sourceJobKey,
      requestUrl: p.requestUrl,
      httpStatus: p.httpStatus,
      contentType: p.contentType,
      checksum: p.checksum,
      adapterVersion,
      payload: p.payload,
      processingStatus: 'parsed',
      expiresAt,
    }));
    await this.rawModel.insertMany(docs, { ordered: false }).catch(() => undefined);
  }

  /** Mark jobs from this source that vanished from the feed as removed_at_source. */
  private async detectRemovals(source: IngestionSourceDocument, presentKeys: string[]): Promise<number> {
    const res = await this.jobModel.updateMany(
      {
        sourceId: source._id,
        sourceJobKey: { $nin: presentKeys },
        lifecycle: { $in: ['published', 'duplicate'] },
      },
      {
        $set: {
          lifecycle: 'removed_at_source',
          isActive: false,
          removalReason: 'absent_from_feed',
          lastVerifiedAt: new Date(),
        },
      },
    );
    return res.modifiedCount || 0;
  }

  // ---- source health / circuit breaker ----
  private isCircuitOpen(source: IngestionSourceDocument): boolean {
    if (source.circuitState !== 'open') return false;
    const opened = source.circuitOpenedAt?.getTime() || 0;
    return Date.now() - opened < CIRCUIT_COOLDOWN_MS; // still cooling down
  }

  private async markSourceSuccess(source: IngestionSourceDocument, checkpoint?: string) {
    await this.sourceModel.updateOne(
      { _id: source._id },
      {
        $set: {
          health: 'healthy',
          failureCount: 0,
          circuitState: 'closed',
          lastSuccessfulRunAt: new Date(),
          ...(checkpoint ? { lastCheckpoint: checkpoint } : {}),
        },
      },
    );
  }

  private async finishRun(
    run: IngestionRunDocument,
    status: string,
    source: IngestionSourceDocument,
    countFailure: boolean,
    errors: Array<{ category: string; message: string }>,
  ) {
    await this.runModel.updateOne(
      { _id: run._id },
      {
        $set: { status, finishedAt: new Date() },
        $push: { runErrors: { $each: errors.map((e) => ({ ...e, at: new Date() })) } },
      },
    );
    if (countFailure) {
      const failureCount = (source.failureCount || 0) + 1;
      const open = failureCount >= CIRCUIT_FAILURE_THRESHOLD;
      await this.sourceModel.updateOne(
        { _id: source._id },
        {
          $set: {
            failureCount,
            health: open ? 'unhealthy' : 'degraded',
            circuitState: open ? 'open' : source.circuitState || 'closed',
            ...(open ? { circuitOpenedAt: new Date() } : {}),
          },
        },
      );
      if (open) this.metrics.alert('repeated_source_failure', { sourceKey: source.sourceId, failureCount });
    }
  }

  private async deadLetter(
    source: IngestionSourceDocument,
    run: IngestionRunDocument,
    stage: string,
    category: string,
    message: string,
    sourceJobKey?: string,
    snapshot?: Record<string, unknown>,
  ) {
    await this.dlqModel.create({
      sourceId: source._id,
      runId: run._id,
      correlationId: run.correlationId,
      sourceJobKey,
      stage,
      errorCategory: category,
      errorMessage: message,
      itemSnapshot: snapshot,
    });
    await this.runModel.updateOne({ _id: run._id }, { $inc: { deadLettered: 1 } });
  }

  // ---- distributed lock (unique index) ----
  private async acquireLock(key: string, holder: string): Promise<boolean> {
    try {
      await this.lockModel.create({ key, holder, expiresAt: new Date(Date.now() + LOCK_TTL_MS) });
      return true;
    } catch {
      return false; // duplicate key -> already held
    }
  }

  private async releaseLock(key: string, holder: string) {
    await this.lockModel.deleteOne({ key, holder }).catch(() => undefined);
  }

  // ---- cancellation ----
  async requestCancel(runId: string): Promise<void> {
    await this.runModel.updateOne({ _id: runId }, { $set: { cancelRequested: true } });
  }

  private async isCancelled(runId: Types.ObjectId): Promise<boolean> {
    const doc = await this.runModel.findById(runId).select('cancelRequested').lean();
    return !!doc?.cancelRequested;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }

  private async loadSource(idOrKey: string): Promise<IngestionSourceDocument | null> {
    if (Types.ObjectId.isValid(idOrKey)) {
      const byId = await this.sourceModel.findById(idOrKey);
      if (byId) return byId;
    }
    return this.sourceModel.findOne({ sourceId: idOrKey });
  }
}
