import { Injectable } from '@nestjs/common';
import { NormalizedJob } from './normalizer.service';
import { ValidationResult } from './validator.service';
import { DedupResult } from './dedup.service';
import { IngestionSourceDocument } from '../schemas/ingestion-source.schema';

export interface QualityFactor {
  factor: string;
  points: number; // signed contribution
  detail: string;
}

export interface QualityResult {
  score: number; // 0-100
  factors: QualityFactor[];
  decision: 'auto_publish' | 'publish_with_warning' | 'review' | 'reject';
  explanation: string;
}

/**
 * Transparent quality & trust scoring (spec §9).
 *
 * Produces a 0-100 score from explainable, additive factors plus a routing
 * decision. Every factor is stored so an admin can see precisely why a job scored
 * as it did — no opaque number. The decision combines the score with the hard
 * validation verdict (a hard reject always wins).
 */
@Injectable()
export class QualityService {
  score(
    job: NormalizedJob,
    validation: ValidationResult,
    dedup: DedupResult,
    source: IngestionSourceDocument,
  ): QualityResult {
    const factors: QualityFactor[] = [];
    const add = (factor: string, points: number, detail: string) =>
      factors.push({ factor, points, detail });

    // Baseline from source trust (0-25).
    const trust = Math.round((source.trustScore ?? 0.5) * 25);
    add('source_trust', trust, `source trustScore ${source.trustScore ?? 0.5}`);

    // Freshness (0-15).
    if (job.sourcePostedAt) {
      const days = (Date.now() - job.sourcePostedAt.getTime()) / 86400000;
      const fresh = days <= 7 ? 15 : days <= 30 ? 10 : days <= 60 ? 5 : 0;
      add('freshness', fresh, `posted ${Math.round(days)}d ago`);
    } else {
      add('freshness', 5, 'no posted date');
    }

    // Description completeness (0-15).
    const descLen = (job.description || '').length;
    add(
      'description',
      descLen > 600 ? 15 : descLen > 200 ? 10 : descLen > 40 ? 5 : 0,
      `${descLen} chars`,
    );

    // Compensation transparency (0-10) — only real, disclosed pay.
    add(
      'compensation',
      job.salaryDisclosed ? 10 : 0,
      job.salaryDisclosed ? 'salary disclosed' : 'no salary',
    );

    // Location completeness (0-10).
    add(
      'location',
      job.normalizedCity ? 10 : job.isRemote ? 8 : 0,
      job.normalizedCity || (job.isRemote ? 'remote' : 'unknown'),
    );

    // Structured requirements/skills (0-10).
    const structured =
      (job.skills?.length || 0) + (job.requirements?.length || 0);
    add(
      'structure',
      structured >= 3 ? 10 : structured > 0 ? 5 : 0,
      `${structured} skills/reqs`,
    );

    // Employer identity (0-10).
    add(
      'employer_identity',
      job.employerDomain
        ? 10
        : job.companyName && job.companyName !== 'Unknown'
          ? 6
          : 0,
      job.employerDomain || job.companyName,
    );

    // Penalties.
    for (const issue of validation.issues) {
      if (issue.severity === 'soft')
        add(`issue:${issue.code}`, -5, issue.message);
    }
    if (dedup.isDuplicate) {
      add(
        'duplicate',
        -10,
        `${Math.round(dedup.confidence * 100)}% duplicate of ${dedup.matchedJobId}`,
      );
    }

    const raw = factors.reduce((s, f) => s + f.points, 0);
    const score = Math.max(0, Math.min(100, raw));

    // Decision: hard validation reject always wins.
    let decision: QualityResult['decision'];
    if (validation.verdict === 'reject') {
      decision = 'reject';
    } else if (validation.verdict === 'review') {
      decision = 'review';
    } else if (score >= 70) {
      decision = 'auto_publish';
    } else if (score >= 50) {
      decision = 'publish_with_warning';
    } else {
      decision = 'review';
    }

    return {
      score,
      factors,
      decision,
      explanation: `score ${score}/100 -> ${decision}`,
    };
  }
}
