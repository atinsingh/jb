import { Injectable, Logger } from '@nestjs/common';
import {
  LLMProvider,
  LLMCompletionOptions,
  LLMChatOptions,
  LLMChatWithToolsOptions,
  LLMEmbeddingOptions,
  LLMResponse,
  LLMEmbeddingResponse,
  LLMUsage,
  LLMToolCall,
} from '../interfaces/llm-provider.interface';

/**
 * Mock LLM Provider for testing and development
 * Returns deterministic responses based on input patterns
 */
@Injectable()
export class MockProvider implements LLMProvider {
  private readonly logger = new Logger(MockProvider.name);
  private readonly defaultModel = 'mock-model-v1';

  /**
   * Scripted tool-call turns for `chatWithTools`. Each entry is one turn's
   * worth of tool calls; each call to `chatWithTools` shifts one entry off the
   * front. When the queue is empty, `chatWithTools` returns a terminal text
   * response. Set via {@link setScriptedToolTurns}. Used by agent-loop tests.
   */
  private scriptedToolTurns: LLMToolCall[][] = [];

  /** Terminal text returned once the scripted tool turns are exhausted. */
  private scriptedDoneText = 'Done';

  constructor() {
    this.logger.log('✅ Mock LLM provider initialized');
  }

  getName(): string {
    return 'mock';
  }

  isAvailable(): boolean {
    return true; // Always available for testing
  }

  async complete(
    prompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMResponse<string>> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = this.generateMockResponse(prompt);
    const estimatedTokens = Math.ceil(prompt.length / 4) + Math.ceil(response.length / 4);

    return {
      content: response,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(response.length / 4),
        totalTokens: estimatedTokens,
        cost: 0, // Free for mock
      },
      model: options?.model || this.defaultModel,
      finishReason: 'stop',
    };
  }

  async chat(options: LLMChatOptions): Promise<LLMResponse<string>> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const lastMessage = options.messages[options.messages.length - 1];
    const response = this.generateMockResponse(lastMessage.content);
    const totalInputTokens = options.messages.reduce(
      (sum, msg) => sum + Math.ceil(msg.content.length / 4),
      0,
    );
    const outputTokens = Math.ceil(response.length / 4);

    return {
      content: response,
      usage: {
        promptTokens: totalInputTokens,
        completionTokens: outputTokens,
        totalTokens: totalInputTokens + outputTokens,
        cost: 0,
      },
      model: options.model || this.defaultModel,
      finishReason: 'stop',
    };
  }

  /**
   * Queue up scripted tool-call turns for `chatWithTools`. Each element is the
   * set of tool calls the mock should return on one turn. After all scripted
   * turns are consumed, `chatWithTools` returns a terminal text response.
   *
   * @param turns   Ordered list of tool-call batches (one per turn).
   * @param doneText Optional terminal text returned once turns are exhausted.
   */
  setScriptedToolTurns(turns: LLMToolCall[][], doneText?: string): void {
    this.scriptedToolTurns = [...turns];
    if (doneText !== undefined) {
      this.scriptedDoneText = doneText;
    }
  }

  async chatWithTools(
    options: LLMChatWithToolsOptions,
  ): Promise<LLMResponse<string> & { toolCalls?: LLMToolCall[] }> {
    await new Promise((resolve) => setTimeout(resolve, 10));

    const next = this.scriptedToolTurns.shift();

    if (next && next.length > 0) {
      return {
        content: '',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
        },
        model: options.model || this.defaultModel,
        finishReason: 'tool_use',
        toolCalls: next,
      };
    }

    // Terminal turn — no more scripted tool calls.
    const content = this.scriptedDoneText;
    return {
      content,
      usage: {
        promptTokens: 0,
        completionTokens: Math.ceil(content.length / 4),
        totalTokens: Math.ceil(content.length / 4),
        cost: 0,
      },
      model: options.model || this.defaultModel,
      finishReason: 'stop',
      toolCalls: undefined,
    };
  }

  async embeddings(
    texts: string[],
    options?: LLMEmbeddingOptions,
  ): Promise<LLMEmbeddingResponse> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const dimensions = options?.dimensions || 1536;
    const embeddings = texts.map(() => {
      // Generate deterministic mock embeddings
      const embedding = new Array(dimensions).fill(0).map(() => Math.random() - 0.5);
      // Normalize
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map((val) => val / magnitude);
    });

    const totalTokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);

    return {
      embeddings,
      usage: {
        promptTokens: totalTokens,
        completionTokens: 0,
        totalTokens,
        cost: 0,
      },
      model: options?.model || 'mock-embeddings-v1',
    };
  }

  private generateMockResponse(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    // Pattern matching for different use cases
    if (lowerPrompt.includes('bullet') || lowerPrompt.includes('rewrite')) {
      return JSON.stringify({
        improvedBullets: [
          'Enhanced bullet point with quantifiable metrics and impact',
          'Improved bullet highlighting key achievements',
        ],
        rationale: 'Improved bullets focus on quantifiable results and impact',
        confidence: 0.85,
        diffs: [
          {
            original: 'Original bullet point',
            improved: 'Enhanced bullet point with quantifiable metrics and impact',
            changes: ['Added metrics', 'Emphasized impact'],
          },
        ],
      });
    }

    if (lowerPrompt.includes('tailor') || lowerPrompt.includes('resume')) {
      return JSON.stringify({
        updatedResume: {
          summary: 'Tailored professional summary',
          skills: ['Skill 1', 'Skill 2', 'Skill 3'],
        },
        keywordMap: {
          matched: ['keyword1', 'keyword2'],
          added: ['keyword3'],
        },
        changeLog: [
          {
            section: 'summary',
            action: 'updated',
            reason: 'Better alignment with job requirements',
          },
        ],
      });
    }

    if (lowerPrompt.includes('cover letter')) {
      return JSON.stringify({
        sections: {
          greeting: 'Dear Hiring Manager,',
          introduction: 'I am writing to express my interest...',
          body: 'With my experience in...',
          closing: 'I look forward to discussing...',
          signature: 'Sincerely,',
        },
        finalLetter: 'Complete cover letter text here...',
      });
    }

    // Default mock response
    return JSON.stringify({
      response: 'This is a mock response',
      prompt: prompt.substring(0, 100),
    });
  }
}

