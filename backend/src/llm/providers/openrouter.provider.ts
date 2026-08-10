import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  LLMProvider,
  LLMCompletionOptions,
  LLMChatOptions,
  LLMChatWithToolsOptions,
  LLMResponse,
  LLMChatMessage,
  LLMToolCall,
  LLMUsage,
} from '../interfaces/llm-provider.interface';

/**
 * OpenRouterProvider
 *
 * OpenRouter is an OpenAI-compatible gateway in front of ~400 models from every
 * major lab, so this provider reuses the `openai` SDK with a different baseURL
 * and key. Activated per-feature via `LLM_<FEATURE>_PROVIDER=openrouter` (or
 * globally with `LLM_DEFAULT_PROVIDER=openrouter`) + `OPENROUTER_API_KEY`.
 *
 * Two things differ from the plain OpenAI provider and are worth knowing:
 *
 * 1. **Cost is reported, not computed.** Passing `usage: { include: true }`
 *    makes OpenRouter return the real charged `usage.cost` in USD, so unlike
 *    `OpenAIProvider` we never keep a per-model price table that can drift.
 *
 * 2. **Model fallback is server-side.** `OPENROUTER_FALLBACK_MODELS` is sent as
 *    the `models` array, and OpenRouter transparently retries the next model
 *    when the primary is down or rate-limited upstream. That matters on the free
 *    tier, where `:free` slugs share an upstream pool and 429 regularly.
 *
 * The default model is a `:free` slug that supports both tool-calling and JSON
 * output, so an unfunded key costs nothing out of the box. Pointing
 * `OPENROUTER_MODEL` at any non-`:free` slug bills the account's credit balance.
 */
/**
 * Default OpenRouter model slug. A `:free` slug that supports both tool-calling
 * and JSON output, so it works on a credit-less key. Override with
 * `OPENROUTER_MODEL`.
 */
export const DEFAULT_OPENROUTER_MODEL =
  'nvidia/nemotron-3-super-120b-a12b:free';

@Injectable()
export class OpenRouterProvider implements LLMProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);
  private client?: OpenAI;

  private readonly defaultModel: string;
  /** Extra models OpenRouter may fall back to, in order, when the primary fails. */
  private readonly fallbackModels: string[];

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    this.defaultModel = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    this.fallbackModels = (process.env.OPENROUTER_FALLBACK_MODELS || '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    if (!apiKey) {
      this.logger.warn('OpenRouter API key not found');
      return;
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        // Optional attribution headers — they put the app on OpenRouter's
        // leaderboards and are echoed back in the activity log.
        'HTTP-Referer':
          process.env.OPENROUTER_SITE_URL ||
          process.env.FRONTEND_URL ||
          'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Jobocate',
      },
    });
    this.logger.log(
      `✅ OpenRouter provider initialized (model: ${this.defaultModel})`,
    );
  }

  getName(): string {
    return 'openrouter';
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async complete(
    prompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse<string>> {
    return this.chat({
      ...(options || {}),
      messages: [{ role: 'user', content: prompt }],
    });
  }

  async chat(options: LLMChatOptions): Promise<LLMResponse<string>> {
    if (options.stream) {
      throw new Error(
        'Streaming responses are not yet supported in this implementation',
      );
    }

    const completion = await this.createCompletion({
      ...this.baseRequest(options),
      messages: options.messages.map((msg) => this.toOpenAIMessage(msg)),
    });

    const choice = completion.choices[0];

    return {
      content: this.extractContent(choice),
      usage: this.toUsage(completion.usage),
      model: completion.model,
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Tool-enabled chat completion. OpenRouter normalizes every upstream model
   * onto the OpenAI `tools` / `tool_calls` shape, so the mapping here is the
   * same one `OpenAIProvider` uses.
   */
  async chatWithTools(
    options: LLMChatWithToolsOptions,
  ): Promise<LLMResponse<string> & { toolCalls?: LLMToolCall[] }> {
    const completion = await this.createCompletion({
      ...this.baseRequest(options),
      messages: options.messages.map((msg) => this.toOpenAIMessage(msg)),
      tools: options.tools.map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: options.toolChoice ?? 'auto',
    });

    const choice = completion.choices[0];
    const toolCalls: LLMToolCall[] = (choice.message.tool_calls || [])
      .filter((tc: any) => tc.function)
      .map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: this.safeParseJson(tc.function.arguments),
      }));

    return {
      content: this.extractContent(choice),
      usage: this.toUsage(completion.usage),
      model: completion.model,
      finishReason: choice.finish_reason,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * Request fields shared by `chat` and `chatWithTools`.
   *
   * `models` (plural) is OpenRouter-specific: it lists the primary model first
   * and lets the gateway retry the rest on upstream failure. `usage.include`
   * asks for the real charged cost back on the response.
   */
  private baseRequest(options: LLMChatOptions): Record<string, any> {
    const model = options.model || this.defaultModel;
    const request: Record<string, any> = {
      model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: false,
      usage: { include: true },
    };

    const alternatives = this.fallbackModels.filter((m) => m !== model);
    if (alternatives.length > 0) {
      request.models = [model, ...alternatives];
    }

    return request;
  }

  private async createCompletion(request: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('OpenRouter client not initialized');
    }

    const response: any = await this.client.chat.completions.create(
      request as any,
    );

    // OpenRouter can answer 200 with an `error` envelope instead of `choices`
    // (e.g. an upstream provider rejected the request). Surface it as a throw so
    // callers hit their existing catch/fallback path rather than reading
    // `choices[0]` off undefined.
    if (!response?.choices?.length) {
      const message =
        response?.error?.message || 'OpenRouter returned no choices';
      throw new Error(`OpenRouter request failed: ${message}`);
    }

    return response;
  }

  /**
   * Reasoning models (gpt-oss, Nemotron reasoning variants) put their chain of
   * thought in `message.reasoning` and leave `content` null when the token
   * budget runs out mid-thought. Returning '' there is correct — the caller's
   * Zod validation then triggers its deterministic fallback — but it is worth a
   * warning, because the usual fix is simply a larger `maxTokens`.
   */
  private extractContent(choice: any): string {
    const content = choice?.message?.content;
    if (content) return content;

    // A tool-call turn legitimately carries no content — nothing to warn about.
    const askedForTools = choice?.message?.tool_calls?.length > 0;
    if (!askedForTools && choice?.message?.reasoning) {
      this.logger.warn(
        `Model returned reasoning but no content (finish_reason: ${choice.finish_reason}) — consider raising maxTokens`,
      );
    }
    return '';
  }

  /**
   * OpenRouter reports the actual charged amount in `usage.cost` (USD) when the
   * request asked for it, so there is no price table to keep in sync.
   */
  private toUsage(usage: any): LLMUsage {
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;

    return {
      promptTokens,
      completionTokens,
      totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
      cost: usage?.cost ?? 0,
    };
  }

  /**
   * Translate a neutral LLMChatMessage into an OpenAI Chat Completions message.
   */
  private toOpenAIMessage(msg: LLMChatMessage): Record<string, any> {
    if (msg.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: msg.content ?? '',
      };
    }

    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments ?? {}),
          },
        })),
      };
    }

    return { role: msg.role, content: msg.content };
  }

  private safeParseJson(raw: unknown): Record<string, any> {
    if (raw == null) return {};
    if (typeof raw === 'object') return raw as Record<string, any>;
    try {
      return JSON.parse(String(raw));
    } catch {
      return {};
    }
  }
}
