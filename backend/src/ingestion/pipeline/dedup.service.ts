import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { Job, JobDocument } from '../../schemas/job.schema';
import { NormalizedJob } from './normalizer.service';

export interface DedupSignal {
  signal: string;
  weight: number;
}

export interface DedupResult {
  isDuplicate: boolean;
  matchedJobId?: string;
  duplicateGroupId?: string;
  confidence: number; // 0-1
  signals: DedupSignal[];
  explanation: string;
  /** True when the existing match is a directly-posted employer job. */
  existingIsDirectEmployer: boolean;
}

/**
 * Deterministic multi-signal deduplication (spec §7).
 *
 * Runs strongest-signal-first against the `jobs` collection. Semantic similarity
 * is intentionally NOT used here (Phase 3). Produces a confidence score and the
 * list of signals that fired, so a reviewer can see exactly why two listings were
 * judged the same. The publisher consumes `existingIsDirectEmployer` to enforce
 * the preferred-source rule (a direct employer job is never overwritten).
 */
@Injectable()
export class DedupService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
  ) {}

  /** Stable canonical URL for matching (drops query/hash, lowercases host+path). */
  canonicalizeUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/\/+$/, '');
      return `${u.hostname.toLowerCase().replace(/^www\./, '')}${path.toLowerCase()}`;
    } catch {
      return undefined;
    }
  }

  private urlHash(url?: string): string | undefined {
    const c = this.canonicalizeUrl(url);
    return c ? createHash('sha256').update(c).digest('hex') : undefined;
  }

  /**
   * Look for an existing job that is the same listing as `job`, excluding the
   * exact same source record (that's an update, handled by upsert).
   */
  async findDuplicate(job: NormalizedJob): Promise<DedupResult> {
    const none: DedupResult = {
      isDuplicate: false,
      confidence: 0,
      signals: [],
      explanation: 'no duplicate found',
      existingIsDirectEmployer: false,
    };

    // Candidate query: any job sharing a strong identity signal, but NOT the same
    // externalId (same source+key is the same record -> update path).
    const canonical = this.canonicalizeUrl(
      job.originalApplyUrl || job.externalUrl,
    );
    const or: Record<string, unknown>[] = [];
    if (job.contentFingerprint)
      or.push({ contentFingerprint: job.contentFingerprint });
    if (canonical) or.push({ canonicalUrl: canonical });
    if (job.normalizedCompanyName && job.normalizedTitle) {
      or.push({
        normalizedCompanyName: job.normalizedCompanyName,
        normalizedTitle: job.normalizedTitle,
      });
    }
    if (!or.length) return none;

    const candidates = await this.jobModel
      .find({ $and: [{ externalId: { $ne: job.externalId } }, { $or: or }] })
      .limit(20)
      .lean()
      .exec();

    if (!candidates.length) return none;

    let best: { doc: any; confidence: number; signals: DedupSignal[] } | null =
      null;
    for (const doc of candidates) {
      const signals: DedupSignal[] = [];
      if (doc.canonicalUrl && canonical && doc.canonicalUrl === canonical) {
        signals.push({ signal: 'canonical_url', weight: 0.6 });
      }
      if (
        doc.contentFingerprint &&
        doc.contentFingerprint === job.contentFingerprint
      ) {
        signals.push({ signal: 'content_fingerprint', weight: 0.55 });
      }
      if (
        doc.normalizedCompanyName &&
        doc.normalizedCompanyName === job.normalizedCompanyName &&
        doc.normalizedTitle === job.normalizedTitle
      ) {
        signals.push({ signal: 'company_title', weight: 0.3 });
        if (doc.normalizedCity && doc.normalizedCity === job.normalizedCity) {
          signals.push({ signal: 'location', weight: 0.15 });
        }
      }
      // Posting-date proximity strengthens a match.
      if (doc.sourcePostedAt && job.sourcePostedAt) {
        const days = Math.abs(
          (new Date(doc.sourcePostedAt).getTime() -
            job.sourcePostedAt.getTime()) /
            86400000,
        );
        if (days <= 14)
          signals.push({ signal: 'posting_proximity', weight: 0.1 });
      }
      const confidence = Math.min(
        1,
        signals.reduce((s, x) => s + x.weight, 0),
      );
      if (!best || confidence > best.confidence)
        best = { doc, confidence, signals };
    }

    // Require a meaningful confidence to call it a duplicate.
    if (!best || best.confidence < 0.55) return none;

    const groupId =
      best.doc.duplicateGroupId ||
      best.doc.contentFingerprint ||
      String(best.doc._id);

    return {
      isDuplicate: true,
      matchedJobId: String(best.doc._id),
      duplicateGroupId: groupId,
      confidence: Number(best.confidence.toFixed(2)),
      signals: best.signals,
      explanation: `matched on ${best.signals.map((s) => s.signal).join(', ')}`,
      existingIsDirectEmployer:
        best.doc.isExternal === false && best.doc.source === 'Jobocate',
    };
  }
}
