import { Injectable } from '@nestjs/common';
import {
  SourceAdapter,
  AdapterContext,
  AdapterRunResult,
  ConfigValidation,
  AvailabilityResult,
  ParsedJob,
  AdapterError,
  RawPayloadRecord,
} from './adapter.interface';

/**
 * Schema.org JobPosting JSON-LD adapter (compliance tier 3).
 *
 * Extracts <script type="application/ld+json"> blocks from an HTML page (or reads
 * a raw JSON-LD document), finds objects with @type "JobPosting", and maps the
 * standard Schema.org fields into ParsedJob. This is a first-class, widely-used
 * public structured-data format — no scraping heuristics required.
 *
 * parseConfig:
 *   - listUrl / endpoint: page(s) containing JobPosting JSON-LD
 *   - urls?: string[] of individual posting pages (each may hold one JobPosting)
 */
@Injectable()
export class JsonLdJobPostingAdapter implements SourceAdapter {
  readonly type = 'jsonld';
  readonly version = '1.0.0';

  validateConfig(source: any): ConfigValidation {
    const errors: string[] = [];
    const urls = source.parseConfig?.urls;
    if (
      !source.endpoint &&
      !source.baseUrl &&
      !(Array.isArray(urls) && urls.length)
    ) {
      errors.push('endpoint/baseUrl or parseConfig.urls[] required');
    }
    return { valid: errors.length === 0, errors };
  }

  async checkAvailability(ctx: AdapterContext): Promise<AvailabilityResult> {
    const url = this.targetUrls(ctx)[0];
    if (!url) return { available: false, detail: 'no URL configured' };
    const res = await ctx.fetcher.fetch(url, { maxRedirects: 2 });
    return { available: res.ok, detail: res.error || `HTTP ${res.status}` };
  }

  async run(ctx: AdapterContext): Promise<AdapterRunResult> {
    const errors: AdapterError[] = [];
    const rawPayloads: RawPayloadRecord[] = [];
    const items: ParsedJob[] = [];
    const presentKeys: string[] = [];
    const urls = this.targetUrls(ctx);
    const max = ctx.maxItems ?? Number.MAX_SAFE_INTEGER;
    let pages = 0;

    for (const url of urls) {
      if (ctx.isCancelled?.()) break;
      if (items.length >= max) break;
      pages++;
      const res = await ctx.fetcher.fetch(url, {
        timeoutMs: ctx.source.requestTimeoutMs,
        maxRedirects: 3,
      });
      rawPayloads.push({
        requestUrl: res.finalUrl,
        httpStatus: res.status,
        contentType: res.contentType,
        checksum: res.checksum,
        payload: res.body.slice(0, 200_000),
      });
      if (!res.ok) {
        errors.push({
          category:
            res.status === 401 || res.status === 403
              ? 'permanent'
              : 'transient',
          stage: 'fetch',
          message: res.error || `HTTP ${res.status}`,
        });
        continue;
      }

      const postings = this.extractJobPostings(res.body);
      for (const posting of postings) {
        if (items.length >= max) break;
        const job = this.mapJobPosting(posting, url);
        if (!job.title || !job.sourceJobKey) {
          errors.push({
            category: 'validation',
            stage: 'parse',
            message: 'JobPosting missing title/key',
          });
          continue;
        }
        presentKeys.push(job.sourceJobKey);
        items.push(job);
      }
    }

    return {
      items,
      rawPayloads,
      errors,
      pagesFetched: pages,
      discovered: items.length,
      presentKeys,
      complete: items.length < max,
    };
  }

  private targetUrls(ctx: AdapterContext): string[] {
    const cfg = (ctx.source.parseConfig || {}) as Record<string, any>;
    if (Array.isArray(cfg.urls) && cfg.urls.length) return cfg.urls;
    const single = ctx.source.endpoint || ctx.source.baseUrl;
    return single ? [single] : [];
  }

  /** Pull all JSON-LD blocks and flatten to JobPosting objects. Also handles a raw ld+json doc. */
  extractJobPostings(body: string): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const candidates: unknown[] = [];

    // Raw JSON-LD document?
    const trimmed = body.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        candidates.push(JSON.parse(trimmed));
      } catch {
        /* fall through to HTML extraction */
      }
    }

    // <script type="application/ld+json"> ... </script>
    const re =
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      try {
        candidates.push(JSON.parse(m[1].trim()));
      } catch {
        /* ignore malformed block */
      }
    }

    const visit = (node: unknown) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (typeof node === 'object') {
        const obj = node as Record<string, unknown>;
        const type = obj['@type'];
        const isJobPosting =
          type === 'JobPosting' ||
          (Array.isArray(type) && type.includes('JobPosting'));
        if (isJobPosting) found.push(obj);
        // @graph containers
        if (Array.isArray(obj['@graph']))
          (obj['@graph'] as unknown[]).forEach(visit);
      }
    };
    candidates.forEach(visit);
    return found;
  }

  /** Map a Schema.org JobPosting object into ParsedJob. */
  mapJobPosting(p: Record<string, any>, sourceUrl: string): ParsedJob {
    const org = p.hiringOrganization || {};
    const loc = Array.isArray(p.jobLocation) ? p.jobLocation[0] : p.jobLocation;
    const addr = loc?.address || {};
    const salary = p.baseSalary || {};
    const salaryValue = salary.value || {};
    const remoteType = p.jobLocationType; // "TELECOMMUTE" per schema.org

    const key =
      p.identifier?.value ||
      (typeof p.identifier === 'string' ? p.identifier : undefined) ||
      p.url ||
      sourceUrl;

    return {
      sourceJobKey: String(key),
      title: p.title,
      company: typeof org === 'string' ? org : org.name,
      companyDomain: this.domainOf(org.sameAs || org.url),
      location: this.formatAddress(addr),
      descriptionHtml: p.description,
      applyUrl: p.url || p.applyUrl || sourceUrl,
      sourceUrl,
      postedAt: p.datePosted,
      expiresAt: p.validThrough,
      employmentType: Array.isArray(p.employmentType)
        ? p.employmentType[0]
        : p.employmentType,
      remote: remoteType === 'TELECOMMUTE',
      workplaceType: remoteType === 'TELECOMMUTE' ? 'remote' : undefined,
      salaryMin: this.num(salaryValue.minValue ?? salaryValue.value),
      salaryMax: this.num(salaryValue.maxValue ?? salaryValue.value),
      salaryCurrency: salary.currency,
      salaryPeriod: this.mapUnit(salaryValue.unitText),
      skills: this.toArray(p.skills),
      requirements: this.toArray(p.qualifications || p.experienceRequirements),
      raw: p,
    };
  }

  private formatAddress(addr: Record<string, any>): string | undefined {
    if (!addr || typeof addr !== 'object') return undefined;
    const parts = [
      addr.addressLocality,
      addr.addressRegion,
      addr.addressCountry?.name || addr.addressCountry,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  }

  private domainOf(url?: string): string | undefined {
    if (!url || typeof url !== 'string') return undefined;
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return undefined;
    }
  }

  private num(v: unknown): number | undefined {
    if (v === null || v === undefined || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private mapUnit(unit?: string): string | undefined {
    if (!unit) return undefined;
    const u = unit.toUpperCase();
    if (u === 'YEAR') return 'year';
    if (u === 'MONTH') return 'month';
    if (u === 'WEEK') return 'week';
    if (u === 'DAY') return 'day';
    if (u === 'HOUR') return 'hour';
    return undefined;
  }

  private toArray(v: unknown): string[] | undefined {
    if (!v) return undefined;
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string')
      return v
        .split(/[;,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    return undefined;
  }
}
