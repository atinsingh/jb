import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LiteLlmVirtualKeyClient {
  constructor(private readonly config: ConfigService) {}

  async generate(_input: {
    ownerId: string;
    keyAlias: string;
    models: string[];
    maxBudgetUsd: number;
  }): Promise<{ key: string; keyHash: string }> {
    const body = await this.request('/key/generate', {
      method: 'POST',
      body: JSON.stringify({
        key_alias: _input.keyAlias,
        models: _input.models,
        max_budget: _input.maxBudgetUsd,
        budget_duration: '1mo',
        max_parallel_requests: 1,
        metadata: {
          ownerId: _input.ownerId,
          ownerType: 'employer',
          usageContext: 'employer_resume_assessment',
        },
      }),
    });
    if (!body?.key) {
      throw new ServiceUnavailableException(
        'Employer ATS key provisioning returned an invalid response.',
      );
    }
    return { key: body.key, keyHash: body.key_name || body.token || '' };
  }

  async update(
    _key: string,
    _input: { models: string[]; maxBudgetUsd: number },
  ): Promise<void> {
    await this.request('/key/update', {
      method: 'POST',
      body: JSON.stringify({
        key: _key,
        models: _input.models,
        max_budget: _input.maxBudgetUsd,
        budget_duration: '1mo',
        max_parallel_requests: 1,
      }),
    });
  }

  async info(_key: string): Promise<{
    spendUsd: number;
    limitUsd?: number;
    resetAt?: Date;
  }> {
    const body = await this.request(`/key/info?key=${encodeURIComponent(_key)}`);
    const info = body?.info || body || {};
    const resetValue =
      info.budget_reset_at || info.budget_reset_time || info.reset_at;
    const resetAt = resetValue ? new Date(resetValue) : undefined;
    return {
      spendUsd: this.number(info.spend),
      limitUsd:
        info.max_budget == null ? undefined : this.number(info.max_budget),
      ...(resetAt && !Number.isNaN(resetAt.getTime()) ? { resetAt } : {}),
    };
  }

  async spendLogs(_from: Date, _to: Date): Promise<any[]> {
    const exclusiveEnd = new Date(_to);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    const params = new URLSearchParams({
      start_date: _from.toISOString().slice(0, 10),
      end_date: exclusiveEnd.toISOString().slice(0, 10),
      summarize: 'false',
    });
    const body = await this.request(`/spend/logs?${params.toString()}`);
    const logs = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    return logs.map((entry: any) => ({
      requestId: String(entry.request_id || entry.id || ''),
      keyAlias: String(
        entry.metadata?.user_api_key_alias || entry.api_key_alias || '',
      ),
      model: String(entry.model || ''),
      costUsd: this.number(entry.spend ?? entry.response_cost),
      promptTokens: this.number(entry.prompt_tokens),
      completionTokens: this.number(entry.completion_tokens),
      ...(entry.startTime || entry.start_time
        ? { startedAt: new Date(entry.startTime || entry.start_time) }
        : {}),
    }));
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const masterKey = this.config.get<string>('LITELLM_MASTER_KEY', '');
    if (!masterKey) {
      throw new ServiceUnavailableException(
        'Employer ATS key management is not configured.',
      );
    }
    const configuredBase = this.config.get<string>(
      'LITELLM_BASE_URL',
      'http://localhost:4000',
    );
    const base = configuredBase.replace(/\/v1\/?$/, '').replace(/\/$/, '');
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${masterKey}`,
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Employer ATS key management is unreachable.',
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Employer ATS key management failed (${response.status}).`,
      );
    }
    return response.json();
  }

  private number(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
