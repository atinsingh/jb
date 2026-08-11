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
 * LiteLLMProvider
 *
 * LiteLLM is an OpenAI-compatible proxy that fronts whatever models the
 * operator has configured behind stable aliases. Because the wire format is
 * OpenAI's, this provider is the `openai` SDK pointed at a different baseURL —
 * the same trick `OpenRouterProvider` uses.
 *
 * What makes it different from the other gateways, and why it is preferred on
 * fallback:
 *
 * 1. **It is self-hosted.** Requests do not leave the operator's network and
 *    cost nothing per token, so there is no spend decision attached to turning
 *    a feature on. That is the opposite trade-off from OpenRouter's `:free`
 *    slugs, which are free but shared, rate-limited and prone to 429.
 *
 * 2. **Model names are operator-defined aliases**, not provider-native ids.
 *    `perfectum-fast-v1` means whatever the gateway maps it to. So a feature
 *    pinned to, say, an Anthropic model id CANNOT have that id forwarded here —
 *    the routing layer substitutes the configured LiteLLM alias instead.
 *
 * 3. **Capability is per-alias.** A gateway typically exposes a cheap
 *    general-purpose alias alongside ones provisioned for tool-calling or
 *    structured output. A tool-calling turn sent to a general alias may simply
 *    ignore the tools, so `chatWithTools` prefers `LITELLM_TOOLS_MODEL` when the
 *    caller has not pinned a model itself.
 *
 * Configure with `LITELLM_API_KEY` (or `LITELLM_MASTER_KEY`) and, if not running
 * on the default local port, `LITELLM_BASE_URL`.
 */

/** Default alias for general chat. Override with `LITELLM_MODEL`. */
export const DEFAULT_LITELLM_MODEL = 'perfectum-fast-v1';

/**
 * Default alias for tool-calling turns. Override with `LITELLM_TOOLS_MODEL`, or
 * set it equal to `LITELLM_MODEL` if the gateway's general alias handles tools.
 */
export const DEFAULT_LITELLM_TOOLS_MODEL = 'perfectum-tools-v1';

/** Default base URL for a LiteLLM proxy running locally. */
export const DEFAULT_LITELLM_BASE_URL = 'http://localhost:4000/v1';

@Injectable()
export class LiteLLMProvider implements LLMProvider {
  private readonly logger = new Logger(LiteLLMProvider.name);
  private client?: OpenAI;

  private readonly defaultModel: string;
  private readonly toolsModel: string;

  constructor() {
    // A LiteLLM proxy is usually started with a master key that doubles as the
    // client key in single-tenant setups, so accept either name rather than
    // making the operator remember which one this codebase wanted.
    const apiKey =
      process.env.LITELLM_API_KEY || process.env.LITELLM_MASTER_KEY;
    this.defaultModel = process.env.LITELLM_MODEL || DEFAULT_LITELLM_MODEL;
    this.toolsModel =
      process.env.LITELLM_TOOLS_MODEL || DEFAULT_LITELLM_TOOLS_MODEL;

    if (!apiKey) {
      // Not a warning: an unconfigured self-hosted gateway is the normal state
      // for most environments, and the routing layer simply skips this provider.
      this.logger.log('LiteLLM not configured (no LITELLM_API_KEY) — skipping');
      return;
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: process.env.LITELLM_BASE_URL || DEFAULT_LITELLM_BASE_URL,
    });
    this.logger.log(
      `✅ LiteLLM provider initialized (model: ${this.defaultModel}, tools: ${this.toolsModel})`,
    );
  }

  getName(): string {
    return 'litellm';
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
      ...this.baseRequest(options, this.defaultModel),
      messages: options.messages.map((msg) => this.toOpenAIMessage(msg)),
    });

    const choice = completion.choices[0];

    return {
      content: this.extractContent(choice),
      usage: this.toUsage(completion),
      model: completion.model,
      finishReason: choice.finish_reason,
    };
  }

  /**
   * Tool-enabled chat completion. Defaults to the tools alias rather than the
   * general one: a gateway alias not provisioned for function-calling tends to
   * answer in prose and drop `tool_calls` silently, which surfaces to the caller
   * as "the model ignored my tools" rather than as an error.
   */
  async chatWithTools(
    options: LLMChatWithToolsOptions,
  ): Promise<LLMResponse<string> & { toolCalls?: LLMToolCall[] }> {
    const completion = await this.createCompletion({
      ...this.baseRequest(options, this.toolsModel),
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
      usage: this.toUsage(completion),
      model: completion.model,
      finishReason: choice.finish_reason,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * Request fields shared by `chat` and `chatWithTools`.
   *
   * Deliberately plain OpenAI: none of OpenRouter's extensions (`models` array,
   * `usage.include`) exist here, and sending them to a strict gateway is a
   * request-validation error rather than a harmless no-op.
   */
  private baseRequest(
    options: LLMChatOptions,
    fallbackModel: string,
  ): Record<string, any> {
    return {
      model: options.model || fallbackModel,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: false,
    };
  }

  private async createCompletion(request: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('LiteLLM client not initialized');
    }

    const response: any = await this.client.chat.completions.create(
      request as any,
    );

    // A proxy can answer 200 with an error envelope instead of `choices` when an
    // upstream rejects the request. Throw so callers hit their existing
    // catch/fallback path rather than reading `choices[0]` off undefined.
    if (!response?.choices?.length) {
      const message = response?.error?.message || 'LiteLLM returned no choices';
      throw new Error(`LiteLLM request failed: ${message}`);
    }

    return response;
  }

  /**
   * Reasoning models leave `content` null and put their chain of thought in
   * `message.reasoning` when the token budget runs out mid-thought. Returning ''
   * is correct — the caller's validation then triggers its deterministic
   * fallback — but it is worth a warning, because the fix is usually a larger
   * `maxTokens`.
   */
  private extractContent(choice: any): string {
    const content = choice?.message?.content;
    if (content) return content;

    const askedForTools = choice?.message?.tool_calls?.length > 0;
    if (!askedForTools && choice?.message?.reasoning) {
      this.logger.warn(
        `Model returned reasoning but no content (finish_reason: ${choice.finish_reason}) — consider raising maxTokens`,
      );
    }
    return '';
  }

  /**
   * LiteLLM reports spend for upstream-billed models, but where it puts it
   * depends on the deployment: `usage.cost`, a `response_cost` field, or the
   * proxy's `_hidden_params`. Read all three and fall back to 0, which is the
   * truthful answer for a locally-hosted model that costs nothing per token.
   */
  private toUsage(completion: any): LLMUsage {
    const usage = completion?.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;

    const cost =
      usage?.cost ??
      completion?.response_cost ??
      completion?._hidden_params?.response_cost ??
      0;

    return {
      promptTokens,
      completionTokens,
      totalTokens: usage?.total_tokens ?? promptTokens + completionTokens,
      cost: typeof cost === 'number' ? cost : 0,
    };
  }

  /** Translate a neutral LLMChatMessage into an OpenAI Chat Completions message. */
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
