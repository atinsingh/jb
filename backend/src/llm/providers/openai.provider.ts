import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  LLMProvider,
  LLMCompletionOptions,
  LLMChatOptions,
  LLMEmbeddingOptions,
  LLMResponse,
  LLMEmbeddingResponse,
  LLMUsage,
} from '../interfaces/llm-provider.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI;
  private readonly defaultModel = 'gpt-4o-mini';
  private readonly defaultEmbeddingModel = 'text-embedding-3-small';

  // Cost per 1M tokens (approximate)
  private readonly pricing = {
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
  };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.EMERGENT_LLM_KEY;
    if (!apiKey) {
      this.logger.warn('OpenAI API key not found');
      return;
    }

    this.client = new OpenAI({ apiKey });
    this.logger.log('✅ OpenAI provider initialized');
  }

  getName(): string {
    return 'openai';
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async complete(
    prompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse<string>> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options?.model || this.defaultModel;
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
      stream: false,
    });

    // Type assertion for non-streaming response
    const completion = response as any;
    const choice = completion.choices[0];
    const usage = completion.usage;

    return {
      content: choice.message.content || '',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(
          model,
          usage.prompt_tokens,
          usage.completion_tokens,
        ),
      },
      model: completion.model,
      finishReason: choice.finish_reason,
    };
  }

  async chat(options: LLMChatOptions): Promise<LLMResponse<string>> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options.model || this.defaultModel;
    const response = await this.client.chat.completions.create({
      model,
      messages: options.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stop: options.stop,
      stream: options.stream || false,
    });

    // Handle streaming vs non-streaming responses
    if (options.stream) {
      throw new Error('Streaming responses are not yet supported in this implementation');
    }

    // Type assertion for non-streaming response
    const completion = response as any;
    const choice = completion.choices[0];
    const usage = completion.usage;

    return {
      content: choice.message.content || '',
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(
          model,
          usage.prompt_tokens,
          usage.completion_tokens,
        ),
      },
      model: completion.model,
      finishReason: choice.finish_reason,
    };
  }

  async embeddings(
    texts: string[],
    options?: LLMEmbeddingOptions,
  ): Promise<LLMEmbeddingResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options?.model || this.defaultEmbeddingModel;
    const response = await this.client.embeddings.create({
      model,
      input: texts,
      dimensions: options?.dimensions,
    });

    const usage = response.usage;
    const embeddingResponse = response as any;

    return {
      embeddings: embeddingResponse.data.map((item: any) => item.embedding),
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: 0,
        totalTokens: usage.total_tokens,
        cost: this.calculateCost(model, usage.total_tokens, 0),
      },
      model: embeddingResponse.model,
    };
  }

  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const prices = this.pricing[model] || this.pricing['gpt-4o-mini'];
    const inputCost = (inputTokens / 1_000_000) * prices.input;
    const outputCost = (outputTokens / 1_000_000) * prices.output;
    return inputCost + outputCost;
  }
}

