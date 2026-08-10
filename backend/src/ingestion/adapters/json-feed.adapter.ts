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
import { applyFieldMap, locateItems, FieldMap } from './mapping.util';

/**
 * Generic JSON-feed adapter. Reads `parseConfig`:
 *   - itemsPath?: dot-path to the job array (auto-detected if omitted)
 *   - fieldMap: ParsedJob field -> dot-path within each item
 *   - keyField?: dot-path used as sourceJobKey if fieldMap.sourceJobKey absent
 *
 * Compliant tier 2 (partner JSON feed). No pagination assumptions beyond an
 * optional `nextPath` cursor in parseConfig; single-page by default.
 */
@Injectable()
export class JsonFeedAdapter implements SourceAdapter {
  readonly type = 'json_feed';
  readonly version = '1.0.0';

  validateConfig(source: any): ConfigValidation {
    const errors: string[] = [];
    if (!source.endpoint && !source.baseUrl)
      errors.push('endpoint or baseUrl required');
    const fieldMap = source.parseConfig?.fieldMap;
    if (!fieldMap || typeof fieldMap !== 'object') {
      errors.push(
        'parseConfig.fieldMap required (map ParsedJob fields to dot-paths)',
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
    const url = ctx.source.endpoint || ctx.source.baseUrl!;
    const cfg = (ctx.source.parseConfig || {}) as Record<string, any>;
    const fieldMap: FieldMap = cfg.fieldMap || {};
    const keyField: string | undefined = cfg.keyField;

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

    let parsed: unknown;
    try {
      parsed = JSON.parse(res.body);
    } catch (e: any) {
      errors.push({
        category: 'permanent',
        stage: 'parse',
        message: `invalid JSON: ${e.message}`,
      });
      return { items, rawPayloads, errors, pagesFetched: 1, discovered: 0 };
    }

    const rawItems = locateItems(parsed, cfg.itemsPath);
    const presentKeys: string[] = [];
    const max = ctx.maxItems ?? Number.MAX_SAFE_INTEGER;

    for (const raw of rawItems) {
      if (items.length >= max) break;
      const job = applyFieldMap(raw, fieldMap);
      if (!job.sourceJobKey && keyField) {
        const k = raw[keyField as keyof typeof raw];
        if (k !== undefined && k !== null) job.sourceJobKey = String(k);
      }
      if (!job.sourceJobKey) {
        // Synthesize a stable key from apply/source URL or title+company.
        job.sourceJobKey =
          job.applyUrl ||
          job.sourceUrl ||
          `${job.company || ''}|${job.title || ''}`;
      }
      if (!job.title || !job.sourceJobKey) {
        errors.push({
          category: 'validation',
          stage: 'parse',
          message: 'missing title/key',
          sourceJobKey: job.sourceJobKey,
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
}
