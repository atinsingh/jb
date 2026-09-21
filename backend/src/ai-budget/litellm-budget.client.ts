import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  }
}
