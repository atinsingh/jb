import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';

export interface RunMetrics {
  sourceKey: string;
  correlationId: string;
  status: string;
  itemsDiscovered: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsSkipped: number;
  jobsRejected: number;
  jobsReview: number;
  duplicatesDetected: number;
  deadLettered: number;
  fetchMs: number;
  processMs: number;
}

/**
 * Observability (spec §16). Emits structured metric + alert lines through the
 * existing AppLoggerService (winston JSON logs) so runs and jobs are traceable by
 * correlationId. Deliberately log-based rather than pulling in a metrics backend
 * (Prometheus/StatsD) that the repo does not run — the structured lines can be
 * scraped/forwarded later without code changes.
 */
@Injectable()
export class IngestionMetricsService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('IngestionMetrics');
  }

  /** Emit a single metric data point. */
  gauge(metric: string, value: number, tags: Record<string, unknown> = {}): void {
    this.logger.log(JSON.stringify({ kind: 'metric', metric, value, ...tags }));
  }

  /** Emit the summary of a completed run. */
  recordRun(m: RunMetrics): void {
    this.logger.log(
      JSON.stringify({
        kind: 'ingestion_run',
        ...m,
        duplicateRate: m.itemsDiscovered ? m.duplicatesDetected / m.itemsDiscovered : 0,
        rejectionRate: m.itemsDiscovered ? m.jobsRejected / m.itemsDiscovered : 0,
      }),
    );
    this.evaluateAlerts(m);
  }

  /** Threshold-based alerts (spec §16). Logged at warn level for scraping. */
  private evaluateAlerts(m: RunMetrics): void {
    const alert = (type: string, detail: Record<string, unknown>) =>
      this.logger.warn(
        JSON.stringify({ kind: 'ingestion_alert', type, sourceKey: m.sourceKey, ...detail }),
      );

    if (m.status === 'failed') alert('source_failure', { correlationId: m.correlationId });
    if (m.status === 'completed' && m.itemsDiscovered === 0) {
      alert('zero_job_result', { correlationId: m.correlationId });
    }
    if (m.itemsDiscovered > 0 && m.duplicatesDetected / m.itemsDiscovered > 0.6) {
      alert('duplicate_spike', { rate: m.duplicatesDetected / m.itemsDiscovered });
    }
    if (m.itemsDiscovered > 0 && m.jobsRejected / m.itemsDiscovered > 0.5) {
      alert('high_rejection_rate', { rate: m.jobsRejected / m.itemsDiscovered });
    }
    if (m.deadLettered > 0) alert('dead_letter', { count: m.deadLettered });
  }

  alert(type: string, detail: Record<string, unknown> = {}): void {
    this.logger.warn(JSON.stringify({ kind: 'ingestion_alert', type, ...detail }));
  }
}
