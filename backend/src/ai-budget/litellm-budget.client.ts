import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { AiBudgetUnavailableException } from './ai-budget.errors';
import { AiBudgetOwnerType } from './ai-budget-policy.types';

export interface LiteLlmKeyInfo {
  spendUsd: number;
  limitUsd: number;
  resetAt?: Date;
}

export interface GenerateLiteLlmBudgetKeyInput {
  ownerType: AiBudgetOwnerType;
  ownerId: string;
  pool: string;
  keyAlias: string;
  models: string[];
  maxBudgetUsd: number;
}

export interface UpdateLiteLlmBudgetKeyInput {
  models: string[];
  maxBudgetUsd: number;
}

@Injectable()
export class LiteLlmBudgetClient {
  constructor(private readonly config: ConfigService) {}

  async generate(
    input: GenerateLiteLlmBudgetKeyInput,
  ): Promise<{ key: string; keyId: string }> {
    const body = await this.request('/key/generate', {
      method: 'POST',
      body: JSON.stringify({
        key_alias: input.keyAlias,
        models: input.models,
        max_budget: input.maxBudgetUsd,
        budget_duration: '1mo',
        max_parallel_requests: 1,
        metadata: {
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          pool: input.pool,
        },
      }),
    });
    const key = this.nonEmptyString(body?.key);
    const keyId = this.nonEmptyString(body?.key_name ?? body?.token);
    if (!key || !keyId) throw new AiBudgetUnavailableException();
    return { key, keyId };
  }

  async update(key: string, input: UpdateLiteLlmBudgetKeyInput): Promise<void> {
    await this.request('/key/update', {
      method: 'POST',
      body: JSON.stringify({
        key,
        models: input.models,
        max_budget: input.maxBudgetUsd,
        budget_duration: '1mo',
        max_parallel_requests: 1,
      }),
    });
  }

  async info(key: string): Promise<LiteLlmKeyInfo> {
    const body = await this.request(`/key/info?key=${encodeURIComponent(key)}`);
    const info = body?.info ?? body;
    const spendUsd = this.nonNegativeNumber(info?.spend);
    const limitUsd = this.nonNegativeNumber(info?.max_budget);
    if (spendUsd === undefined || limitUsd === undefined) {
      throw new AiBudgetUnavailableException();
    }

    const resetValue =
      info?.budget_reset_at ?? info?.budget_reset_time ?? info?.reset_at;
    if (resetValue === undefined || resetValue === null || resetValue === '') {
      return { spendUsd, limitUsd };
    }
    const resetAt = new Date(resetValue);
    if (Number.isNaN(resetAt.getTime())) {
      throw new AiBudgetUnavailableException();
    }
    return { spendUsd, limitUsd, resetAt };
  }

  async revoke(key: string): Promise<void> {
    await this.request('/key/delete', {
      method: 'POST',
      body: JSON.stringify({ keys: [key] }),
    });
  }

  /** Recompute whole-operation credits from authoritative request attribution.
   * Late logs stay with their original operation instead of becoming a delta
   * on whichever request happens to run next. Reads never increment a balance.
   */
  async usage(
    key: string,
    from: Date,
    to: Date,
  ): Promise<{ spendUsd: number; credits: number }> {
    const operations = new Map<string, number>();
    const seen = new Set<string>();
    let pages = 1;
    for (let page = 1; page <= pages; page++) {
      const timestamp = (date: Date) =>
        date.toISOString().slice(0, 19).replace('T', ' ');
      const params = new URLSearchParams({
        api_key: createHash('sha256').update(key).digest('hex'),
        start_date: timestamp(from),
        end_date: timestamp(to),
        page: String(page),
        page_size: '1000',
        sort_order: 'asc',
      });
      const body = await this.request(`/spend/logs/v2?${params}`);
      if (
        !Array.isArray(body?.data) ||
        !Number.isInteger(body.total_pages) ||
        body.total_pages < 0 ||
        body.total_pages > 1000
      )
        throw new AiBudgetUnavailableException();
      pages = body.total_pages;
      for (const entry of body.data) {
        const id = this.nonEmptyString(entry.request_id);
        const cost = this.nonNegativeNumber(entry.spend);
        if (!id || cost === undefined) throw new AiBudgetUnavailableException();
        if (seen.has(id)) continue;
        seen.add(id);
        if (cost === 0) continue;
        const run =
          Array.isArray(entry.request_tags) &&
          entry.request_tags.find(
            (tag: unknown) =>
              typeof tag === 'string' && /^logicalRunId=.+/.test(tag),
          );
        // Missing attribution does not mean missing spend. Keep these charges
        // in one period bucket: inventing per-request operations would overbill
        // multi-call work. Tagged operations still round independently, and the
        // authoritative USD total remains intact for reconciliation/enforcement.
        const bucket = run || 'unattributed';
        operations.set(bucket, (operations.get(bucket) || 0) + cost);
      }
    }
    const costs = [...operations.values()];
    return {
      spendUsd: costs.reduce((sum, value) => sum + value, 0),
      credits: costs.reduce(
        (sum, value) => sum + Math.ceil(value * 100 - 1e-9),
        0,
      ),
    };
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const masterKey = this.config.get<string>('LITELLM_MASTER_KEY', '') || '';
    if (!masterKey) throw new AiBudgetUnavailableException();

    const configuredBase = this.config.get<string>(
      'LITELLM_BASE_URL',
      'http://localhost:4000',
    );
    const base = configuredBase.replace(/\/v1\/?$/, '').replace(/\/$/, '');
    try {
      const response = await fetch(`${base}${path}`, {
        ...init,
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${masterKey}`,
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });
      if (!response.ok) throw new AiBudgetUnavailableException();
      return await response.json();
    } catch (error) {
      if (error instanceof AiBudgetUnavailableException) throw error;
      throw new AiBudgetUnavailableException(error);
    }
  }

  private nonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private nonNegativeNumber(value: unknown): number | undefined {
    if (
      typeof value !== 'number' &&
      (typeof value !== 'string' || !value.trim())
    )
      return undefined;
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  }
}
