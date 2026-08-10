import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
 * Greenhouse job-board adapter (compliance tier 1 — official public API).
 *
 * Reference implementation that generalizes the existing
 * src/monitors/providers/greenhouse-monitor.service.ts into the adapter
 * framework. Uses Greenhouse's public JSON endpoint
 * (boards.greenhouse.io/{board}?format=json) — no auth, no scraping.
 *
 * parseConfig:
 *   - boards: string[] of board tokens; falls back to the GREENHOUSE_BOARDS env
 *     var (kept for parity with the existing monitor).
 */
@Injectable()
export class GreenhouseAdapter implements SourceAdapter {
  readonly type = 'greenhouse';
  readonly version = '1.0.0';

  constructor(private readonly config: ConfigService) {}

  validateConfig(source: any): ConfigValidation {
    const errors: string[] = [];
    const boards = this.resolveBoards(source);
    if (!boards.length) {
      errors.push('parseConfig.boards[] or GREENHOUSE_BOARDS env required');
    }
    return { valid: errors.length === 0, errors };
  }

  async checkAvailability(ctx: AdapterContext): Promise<AvailabilityResult> {
    const board = this.resolveBoards(ctx.source)[0];
    if (!board) return { available: false, detail: 'no board configured' };
    const res = await ctx.fetcher.fetch(this.boardUrl(board), {
      maxRedirects: 2,
    });
    return { available: res.ok, detail: res.error || `HTTP ${res.status}` };
  }

  async run(ctx: AdapterContext): Promise<AdapterRunResult> {
    const errors: AdapterError[] = [];
    const rawPayloads: RawPayloadRecord[] = [];
    const items: ParsedJob[] = [];
    const presentKeys: string[] = [];
    const boards = this.resolveBoards(ctx.source);
    const max = ctx.maxItems ?? Number.MAX_SAFE_INTEGER;
    let pages = 0;

    for (const board of boards) {
      if (ctx.isCancelled?.()) break;
      if (items.length >= max) break;
      pages++;
      const res = await ctx.fetcher.fetch(this.boardUrl(board), {
        timeoutMs: ctx.source.requestTimeoutMs,
        maxRedirects: 2,
      });
      rawPayloads.push({
        sourceJobKey: `board:${board}`,
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
          message: `board ${board}: ${res.error || `HTTP ${res.status}`}`,
        });
        continue;
      }

      let data: any;
      try {
        data = JSON.parse(res.body);
      } catch (e: any) {
        errors.push({
          category: 'permanent',
          stage: 'parse',
          message: `board ${board}: ${e.message}`,
        });
        continue;
      }
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
      for (const j of jobs) {
        if (items.length >= max) break;
        const job: ParsedJob = {
          sourceJobKey: `greenhouse:${j.id}`,
          title: j.title,
          company: board || j?.offices?.[0]?.name,
          location: j?.location?.name,
          descriptionHtml: j.content, // HTML — sanitized downstream
          applyUrl: j.absolute_url,
          sourceUrl: j.absolute_url,
          postedAt: j.updated_at || j.created_at,
          raw: j,
        };
        if (!job.title) continue;
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

  private boardUrl(board: string): string {
    return `https://boards.greenhouse.io/${encodeURIComponent(board)}?format=json`;
  }

  private resolveBoards(source: any): string[] {
    const fromCfg = source?.parseConfig?.boards;
    if (Array.isArray(fromCfg) && fromCfg.length) {
      return fromCfg.map((s: string) => String(s).trim()).filter(Boolean);
    }
    const env = this.config.get<string>('GREENHOUSE_BOARDS');
    if (env) {
      return env
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }
}
