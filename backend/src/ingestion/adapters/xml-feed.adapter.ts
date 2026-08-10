import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
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
import { applyFieldMap, locateItems, pick, FieldMap } from './mapping.util';

/**
 * XML / RSS / Atom feed adapter (compliance tier 2).
 *
 * Parsing uses fast-xml-parser, which does NOT resolve external entities — so it
 * is safe against XXE by construction (no DOCTYPE/entity expansion, spec §15). We
 * additionally reject any payload containing a DOCTYPE as defence in depth.
 *
 * parseConfig:
 *   - itemsPath?: dot-path to the item array after XML->JSON (auto-detects RSS
 *     `rss.channel.item` and Atom `feed.entry`)
 *   - fieldMap: ParsedJob field -> dot-path within each item
 */
@Injectable()
export class XmlFeedAdapter implements SourceAdapter {
  readonly type = 'xml_feed';
  readonly version = '1.0.0';

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    // fast-xml-parser never expands external entities; these keep output tidy.
    processEntities: true,
    htmlEntities: true,
  });

  validateConfig(source: any): ConfigValidation {
    const errors: string[] = [];
    if (!source.endpoint && !source.baseUrl)
      errors.push('endpoint or baseUrl required');
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
    const url = ctx.source.endpoint || ctx.source.baseUrl!;
    const cfg = (ctx.source.parseConfig || {}) as Record<string, any>;
    const fieldMap: FieldMap = cfg.fieldMap || {};
    const max = ctx.maxItems ?? Number.MAX_SAFE_INTEGER;

    const res = await ctx.fetcher.fetch(url, {
      timeoutMs: ctx.source.requestTimeoutMs,
      maxRedirects: 2,
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

    // Defence in depth: refuse DOCTYPE (XXE / entity-expansion vector).
    if (/<!DOCTYPE/i.test(res.body)) {
      errors.push({
        category: 'permanent',
        stage: 'parse',
        message: 'DOCTYPE not allowed (XXE protection)',
      });
      return { items, rawPayloads, errors, pagesFetched: 1, discovered: 0 };
    }

    let doc: unknown;
    try {
      doc = this.parser.parse(res.body);
    } catch (e: any) {
      errors.push({
        category: 'permanent',
        stage: 'parse',
        message: `invalid XML: ${e.message}`,
      });
      return { items, rawPayloads, errors, pagesFetched: 1, discovered: 0 };
    }

    const rawItems = this.locateFeedItems(doc, cfg.itemsPath);
    for (const raw of rawItems) {
      if (items.length >= max) break;
      const job = Object.keys(fieldMap).length
        ? applyFieldMap(raw, fieldMap)
        : this.defaultFeedMap(raw);
      if (!job.sourceJobKey)
        job.sourceJobKey =
          job.applyUrl ||
          job.sourceUrl ||
          `${job.company || ''}|${job.title || ''}`;
      if (!job.title || !job.sourceJobKey) {
        errors.push({
          category: 'validation',
          stage: 'parse',
          message: 'item missing title/key',
        });
        continue;
      }
      presentKeys.push(job.sourceJobKey);
      items.push(job);
    }

    return {
      items,
      rawPayloads,
      errors,
      pagesFetched: 1,
      discovered: rawItems.length,
      presentKeys,
      complete: items.length < max,
    };
  }

  private locateFeedItems(
    doc: unknown,
    itemsPath?: string,
  ): Record<string, unknown>[] {
    if (itemsPath) return locateItems(doc, itemsPath);
    // RSS 2.0
    const rssItems = pick(doc, 'rss.channel.item');
    if (Array.isArray(rssItems)) return rssItems as Record<string, unknown>[];
    if (rssItems && typeof rssItems === 'object')
      return [rssItems as Record<string, unknown>];
    // Atom
    const atom = pick(doc, 'feed.entry');
    if (Array.isArray(atom)) return atom as Record<string, unknown>[];
    if (atom && typeof atom === 'object')
      return [atom as Record<string, unknown>];
    return [];
  }

  /** Default RSS/Atom item mapping when no explicit fieldMap is provided. */
  private defaultFeedMap(item: Record<string, any>): ParsedJob {
    const link =
      typeof item.link === 'object'
        ? item.link['@_href'] || item.link['#text']
        : item.link;
    return {
      sourceJobKey: String(
        item.guid?.['#text'] || item.guid || item.id || link || '',
      ),
      title: typeof item.title === 'object' ? item.title['#text'] : item.title,
      descriptionHtml:
        item.description ||
        item.summary ||
        item.content?.['#text'] ||
        item.content,
      applyUrl: link,
      sourceUrl: link,
      company: item['job:company'] || item.author?.name || item.author,
      location: item['job:location'],
      postedAt: item.pubDate || item.published || item.updated,
      raw: item,
    };
  }
}
