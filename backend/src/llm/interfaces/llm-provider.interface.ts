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

/**
 * Tool definition (function schema) advertised to the model.
 * `parameters` is a JSON Schema describing the tool's input.
 */
export interface LLMToolDef {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

/**
 * A tool/function call requested by the model. `arguments` is the parsed input
 * object (already JSON-decoded).
 */
export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/**
 * A single chat message.
 *
 * Backward-compatible with the original `{ role, content }` shape:
 * - `content` remains a required string for `system` / `user` / `assistant`
 *   text turns (it may be an empty string when an assistant turn only carries
 *   `toolCalls`).
 * - `role` now also allows `'tool'` for tool-result turns; a tool message
 *   should carry `toolCallId` linking it back to the originating `LLMToolCall`.
 * - An assistant message may carry `toolCalls` when the model asked to invoke
 *   tools.
 */
export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  /** Present on `role: 'tool'` messages — the id of the tool call being answered. */
  toolCallId?: string;
  /** Present on `role: 'assistant'` messages that requested tool invocations. */
  toolCalls?: LLMToolCall[];
}

export interface LLMChatOptions extends LLMCompletionOptions {
  messages: LLMChatMessage[];
  stream?: boolean;
}

/**
 * Options for a tool-enabled chat turn.
 */
export interface LLMChatWithToolsOptions extends LLMChatOptions {
  tools: LLMToolDef[];
  toolChoice?: 'auto' | 'none';
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
  /** Populated when the model requested one or more tool invocations. */
  toolCalls?: LLMToolCall[];
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
   * Tool-enabled chat completion (optional).
   *
   * Providers that don't implement tool-use may omit this method entirely, so
   * callers must feature-detect (`if (provider.chatWithTools)`) before use.
   */
  chatWithTools?(
    options: LLMChatWithToolsOptions,
  ): Promise<LLMResponse<string> & { toolCalls?: LLMToolCall[] }>;

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

