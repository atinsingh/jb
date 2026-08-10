import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  LLMCompletionOptions,
  LLMChatOptions,
  LLMChatWithToolsOptions,
  LLMResponse,
  LLMChatMessage,
  LLMToolCall,
} from '../interfaces/llm-provider.interface';

/**
 * AnthropicProvider
 *
 * Real Claude-backed provider using the official `@anthropic-ai/sdk`. Activated
 * per-feature via `LLM_<FEATURE>_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`. When
 * no key is present `isAvailable()` returns false and the router transparently
 * falls back to the Mock provider (which in turn triggers the deterministic
 * fallback in the caller once Zod validation fails).
 *
 * The Messages API separates the system prompt from the conversation, so `chat`
 * collapses any `system`-role messages into the top-level `system` parameter and
 * forwards the remaining user/assistant turns.
 */
@Injectable()
export class AnthropicProvider implements LLMProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private client?: Anthropic;
  private readonly defaultModel = 'claude-opus-4-8';
  private readonly defaultMaxTokens = 1024;

  // Cost per 1M tokens (approximate, current-gen Claude tiers)
  private readonly pricing: Record<string, { input: number; output: number }> =
    {
      'claude-opus-4-8': { input: 5.0, output: 25.0 },
      'claude-opus-4-7': { input: 5.0, output: 25.0 },
      'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
      'claude-haiku-4-5': { input: 1.0, output: 5.0 },
    };

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('Anthropic API key not found');
      return;
    }

    this.client = new Anthropic({ apiKey });
    this.logger.log('✅ Anthropic provider initialized');
  }

  getName(): string {
    return 'anthropic';
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
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    const model = options.model || this.defaultModel;

    const system =
      options.messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n') || undefined;

    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response: any = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      temperature: options.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages: messages as any,
    });

    const content: string = (response.content || [])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    const usage = response.usage || {};
    const promptTokens = usage.input_tokens ?? 0;
    const completionTokens = usage.output_tokens ?? 0;

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cost: this.calculateCost(model, promptTokens, completionTokens),
      },
      model: response.model || model,
      finishReason: response.stop_reason || undefined,
    };
  }

  /**
   * Tool-enabled chat completion.
   *
   * Maps our neutral tool/message shapes to the Anthropic Messages API
   * (native tool use) and parses `tool_use` blocks into `LLMToolCall[]`.
   */
  async chatWithTools(
    options: LLMChatWithToolsOptions,
  ): Promise<LLMResponse<string> & { toolCalls?: LLMToolCall[] }> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    const model = options.model || this.defaultModel;

    const system =
      options.messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n') || undefined;

    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => this.toAnthropicMessage(m));

    const tools = options.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));

    // Anthropic accepts tool_choice {type:'auto'} / {type:'none'} at this SDK version.
    const toolChoice =
      options.toolChoice === 'none' ? { type: 'none' } : { type: 'auto' };

    const response: any = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? this.defaultMaxTokens,
      temperature: options.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages: messages as any,
      tools: tools as any,
      tool_choice: toolChoice as any,
    });

    const blocks: any[] = response.content || [];

    const content: string = blocks
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const toolCalls: LLMToolCall[] = blocks
      .filter((block) => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        name: block.name,
        arguments: (block.input ?? {}) as Record<string, any>,
      }));

    const usage = response.usage || {};
    const promptTokens = usage.input_tokens ?? 0;
    const completionTokens = usage.output_tokens ?? 0;

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cost: this.calculateCost(model, promptTokens, completionTokens),
      },
      model: response.model || model,
      finishReason: response.stop_reason || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  /**
   * Translate a neutral LLMChatMessage into an Anthropic Messages API message.
   */
  private toAnthropicMessage(msg: LLMChatMessage): Record<string, any> {
    // Tool-result turn → a user message carrying a tool_result content block
    if (msg.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: msg.toolCallId,
            content: msg.content ?? '',
          },
        ],
      };
    }

    // Assistant turn that requested tools → tool_use content blocks
    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      const blocks: any[] = [];
      if (msg.content) {
        blocks.push({ type: 'text', text: msg.content });
      }
      for (const tc of msg.toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: tc.arguments ?? {},
        });
      }
      return { role: 'assistant', content: blocks };
    }

    return { role: msg.role, content: msg.content };
  }

  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const prices = this.pricing[model] || this.pricing['claude-opus-4-8'];
    const inputCost = (inputTokens / 1_000_000) * prices.input;
    const outputCost = (outputTokens / 1_000_000) * prices.output;
    return inputCost + outputCost;
  }
}
