import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Job, JobSchema } from '../schemas/job.schema';
import {
  EmployerJob,
  EmployerJobSchema,
} from '../employer-jobs/schemas/employer-job.schema';
import {
  IngestionSource,
  IngestionSourceSchema,
} from './schemas/ingestion-source.schema';
import {
  IngestionRun,
  IngestionRunSchema,
} from './schemas/ingestion-run.schema';
import { RawDocument, RawDocumentSchema } from './schemas/raw-document.schema';
import {
  IngestionAuditEvent,
  IngestionAuditEventSchema,
} from './schemas/ingestion-audit.schema';
import { DeadLetter, DeadLetterSchema } from './schemas/dead-letter.schema';
import {
  IngestionLock,
  IngestionLockSchema,
} from './schemas/ingestion-lock.schema';

// Stage 2: security, fetcher, sanitizer, adapters
import { UrlSafetyService } from './pipeline/url-safety.service';
import { FetcherService } from './pipeline/fetcher.service';
import { HtmlSanitizerService } from './pipeline/html-sanitizer.service';
import { JsonFeedAdapter } from './adapters/json-feed.adapter';
import { XmlFeedAdapter } from './adapters/xml-feed.adapter';
import { JsonLdJobPostingAdapter } from './adapters/jsonld-jobposting.adapter';
import { HtmlCareerPageAdapter } from './adapters/html-careerpage.adapter';
import { CsvImportAdapter } from './adapters/csv-import.adapter';
import { GreenhouseAdapter } from './adapters/greenhouse.adapter';
import { AdapterRegistry } from './adapters/adapter.registry';

// Stage 3: normalization/validation/dedup/quality/publish pipeline
import { NormalizerService } from './pipeline/normalizer.service';
import { ValidatorService } from './pipeline/validator.service';
import { DedupService } from './pipeline/dedup.service';
import { QualityService } from './pipeline/quality.service';
import { PublisherService } from './pipeline/publisher.service';

// Stage 4: orchestration (runner + crons + metrics) and the admin ops API
import { IngestionRunner } from './orchestration/ingestion.runner';
import { IngestionMetricsService } from './orchestration/metrics.service';
import { IngestionScheduler } from './orchestration/ingestion.scheduler';
import { ExpirationService } from './orchestration/expiration.service';
import { IngestionCronProcessor } from './orchestration/ingestion.cron.processor';
import { AdminIngestionController } from './admin/admin-ingestion.controller';
import { AdminIngestionService } from './admin/admin-ingestion.service';
import { bullQueueImports } from '../queue/queue.config';
import { isQueueEnabled } from '../queue/queue.constants';
import { QUEUE_CRON } from '../queue/cron-queue.constants';

/**
 * Job Aggregation & Ingestion Platform (well-isolated module).
 *
 * Built incrementally per the approved plan. Stage 1 registers the data model;
 * later stages add adapters, the pipeline, orchestration, and the admin API as
 * providers/controllers here.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: EmployerJob.name, schema: EmployerJobSchema },
      { name: IngestionSource.name, schema: IngestionSourceSchema },
      { name: IngestionRun.name, schema: IngestionRunSchema },
      { name: RawDocument.name, schema: RawDocumentSchema },
      { name: IngestionAuditEvent.name, schema: IngestionAuditEventSchema },
      { name: DeadLetter.name, schema: DeadLetterSchema },
      { name: IngestionLock.name, schema: IngestionLockSchema },
    ]),
    // Registers the shared 'cron' Bull queue only when QUEUE_ENABLED=true; []
    // otherwise, so the schedulers' @Optional queue resolves to undefined.
    ...bullQueueImports(QUEUE_CRON),
  ],
  controllers: [AdminIngestionController],
  providers: [
    UrlSafetyService,
    FetcherService,
    HtmlSanitizerService,
    JsonFeedAdapter,
    XmlFeedAdapter,
    JsonLdJobPostingAdapter,
    HtmlCareerPageAdapter,
    CsvImportAdapter,
    GreenhouseAdapter,
    AdapterRegistry,
    NormalizerService,
    ValidatorService,
    DedupService,
    QualityService,
    PublisherService,
    // Orchestration: registering IngestionScheduler + ExpirationService here
    // activates their @Cron jobs (previously registered nowhere, so they never
    // fired). Both are env-gated (INGESTION_CRON_DISABLE) and only act on
    // enabled + approved sources (disabled by default), so they safely no-op
    // until an admin configures a source.
    IngestionMetricsService,
    IngestionRunner,
    IngestionScheduler,
    ExpirationService,
    AdminIngestionService,
    // Bull consumer wired in only when queues are enabled.
    ...(isQueueEnabled() ? [IngestionCronProcessor] : []),
  ],
  exports: [
    UrlSafetyService,
    FetcherService,
    HtmlSanitizerService,
    AdapterRegistry,
    NormalizerService,
    ValidatorService,
    DedupService,
    QualityService,
    PublisherService,
    IngestionRunner,
    IngestionMetricsService,
  ],
})
export class IngestionModule {}
