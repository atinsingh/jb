/**
 * LLM Provider Interface
 * Defines the contract for all LLM provider implementations
 */

export interface LLMCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMChatOptions extends LLMCompletionOptions {
  messages: LLMChatMessage[];
  stream?: boolean;
}

export interface LLMEmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number; // Cost in USD
}

export interface LLMResponse<T = string> {
  content: T;
  usage: LLMUsage;
  model: string;
  finishReason?: string;
}

export interface LLMEmbeddingResponse {
  embeddings: number[][];
  usage: LLMUsage;
  model: string;
}

/**
 * LLM Provider Interface
 */
export interface LLMProvider {
  /**
   * Complete a prompt (single turn)
   */
  complete(
    prompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse<string>>;

  /**
   * Chat completion (multi-turn conversation)
   */
  chat(options: LLMChatOptions): Promise<LLMResponse<string>>;

  /**
   * Generate embeddings (optional)
   */
  embeddings?(
    texts: string[],
    options?: LLMEmbeddingOptions,
  ): Promise<LLMEmbeddingResponse>;

  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Check if provider is available
   */
  isAvailable(): boolean;
}

