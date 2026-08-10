import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
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
 * Approved HTML career-page adapter (compliance tier 4 — LAST resort).
 *
 * This adapter ONLY runs when the source is explicitly `complianceStatus:
 * 'approved'`; otherwise it refuses (permanent error). It never bypasses auth,
 * CAPTCHAs, or anti-bot protections and it does not rotate identity — if a page
 * is protected, mark the source `unsupported` instead. Selectors are supplied by
 * an admin in parseConfig (no guessing):
 *   - itemSelector: CSS selector for each job card
 *   - fields: { title, company, location, apply, description } CSS selectors,
 *     each optional; `@attr` suffix reads an attribute (e.g. "a@href").
 */
@Injectable()
export class HtmlCareerPageAdapter implements SourceAdapter {
  readonly type = 'html_careerpage';
  readonly version = '1.0.0';

  validateConfig(source: any): ConfigValidation {
    const errors: string[] = [];
    if (!source.endpoint && !source.baseUrl)
      errors.push('endpoint or baseUrl required');
    if (!source.parseConfig?.itemSelector) {
      errors.push(
        'parseConfig.itemSelector required (CSS selector for each job)',
      );
    }
    if (source.complianceStatus !== 'approved') {
      errors.push(
        'HTML career-page collection requires complianceStatus "approved"',
      );
    }
    return { valid: errors.length === 0, errors };
  }

  async checkAvailability(ctx: AdapterContext): Promise<AvailabilityResult> {
    const url = ctx.source.endpoint || ctx.source.baseUrl!;
    const res = await ctx.fetcher.fetch(url, { maxRedirects: 2 });
    return { available: res.ok, detail: res.error || `HTTP ${res.status}` };
  }

  async run(ctx: AdapterContext): Promise<AdapterRunResult> {
    const errors: AdapterError[] = [];
    const rawPayloads: RawPayloadRecord[] = [];
    const items: ParsedJob[] = [];
    const presentKeys: string[] = [];

    // Hard compliance gate — refuse rather than scrape a non-approved page.
    if (ctx.source.complianceStatus !== 'approved') {
      errors.push({
        category: 'permanent',
        stage: 'fetch',
        message: 'source not compliance-approved for HTML collection',
      });
      return { items, rawPayloads, errors, pagesFetched: 0, discovered: 0 };
    }

    const url = ctx.source.endpoint || ctx.source.baseUrl!;
    const cfg = (ctx.source.parseConfig || {}) as Record<string, any>;
    const itemSelector: string = cfg.itemSelector;
    const fields = (cfg.fields || {}) as Record<string, string>;
    const max = ctx.maxItems ?? Number.MAX_SAFE_INTEGER;

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
          res.status === 401 || res.status === 403 ? 'permanent' : 'transient',
        stage: 'fetch',
        message: res.error || `HTTP ${res.status}`,
      });
      return { items, rawPayloads, errors, pagesFetched: 1, discovered: 0 };
    }

    const $ = cheerio.load(res.body);
    const cards = $(itemSelector);
    cards.each((_i, el) => {
      if (items.length >= max) return;
      const read = (sel?: string): string | undefined => {
        if (!sel) return undefined;
        const [selector, attr] = sel.split('@');
        const node = selector ? $(el).find(selector) : $(el);
        if (!node || node.length === 0) return undefined;
        const val = attr ? node.attr(attr) : node.text();
        return val ? val.trim() : undefined;
      };

      const applyUrl = this.absolutize(read(fields.apply), url);
      const title = read(fields.title);
      const key = applyUrl || `${read(fields.company) || ''}|${title || ''}`;
      if (!title || !key) return;

      const job: ParsedJob = {
        sourceJobKey: key,
        title,
        company: read(fields.company),
        location: read(fields.location),
        descriptionHtml: read(fields.description),
        applyUrl,
        sourceUrl: url,
      };
      presentKeys.push(job.sourceJobKey);
      items.push(job);
    });

    return {
      items,
      rawPayloads,
      errors,
      pagesFetched: 1,
      discovered: cards.length,
      presentKeys,
      complete: items.length < max,
    };
  }

  private absolutize(
    href: string | undefined,
    base: string,
  ): string | undefined {
    if (!href) return undefined;
    try {
      return new URL(href, base).toString();
    } catch {
      return undefined;
    }
  }
}
