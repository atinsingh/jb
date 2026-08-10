import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { parse } from 'csv-parse/sync';
import {
  SourceAdapter,
  AdapterContext,
  AdapterRunResult,
  ConfigValidation,
  AvailabilityResult,
  ParsedJob,
  AdapterError,
} from './adapter.interface';
import { applyFieldMap, FieldMap } from './mapping.util';

/**
 * CSV import adapter (compliance tier 5 — manual import).
 *
 * Reads `ctx.uploadedContent` (the CSV body an admin uploaded). No network. Each
 * row becomes a ParsedJob via parseConfig.fieldMap (column name -> ParsedJob
 * field), or a set of default column names when no map is provided.
 */
@Injectable()
export class CsvImportAdapter implements SourceAdapter {
  readonly type = 'csv_import';
  readonly version = '1.0.0';

  private static readonly DEFAULT_MAP: FieldMap = {
    sourceJobKey: 'external_id',
    title: 'title',
    company: 'company',
    location: 'location',
    descriptionHtml: 'description',
    applyUrl: 'apply_url',
    sourceUrl: 'source_url',
    postedAt: 'posted_at',
    expiresAt: 'expires_at',
    employmentType: 'employment_type',
    workplaceType: 'workplace_type',
    salaryText: 'salary',
    salaryMin: 'salary_min',
    salaryMax: 'salary_max',
    salaryCurrency: 'salary_currency',
    skills: 'skills',
  };

  validateConfig(): ConfigValidation {
    // CSV needs no source config; content is supplied per-run.
    return { valid: true, errors: [] };
  }

  async checkAvailability(): Promise<AvailabilityResult> {
    return { available: true, detail: 'CSV is upload-driven' };
  }

  async run(ctx: AdapterContext): Promise<AdapterRunResult> {
    const errors: AdapterError[] = [];
    const items: ParsedJob[] = [];
    const presentKeys: string[] = [];

    if (!ctx.uploadedContent) {
      errors.push({
        category: 'validation',
        stage: 'fetch',
        message: 'no CSV content supplied',
      });
      return { items, rawPayloads: [], errors, pagesFetched: 0, discovered: 0 };
    }

    const cfg = (ctx.source.parseConfig || {}) as Record<string, any>;
    const fieldMap: FieldMap =
      cfg.fieldMap && Object.keys(cfg.fieldMap).length
        ? cfg.fieldMap
        : CsvImportAdapter.DEFAULT_MAP;

    let rows: Record<string, unknown>[];
    try {
      rows = parse(ctx.uploadedContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      });
    } catch (e: any) {
      errors.push({
        category: 'permanent',
        stage: 'parse',
        message: `invalid CSV: ${e.message}`,
      });
      return { items, rawPayloads: [], errors, pagesFetched: 0, discovered: 0 };
    }

    const max = ctx.maxItems ?? Number.MAX_SAFE_INTEGER;
    for (const row of rows) {
      if (items.length >= max) break;
      const job = applyFieldMap(row, fieldMap);
      if (!job.sourceJobKey) {
        job.sourceJobKey =
          job.applyUrl ||
          job.sourceUrl ||
          `${job.company || ''}|${job.title || ''}`;
      }
      if (!job.title || !job.sourceJobKey) {
        errors.push({
          category: 'validation',
          stage: 'parse',
          message: 'row missing title/key',
          sourceJobKey: job.sourceJobKey,
        });
        continue;
      }
      presentKeys.push(job.sourceJobKey);
      items.push(job);
    }

    return {
      items,
      // The whole upload is one raw payload (checksum lets us dedupe re-uploads).
      rawPayloads: [
        {
          checksum: createHash('sha256')
            .update(ctx.uploadedContent)
            .digest('hex'),
          payload: ctx.uploadedContent.slice(0, 200_000),
          contentType: 'text/csv',
        },
      ],
      errors,
      pagesFetched: 0,
      discovered: rows.length,
      presentKeys,
      complete: items.length < max,
    };
  }
}
