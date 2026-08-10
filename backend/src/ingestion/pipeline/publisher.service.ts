import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument } from '../../schemas/job.schema';
import { IngestionSourceDocument } from '../schemas/ingestion-source.schema';
import { NormalizedJob } from './normalizer.service';
import { ValidationResult } from './validator.service';
import { DedupResult } from './dedup.service';
import { QualityResult } from './quality.service';

export type PublishAction =
  | 'created'
  | 'updated'
  | 'review'
  | 'rejected'
  | 'duplicate'
  | 'skipped_direct_employer';

export interface PublishOutcome {
  action: PublishAction;
  jobId?: string;
  lifecycle: string;
}

const ADAPTER_TO_LABEL: Record<string, string> = {
  json_feed: 'JSON Feed',
  xml_feed: 'RSS',
  jsonld: 'JSON-LD',
  html_careerpage: 'Career Page',
  csv_import: 'CSV',
  greenhouse: 'Greenhouse',
  manual: 'Manual',
};

const ADAPTER_TO_IMPORT_METHOD: Record<string, string> = {
  json_feed: 'feed',
  xml_feed: 'feed',
  jsonld: 'jsonld',
  html_careerpage: 'html',
  csv_import: 'csv',
  greenhouse: 'official_api',
  manual: 'manual',
};

/**
 * Publisher (spec §7 preferred-source rules + publishing stage).
 *
 * Idempotency: every job is UPSERTED by its deterministic `externalId`
 * (`${sourceId}:${sourceJobKey}`), so re-running the same source updates the same
 * record instead of creating duplicates.
 *
 * Preferred-source protection: if a job duplicates an existing DIRECTLY-POSTED
 * employer job, the aggregated copy is never published over it — it is skipped
 * (recorded as a duplicate). Cross-source aggregated duplicates are stored but
 * marked `lifecycle: 'duplicate'` (not searchable), so imports never create
 * duplicate *visible* listings.
 *
 * The employer -> search bridge (publishEmployerJob) lives here too so both
 * publish paths share one writer and one set of invariants.
 */
@Injectable()
export class PublisherService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
  ) {}

  async publishNormalized(
    job: NormalizedJob,
    validation: ValidationResult,
    dedup: DedupResult,
    quality: QualityResult,
    source: IngestionSourceDocument,
  ): Promise<PublishOutcome> {
    // 1. Direct-employer protection: never overwrite/duplicate a first-party job.
    if (dedup.isDuplicate && dedup.existingIsDirectEmployer) {
      await this.recordDuplicate(job, dedup, quality, source);
      return {
        action: 'skipped_direct_employer',
        lifecycle: 'duplicate',
        jobId: dedup.matchedJobId,
      };
    }

    // 2. Decide lifecycle from the quality/validation decision.
    let lifecycle: string;
    let moderationStatus: string;
    switch (quality.decision) {
      case 'auto_publish':
        lifecycle = 'published';
        moderationStatus = 'auto_approved';
        break;
      case 'publish_with_warning':
        lifecycle = 'published';
        moderationStatus = 'needs_review';
        break;
      case 'reject':
        lifecycle = 'rejected';
        moderationStatus = 'rejected';
        break;
      case 'review':
      default:
        lifecycle = 'pending_review';
        moderationStatus = 'needs_review';
        break;
    }

    // 3. Cross-source aggregated duplicate -> store but keep out of search.
    if (dedup.isDuplicate && lifecycle === 'published') {
      lifecycle = 'duplicate';
      moderationStatus = 'needs_review';
    }

    const now = new Date();
    const searchable = lifecycle === 'published';
    const internalExpiresAt =
      job.sourceExpiresAt ||
      new Date(now.getTime() + (source.jobMaxAgeDays ?? 30) * 86400000);

    const setDoc: Record<string, unknown> = {
      title: job.title,
      normalizedTitle: job.normalizedTitle,
      companyName: job.companyName,
      normalizedCompanyName: job.normalizedCompanyName,
      employerDomain: job.employerDomain,
      location: job.location,
      normalizedCity: job.normalizedCity,
      region: job.region,
      country: job.country,
      workplaceType: job.workplaceType,
      isRemote: job.isRemote,
      description: job.description,
      skills: job.skills,
      requirements: job.requirements,
      salary: job.salary,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      salaryDisclosed: job.salaryDisclosed,
      salaryEstimated: job.salaryEstimated,
      jobType: job.employmentType || 'Full-time',
      employmentType: job.employmentType,
      seniority: job.seniority,
      experience: job.seniority || 'Not specified',
      source: ADAPTER_TO_LABEL[source.adapterType] || 'Partner',
      importMethod: ADAPTER_TO_IMPORT_METHOD[source.adapterType] || 'feed',
      isExternal: true,
      attributionText: source.attributionText || `via ${source.name}`,
      externalUrl: job.externalUrl,
      canonicalUrl: this.canonical(job.originalApplyUrl || job.externalUrl),
      sourceUrl: job.sourceUrl,
      originalApplyUrl: job.originalApplyUrl,
      contentFingerprint: job.contentFingerprint,
      sourceId: source._id,
      sourceJobKey: job.sourceJobKey,
      sourcePostedAt: job.sourcePostedAt,
      sourceExpiresAt: job.sourceExpiresAt,
      internalExpiresAt,
      lastVerifiedAt: now,
      lifecycle,
      moderationStatus,
      isActive: searchable,
      scrapedAt: now,
      qualityScore: quality.score,
      qualityExplanation: {
        factors: quality.factors,
        explanation: quality.explanation,
      },
      confidenceScore: job.confidenceScore,
      duplicateGroupId: dedup.duplicateGroupId,
      validationResults: validation.issues,
      provenance: job.provenance,
      verificationFailures: 0,
    };

    // Upsert by externalId -> idempotent across re-runs of the same source.
    const existing = await this.jobModel
      .findOne({ externalId: job.externalId })
      .select('_id')
      .lean();
    const res = await this.jobModel.findOneAndUpdate(
      { externalId: job.externalId },
      {
        $set: setDoc,
        $setOnInsert: { firstDiscoveredAt: now, externalId: job.externalId },
      },
      { upsert: true, new: true },
    );

    const action: PublishAction = existing
      ? 'updated'
      : lifecycle === 'rejected'
        ? 'rejected'
        : lifecycle === 'duplicate'
          ? 'duplicate'
          : lifecycle === 'pending_review'
            ? 'review'
            : 'created';

    return { action, jobId: String(res._id), lifecycle };
  }

  /** Record an aggregated copy that lost to a direct-employer job (provenance kept). */
  private async recordDuplicate(
    job: NormalizedJob,
    dedup: DedupResult,
    quality: QualityResult,
    source: IngestionSourceDocument,
  ): Promise<void> {
    const now = new Date();
    await this.jobModel.findOneAndUpdate(
      { externalId: job.externalId },
      {
        $set: {
          title: job.title,
          companyName: job.companyName,
          location: job.location,
          source: ADAPTER_TO_LABEL[source.adapterType] || 'Partner',
          isExternal: true,
          lifecycle: 'duplicate',
          isActive: false,
          moderationStatus: 'rejected',
          duplicateGroupId: dedup.duplicateGroupId,
          contentFingerprint: job.contentFingerprint,
          sourceId: source._id,
          sourceJobKey: job.sourceJobKey,
          qualityScore: quality.score,
          removalReason: 'duplicate_of_direct_employer',
          lastVerifiedAt: now,
        },
        $setOnInsert: { firstDiscoveredAt: now, externalId: job.externalId },
      },
      { upsert: true },
    );
  }

  /**
   * Bridge a directly-posted employer job into the searchable `jobs` collection
   * (spec: preserve + surface employer jobs). Marked isExternal:false,
   * source:'Jobocate', lifecycle:'published'. Idempotent by a synthetic externalId.
   */
  async publishEmployerJob(employerJob: {
    _id: Types.ObjectId | string;
    title: string;
    companyName?: string;
    location?: string;
    isRemote?: boolean;
    description?: string;
    requirements?: string[];
    skills?: string[];
    salaryMin?: number;
    salaryMax?: number;
    salaryPeriod?: string;
    type?: string;
    ownerId?: Types.ObjectId | string;
    status?: string;
  }): Promise<PublishOutcome> {
    const externalId = `jobocate:${employerJob._id}`;
    const now = new Date();
    const published = employerJob.status === 'active';
    const disclosed =
      employerJob.salaryMin != null || employerJob.salaryMax != null;
    const salary = disclosed
      ? `${employerJob.salaryMin ?? ''}${employerJob.salaryMax ? ' - ' + employerJob.salaryMax : ''}${employerJob.salaryPeriod ? '/' + employerJob.salaryPeriod : ''}`.trim()
      : 'Not specified';

    const res = await this.jobModel.findOneAndUpdate(
      { externalId },
      {
        $set: {
          title: employerJob.title,
          companyName: employerJob.companyName || 'Employer',
          location:
            employerJob.location ||
            (employerJob.isRemote ? 'Remote' : 'Not specified'),
          isRemote: !!employerJob.isRemote,
          // Uppercase to match the matching/eligibility engine, which compares
          // against 'REMOTE' | 'ONSITE' | 'HYBRID' (see eligible-jobs.service.ts).
          workplaceType: employerJob.isRemote ? 'REMOTE' : 'ONSITE',
          description: employerJob.description || '',
          requirements: employerJob.requirements || [],
          skills: employerJob.skills || [],
          salary,
          salaryMin: employerJob.salaryMin,
          salaryMax: employerJob.salaryMax,
          salaryPeriod: employerJob.salaryPeriod,
          salaryDisclosed: disclosed,
          salaryEstimated: false,
          jobType: employerJob.type || 'Full-time',
          employmentType: employerJob.type,
          source: 'Jobocate',
          importMethod: 'employer_direct',
          isExternal: false,
          verifiedEmployer: true,
          originalApplyUrl: '',
          externalUrl: '',
          sourceJobKey: String(employerJob._id),
          addedBy: employerJob.ownerId
            ? new Types.ObjectId(String(employerJob.ownerId))
            : undefined,
          lifecycle: published ? 'published' : 'paused',
          moderationStatus: 'auto_approved',
          isActive: published,
          lastVerifiedAt: now,
          qualityScore: 90, // first-party jobs are high-trust by definition
        },
        $setOnInsert: { firstDiscoveredAt: now, externalId },
      },
      { upsert: true, new: true },
    );
    return {
      action: 'created',
      jobId: String(res._id),
      lifecycle: published ? 'published' : 'paused',
    };
  }

  private canonical(url?: string): string | undefined {
    if (!url) return undefined;
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/\/+$/, '');
      return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path.toLowerCase()}`;
    } catch {
      return undefined;
    }
  }
}
