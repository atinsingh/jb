import { Injectable } from '@nestjs/common';
import { NormalizedJob } from './normalizer.service';
import { UrlSafetyService } from './url-safety.service';

export interface ValidationIssue {
  code: string;
  severity: 'hard' | 'soft';
  message: string;
}

export interface ValidationResult {
  verdict: 'pass' | 'review' | 'reject';
  issues: ValidationIssue[];
}

/**
 * Validator (spec §6). Hard failures => reject (never published). Soft failures
 * => review (admin queue). No issues => pass (eligible for auto-publish subject
 * to quality scoring).
 *
 * URL checks reuse UrlSafetyService so a tracking/redirect/internal apply URL is
 * caught here too, not only at fetch time.
 */
@Injectable()
export class ValidatorService {
  // Obvious prohibited/suspicious markers (scam / MLM / fee-for-job signals).
  private static readonly SUSPICIOUS = [
    /\bwire transfer\b/i,
    /\bpay(ment)? (a )?fee\b/i,
    /\bsend money\b/i,
    /\bgift cards?\b/i,
    /\bwestern union\b/i,
    /\bwork from home guaranteed\b/i,
    /\bearn \$?\d{3,}\s*(per day|\/day|daily)\b/i,
    /\bno experience.*\$\d{3,}/i,
  ];

  constructor(private readonly urlSafety: UrlSafetyService) {}

  async validate(job: NormalizedJob): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const hard = (code: string, message: string) =>
      issues.push({ code, severity: 'hard', message });
    const soft = (code: string, message: string) =>
      issues.push({ code, severity: 'soft', message });

    // --- Required fields ---
    if (!job.title || job.title.length < 2)
      hard('missing_title', 'title missing/too short');
    if (!job.companyName || job.companyName === 'Unknown')
      soft('missing_company', 'employer identity unclear');
    if (!job.sourceJobKey) hard('missing_key', 'no source job key');

    // --- Application URL ---
    const applyUrl = job.originalApplyUrl || job.externalUrl;
    if (!applyUrl) {
      hard('missing_apply_url', 'no application/source URL');
    } else {
      const { url, error } = this.urlSafety.parseAndCheckProtocol(applyUrl);
      if (error || !url) {
        hard(
          'bad_apply_url',
          `invalid application URL: ${error || 'malformed'}`,
        );
      } else if (this.looksLikeTracker(url)) {
        soft('tracking_url', 'application URL looks like a tracker/redirect');
      }
    }

    // --- Description completeness ---
    const descLen =
      (job.shortDescription || '').length + (job.description || '').length;
    if (descLen < 40) soft('thin_description', 'description very short');

    // --- Dates ---
    if (job.sourceExpiresAt && job.sourceExpiresAt.getTime() < Date.now()) {
      hard('already_expired', 'source expiration date is in the past');
    }
    if (
      job.sourcePostedAt &&
      job.sourcePostedAt.getTime() > Date.now() + 86400000
    ) {
      soft('future_posted', 'posted date is in the future');
    }

    // --- Salary consistency ---
    if (
      job.salaryMin != null &&
      job.salaryMax != null &&
      job.salaryMin > job.salaryMax
    ) {
      soft('salary_range', 'salary min exceeds max');
    }

    // --- Suspicious / prohibited content ---
    const haystack = `${job.title} ${job.shortDescription} ${job.companyName}`;
    if (ValidatorService.SUSPICIOUS.some((re) => re.test(haystack))) {
      hard('suspicious_content', 'matched a prohibited/scam pattern');
    }

    // --- Keyword stuffing (soft quality signal) ---
    if (this.looksStuffed(job.title))
      soft('keyword_stuffing', 'title looks keyword-stuffed');

    const verdict = issues.some((i) => i.severity === 'hard')
      ? 'reject'
      : issues.length > 0
        ? 'review'
        : 'pass';
    return { verdict, issues };
  }

  private looksLikeTracker(url: URL): boolean {
    const trackerHosts =
      /(doubleclick|adservice|utm_redirect|click\.|track\.|redirect\.)/i;
    const hasTrackingParams = /(utm_|gclid|fbclid|aff_id|clickid)/i.test(
      url.search,
    );
    return (
      trackerHosts.test(url.hostname) ||
      (hasTrackingParams && !/apply|jobs?|careers?/i.test(url.pathname))
    );
  }

  private looksStuffed(title: string): boolean {
    if (!title) return false;
    const words = title.toLowerCase().split(/\s+/);
    if (words.length < 6) return false;
    const unique = new Set(words);
    return unique.size / words.length < 0.6; // heavy repetition
  }
}
