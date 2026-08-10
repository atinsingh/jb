import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IngestionSource,
  IngestionSourceDocument,
} from '../schemas/ingestion-source.schema';
import {
  IngestionRun,
  IngestionRunDocument,
} from '../schemas/ingestion-run.schema';
import { DeadLetter, DeadLetterDocument } from '../schemas/dead-letter.schema';
import { IngestionRunner } from '../orchestration/ingestion.runner';

/**
 * Admin ingestion-ops service (spec §12/§14). Backs the ROLE_ADMIN operator
 * console: source registry CRUD, governance toggles (enable / emergency-stop),
 * manual runs, run history + cancellation, dead-letter inspection/reprocess, and
 * an aggregate metrics view. Read/writes go through the three ingestion models;
 * side-effecting runs are delegated to the shared IngestionRunner.
 */
@Injectable()
export class AdminIngestionService {
  constructor(
    @InjectModel(IngestionSource.name)
    private readonly sourceModel: Model<IngestionSourceDocument>,
    @InjectModel(IngestionRun.name)
    private readonly runModel: Model<IngestionRunDocument>,
    @InjectModel(DeadLetter.name)
    private readonly dlqModel: Model<DeadLetterDocument>,
    private readonly runner: IngestionRunner,
  ) {}

  // ---- sources ----

  /** All sources, trusted-first (lower priority = scheduled sooner). */
  async listSources(): Promise<IngestionSourceDocument[]> {
    return this.sourceModel.find().sort({ priority: 1 }).exec();
  }

  async createSource(
    dto: Partial<IngestionSource>,
  ): Promise<IngestionSourceDocument> {
    return this.sourceModel.create(dto);
  }

  async updateSource(
    id: string,
    dto: Partial<IngestionSource>,
  ): Promise<IngestionSourceDocument> {
    const updated = await this.sourceModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`source ${id} not found`);
    return updated;
  }

  async deleteSource(id: string): Promise<{ deleted: boolean }> {
    const res = await this.sourceModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException(`source ${id} not found`);
    return { deleted: true };
  }

  /** Governance: flip the enabled gate. */
  async setEnabled(
    id: string,
    enabled: boolean,
  ): Promise<IngestionSourceDocument> {
    const updated = await this.sourceModel
      .findByIdAndUpdate(id, { $set: { enabled: !!enabled } }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`source ${id} not found`);
    return updated;
  }

  /** Governance: manual kill-switch that overrides `enabled`. */
  async setEmergencyStop(
    id: string,
    stopped: boolean,
  ): Promise<IngestionSourceDocument> {
    const updated = await this.sourceModel
      .findByIdAndUpdate(
        id,
        { $set: { emergencyStopped: !!stopped } },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`source ${id} not found`);
    return updated;
  }

  /** Manual admin run — forces past the enabled/circuit gates (spec §10). */
  async runSource(id: string): Promise<IngestionRunDocument | null> {
    return this.runner.runSource(id, { trigger: 'manual', force: true });
  }

  // ---- runs ----

  async listRuns(filter: {
    sourceId?: string;
    status?: string;
    limit?: number;
  }): Promise<IngestionRunDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter.sourceId) query.sourceId = filter.sourceId;
    if (filter.status) query.status = filter.status;
    const limit = Math.min(Math.max(Number(filter.limit) || 50, 1), 200);
    return this.runModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async cancelRun(id: string): Promise<{ cancelRequested: boolean }> {
    await this.runner.requestCancel(id);
    return { cancelRequested: true };
  }

  // ---- dead letters ----

  async listDeadLetters(filter: {
    sourceId?: string;
    reprocessed?: boolean;
    limit?: number;
  }): Promise<DeadLetterDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter.sourceId) query.sourceId = filter.sourceId;
    if (filter.reprocessed !== undefined) query.reprocessed = filter.reprocessed;
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    return this.dlqModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Reprocess a parked item. There's no dedicated reprocess path on the runner,
   * so we re-run the source with the stored snapshot as uploaded content, then
   * defensively mark the DLQ record reprocessed.
   */
  async reprocessDeadLetter(
    id: string,
  ): Promise<{ reprocessed: boolean; runId: string | null }> {
    const dlq = await this.dlqModel.findById(id).exec();
    if (!dlq) throw new NotFoundException(`dead-letter ${id} not found`);

    const run = await this.runner.runSource(String(dlq.sourceId), {
      trigger: 'reprocess',
      uploadedContent: dlq.itemSnapshot
        ? JSON.stringify(dlq.itemSnapshot)
        : undefined,
    });

    await this.dlqModel
      .updateOne({ _id: id }, { $set: { reprocessed: true } })
      .exec();

    return { reprocessed: true, runId: run ? String(run._id) : null };
  }

  // ---- metrics ----

  /**
   * Aggregate operational view: run counters summed across all runs, run counts
   * by status, and source counts by health + enabled state.
   */
  async getMetrics(): Promise<{
    runs: {
      total: number;
      byStatus: Record<string, number>;
      totals: {
        jobsCreated: number;
        jobsUpdated: number;
        jobsRejected: number;
        deadLettered: number;
      };
    };
    sources: {
      total: number;
      enabled: number;
      byHealth: Record<string, number>;
    };
  }> {
    const [runAgg, statusAgg, healthAgg, sourceTotal, sourceEnabled] =
      await Promise.all([
        this.runModel.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              jobsCreated: { $sum: '$jobsCreated' },
              jobsUpdated: { $sum: '$jobsUpdated' },
              jobsRejected: { $sum: '$jobsRejected' },
              deadLettered: { $sum: '$deadLettered' },
            },
          },
        ]),
        this.runModel.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        this.sourceModel.aggregate([
          { $group: { _id: '$health', count: { $sum: 1 } } },
        ]),
        this.sourceModel.countDocuments().exec(),
        this.sourceModel.countDocuments({ enabled: true }).exec(),
      ]);

    const agg = runAgg[0] || {};
    const byStatus: Record<string, number> = {};
    for (const row of statusAgg) byStatus[row._id ?? 'unknown'] = row.count;
    const byHealth: Record<string, number> = {};
    for (const row of healthAgg) byHealth[row._id ?? 'unknown'] = row.count;

    return {
      runs: {
        total: agg.total || 0,
        byStatus,
        totals: {
          jobsCreated: agg.jobsCreated || 0,
          jobsUpdated: agg.jobsUpdated || 0,
          jobsRejected: agg.jobsRejected || 0,
          deadLettered: agg.deadLettered || 0,
        },
      },
      sources: {
        total: sourceTotal || 0,
        enabled: sourceEnabled || 0,
        byHealth,
      },
    };
  }
}
