import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { ParsedJob } from '../adapters/adapter.interface';
import { IngestionSourceDocument } from '../schemas/ingestion-source.schema';
import { HtmlSanitizerService } from './html-sanitizer.service';
import {
  normalizeEmploymentType,
  normalizeWorkplaceType,
  inferRemote,
  normalizeSeniority,
  normalizeTitle,
  normalizeCompany,
  normalizeSkills,
  normalizeCurrency,
  normalizeSalaryPeriod,
  parseSalaryText,
} from './taxonomy';

/** Canonical, ready-to-persist shape (subset of the Job schema) + provenance. */
export interface NormalizedJob {
  title: string;
  normalizedTitle?: string;
  companyName: string;
  normalizedCompanyName?: string;
  employerDomain?: string;
  location: string;
  normalizedCity?: string;
  region?: string;
  country?: string;
  workplaceType?: string;
  isRemote?: boolean;
  description: string; // sanitized HTML
  shortDescription?: string;
  skills: string[];
  requirements: string[];
  employmentType?: string;
  seniority?: string;
  salary: string; // display string
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  salaryDisclosed: boolean;
  salaryEstimated: boolean;
  externalUrl: string;
  originalApplyUrl: string;
  sourceUrl: string;
  sourceJobKey: string;
  externalId: string;
  contentFingerprint: string;
  sourcePostedAt?: Date;
  sourceExpiresAt?: Date;
  provenance: Record<string, string>;
  confidenceScore: number;
}

/**
 * Normalizer (spec §5). Maps a source-flavored ParsedJob into Jobocate's
 * canonical model using the controlled taxonomies. Records per-field provenance
 * ('source' when taken verbatim, 'normalization' when a rule transformed it) and
 * computes a stable content fingerprint for deduplication.
 *
 * It never invents compensation: salaryDisclosed is true only when the source
 * actually provided a value; a parsed-from-text salary is marked estimated=false
 * but disclosed only if numeric values were present in source fields (not guessed).
 */
@Injectable()
export class NormalizerService {
  constructor(private readonly sanitizer: HtmlSanitizerService) {}

  normalize(parsed: ParsedJob, source: IngestionSourceDocument): NormalizedJob {
    const provenance: Record<string, string> = {};
    const mark = (field: string, origin: string) =>
      (provenance[field] = origin);

    const title = (parsed.title || '').trim();
    mark('title', 'source');
    const normalizedTitle = normalizeTitle(title);
    if (normalizedTitle) mark('normalizedTitle', 'normalization');

    const companyName = (parsed.company || 'Unknown').trim();
    mark('companyName', parsed.company ? 'source' : 'normalization');
    const normalizedCompanyName = normalizeCompany(companyName);

    const location = (parsed.location || 'Not specified').trim();
    mark('location', parsed.location ? 'source' : 'normalization');
    const { city, region, country } = this.splitLocation(location);

    const isRemote =
      parsed.remote === true ||
      inferRemote(parsed.location) ||
      inferRemote(parsed.title) ||
      inferRemote(parsed.workplaceType);
    const workplaceType =
      normalizeWorkplaceType(parsed.workplaceType, isRemote) ||
      (isRemote ? 'remote' : undefined);
    if (workplaceType) mark('workplaceType', 'normalization');

    const descriptionRaw = parsed.descriptionHtml || '';
    const description = this.sanitizer.sanitize(descriptionRaw);
    mark('description', 'source');
    const plain = this.sanitizer.toPlainText(description);
    const shortDescription = plain.slice(0, 280);

    const skills = normalizeSkills(parsed.skills);
    if (skills.length) mark('skills', 'normalization');
    const requirements = (parsed.requirements || [])
      .map((r) => r.trim())
      .filter(Boolean);

    const employmentType = normalizeEmploymentType(parsed.employmentType);
    if (employmentType) mark('employmentType', 'normalization');
    const seniority = normalizeSeniority(parsed.seniority, title);
    if (seniority) mark('seniority', 'normalization');

    const comp = this.normalizeCompensation(parsed);
    if (comp.salaryDisclosed) mark('salary', 'source');

    const externalUrl = (parsed.sourceUrl || parsed.applyUrl || '').trim();
    const originalApplyUrl = (parsed.applyUrl || parsed.sourceUrl || '').trim();
    const sourceUrl = (parsed.sourceUrl || parsed.applyUrl || '').trim();
    mark('originalApplyUrl', 'source');

    const externalId = `${source.sourceId}:${parsed.sourceJobKey}`;
    const contentFingerprint = this.fingerprint(
      normalizedCompanyName,
      normalizedTitle,
      city,
      plain,
    );

    return {
      title,
      normalizedTitle,
      companyName,
      normalizedCompanyName,
      employerDomain: parsed.companyDomain,
      location,
      normalizedCity: city,
      region,
      country,
      workplaceType,
      isRemote,
      description,
      shortDescription,
      skills,
      requirements,
      employmentType,
      seniority,
      salary: comp.display,
      salaryMin: comp.min,
      salaryMax: comp.max,
      salaryCurrency: comp.currency,
      salaryPeriod: comp.period,
      salaryDisclosed: comp.salaryDisclosed,
      salaryEstimated: false, // this pipeline never infers/estimates salary
      externalUrl,
      originalApplyUrl,
      sourceUrl,
      sourceJobKey: parsed.sourceJobKey,
      externalId,
      contentFingerprint,
      sourcePostedAt: this.toDate(parsed.postedAt),
      sourceExpiresAt: this.toDate(parsed.expiresAt),
      provenance,
      confidenceScore: this.confidence(parsed),
    };
  }

  /** Stable dedup hash from the strongest identity signals. */
  fingerprint(
    company?: string,
    title?: string,
    city?: string,
    description?: string,
  ): string {
    const basis = [
      company || '',
      title || '',
      city || '',
      (description || '').slice(0, 400),
    ]
      .join('||')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return createHash('sha256').update(basis).digest('hex');
  }

  private normalizeCompensation(parsed: ParsedJob) {
    let min = parsed.salaryMin;
    let max = parsed.salaryMax;
    let currency = normalizeCurrency(parsed.salaryCurrency);
    let period = normalizeSalaryPeriod(parsed.salaryPeriod);
    // Disclosed only if the SOURCE gave numeric structured values.
    const structuredDisclosed = min != null || max != null;

    // If only free text is present, parse it — but this is still source-provided
    // text, so it counts as disclosed (not an inference).
    if (!structuredDisclosed && parsed.salaryText) {
      const parsedText = parseSalaryText(parsed.salaryText);
      min = parsedText.min;
      max = parsedText.max;
      currency = currency || parsedText.currency;
      period = period || parsedText.period;
    }
    const salaryDisclosed = min != null || max != null;

    let display = 'Not specified';
    if (salaryDisclosed) {
      const cur = currency || '';
      const per = period ? `/${period}` : '';
      display =
        min != null && max != null && min !== max
          ? `${cur}${this.fmt(min)} - ${cur}${this.fmt(max)}${per}`
          : `${cur}${this.fmt(max ?? min!)}${per}`;
    } else if (parsed.salaryText) {
      display = parsed.salaryText.trim();
    }

    return { min, max, currency, period, salaryDisclosed, display };
  }

  private fmt(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  private splitLocation(loc: string): {
    city?: string;
    region?: string;
    country?: string;
  } {
    if (!loc || /not specified/i.test(loc)) return {};
    if (/\bremote\b/i.test(loc) && loc.split(',').length === 1) return {};
    const parts = loc
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 1) return { city: parts[0] };
    if (parts.length === 2) return { city: parts[0], region: parts[1] };
    return {
      city: parts[0],
      region: parts[1],
      country: parts[parts.length - 1],
    };
  }

  private toDate(v?: string | Date): Date | undefined {
    if (!v) return undefined;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }

  /** Simple confidence from field completeness (0-1). */
  private confidence(p: ParsedJob): number {
    let score = 0;
    if (p.title) score += 0.35;
    if (p.company) score += 0.2;
    if (p.descriptionHtml) score += 0.2;
    if (p.applyUrl || p.sourceUrl) score += 0.15;
    if (p.location) score += 0.1;
    return Math.min(1, Number(score.toFixed(2)));
  }
}
