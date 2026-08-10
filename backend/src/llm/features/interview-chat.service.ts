import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { LLMChatMessage } from '../interfaces/llm-provider.interface';

/**
 * InterviewChatService
 *
 * Modern `llm/`-stack replacement for the legacy interview-coaching chat
 * (`AiProviderService.generateChatResponse`). Returns a plain free-form
 * assistant string — there is NO JSON/Zod contract for a conversational reply.
 *
 * Uses feature `INTERVIEW_COACHING`, whose entitlement is
 * `interview_sessions_per_month` (also seeded to `0` on FREE), which is
 * exactly why the no-quota flag matters: enforcing quota here would lock out
 * every FREE user, so enforcement is opt-in via `LLM_ENFORCE_QUOTA`
 * (default `false`).
 */
@Injectable()
export class InterviewChatService {
  private readonly logger = new Logger(InterviewChatService.name);

  /**
   * Opt-in quota gate. Off by default so FREE users (who have
   * `interview_sessions_per_month = 0`) are not locked out of a flow that had
   * no quota in the legacy path. When off, skip `enforceQuota` and record
   * usage best-effort only.
   */
  private readonly enforceQuotaEnabled: boolean;

  constructor(
    private readonly routingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
    private readonly configService: ConfigService,
  ) {
    this.enforceQuotaEnabled =
      (this.configService.get<string>('LLM_ENFORCE_QUOTA') || 'false')
        .toString()
        .toLowerCase() === 'true';
  }

  /**
   * Produce a free-form assistant reply for an interview-coaching conversation.
   * @param messages full chat transcript (system/user/assistant turns)
   * @returns the assistant's reply text (plain string)
   * @throws a clean Error on provider failure so the caller can fall back.
   */
  async chat(userId: string, messages: LLMChatMessage[]): Promise<string> {
    if (this.enforceQuotaEnabled) {
      await this.quotaService.enforceQuota(
        userId,
        LLMFeature.INTERVIEW_COACHING,
      );
    }

    const provider = this.routingService.getProviderForFeature(
      LLMFeature.INTERVIEW_COACHING,
    );
    const config = this.routingService.getFeatureConfig(
      LLMFeature.INTERVIEW_COACHING,
    );

    try {
      const response = await provider.chat({
        messages,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      await this.recordUsageBestEffort(
        userId,
        provider.getName(),
        config.model,
        response.usage,
        { messageCount: messages.length },
      );

      return response.content;
    } catch (error: any) {
      this.logger.error('Error generating interview chat response:', error);
      throw error;
    }
  }

  private async recordUsageBestEffort(
    userId: string,
    provider: string,
    model: string,
    usage: any,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.INTERVIEW_COACHING,
        provider,
        model,
        usage,
        metadata,
      );
    } catch (err) {
      this.logger.warn(
        `recordUsageAndIncrement failed (non-fatal) for interview chat: ${
          (err as Error)?.message
        }`,
      );
    }
  }
}
