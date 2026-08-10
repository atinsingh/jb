import {
  OpenRouterProvider,
  DEFAULT_OPENROUTER_MODEL,
} from './openrouter.provider';
import { LLMChatWithToolsOptions } from '../interfaces/llm-provider.interface';

describe('OpenRouterProvider', () => {
  const envKeys = [
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'OPENROUTER_FALLBACK_MODELS',
  ];
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    envKeys.forEach((k) => (savedEnv[k] = process.env[k]));
  });

  afterAll(() => {
    // The provider reads env in its constructor, and jest shares process.env
    // across spec files in a worker — restore so we don't flip another spec's
    // provider availability.
    envKeys.forEach((k) => {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k] as string;
    });
  });

  beforeEach(() => {
    envKeys.forEach((k) => delete process.env[k]);
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  /** Build a provider whose SDK client is a mock returning `response`. */
  const providerWith = (response?: any) => {
    const provider = new OpenRouterProvider();
    const createMock = jest.fn().mockResolvedValue(response);
    (provider as any).client = {
      chat: { completions: { create: createMock } },
    };
    return { provider, createMock };
  };

  const textResponse = (content: string | null, extra: any = {}) => ({
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    choices: [{ finish_reason: 'stop', message: { content, ...extra } }],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
      cost: 0.00042,
    },
  });

  it('is unavailable without an API key', () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = new OpenRouterProvider();

    expect(provider.isAvailable()).toBe(false);
    expect(provider.getName()).toBe('openrouter');
  });

  it('requests usage accounting and defaults to a free-tier model', async () => {
    const { provider, createMock } = providerWith(textResponse('hello'));

    const res = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });

    const sent = createMock.mock.calls[0][0];
    expect(sent.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(sent.usage).toEqual({ include: true });
    // No tools leak into a plain chat() call.
    expect(sent.tools).toBeUndefined();
    expect(sent.tool_choice).toBeUndefined();
    expect(res.content).toBe('hello');
  });

  it('reports the cost OpenRouter charged rather than computing one', async () => {
    const { provider } = providerWith(textResponse('hello'));

    const res = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });

    expect(res.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      cost: 0.00042,
    });
  });

  it('sends OPENROUTER_FALLBACK_MODELS as the server-side models chain', async () => {
    process.env.OPENROUTER_MODEL = 'primary/model:free';
    process.env.OPENROUTER_FALLBACK_MODELS =
      ' backup/one:free , primary/model:free ,backup/two:free ';
    const { provider, createMock } = providerWith(textResponse('hello'));

    await provider.chat({ messages: [{ role: 'user', content: 'hi' }] });

    const sent = createMock.mock.calls[0][0];
    // Primary first, no duplicate of it among the alternatives.
    expect(sent.model).toBe('primary/model:free');
    expect(sent.models).toEqual([
      'primary/model:free',
      'backup/one:free',
      'backup/two:free',
    ]);
  });

  it('omits the models chain when no fallbacks are configured', async () => {
    const { provider, createMock } = providerWith(textResponse('hello'));

    await provider.chat({ messages: [{ role: 'user', content: 'hi' }] });

    expect(createMock.mock.calls[0][0].models).toBeUndefined();
  });

  it('parses tool_calls and maps tool/assistant turns to OpenAI roles', async () => {
    const tools: LLMChatWithToolsOptions['tools'] = [
      {
        name: 'find_matches',
        description: 'Find matching jobs',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'integer' } },
          required: ['limit'],
        },
      },
    ];

    const { provider, createMock } = providerWith({
      model: 'nvidia/nemotron-3-super-120b-a12b:free',
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'chatcmpl-tool-1',
                type: 'function',
                function: {
                  name: 'find_matches',
                  arguments: '{"limit":3}',
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 },
    });

    const res = await provider.chatWithTools({
      messages: [
        { role: 'user', content: 'find jobs' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'chatcmpl-tool-1', name: 'find_matches', arguments: { limit: 3 } },
          ],
        },
        { role: 'tool', toolCallId: 'chatcmpl-tool-1', content: '3 jobs' },
      ],
      tools,
    });

    const sent = createMock.mock.calls[0][0];
    expect(sent.tool_choice).toBe('auto');
    expect(sent.tools[0].function.name).toBe('find_matches');
    expect(sent.messages[1]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'chatcmpl-tool-1',
          type: 'function',
          function: { name: 'find_matches', arguments: '{"limit":3}' },
        },
      ],
    });
    expect(sent.messages[2]).toEqual({
      role: 'tool',
      tool_call_id: 'chatcmpl-tool-1',
      content: '3 jobs',
    });

    expect(res.toolCalls).toEqual([
      { id: 'chatcmpl-tool-1', name: 'find_matches', arguments: { limit: 3 } },
    ]);
    // Cost is absent from this response — usage still resolves.
    expect(res.usage.cost).toBe(0);
  });

  it('returns {} for unparseable tool-call arguments rather than throwing', async () => {
    const { provider } = providerWith({
      model: 'm',
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_bad',
                type: 'function',
                function: { name: 'find_matches', arguments: 'not json' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const res = await provider.chatWithTools({
      messages: [{ role: 'user', content: 'x' }],
      tools: [{ name: 'find_matches', parameters: { type: 'object' } }],
    });

    expect(res.toolCalls).toEqual([
      { id: 'call_bad', name: 'find_matches', arguments: {} },
    ]);
  });

  it('throws the error envelope OpenRouter returns instead of reading choices[0]', async () => {
    const { provider } = providerWith({
      error: {
        message: 'google/gemma-4-31b-it:free is temporarily rate-limited upstream',
        code: 429,
      },
    });

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/temporarily rate-limited upstream/);
  });

  it('yields empty content when a reasoning model runs out of budget mid-thought', async () => {
    const { provider } = providerWith({
      model: 'openai/gpt-oss-20b:free',
      choices: [
        {
          finish_reason: 'length',
          message: { content: null, reasoning: 'The user says...' },
        },
      ],
      usage: { prompt_tokens: 72, completion_tokens: 20, total_tokens: 92 },
    });

    const res = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 20,
    });

    // '' lets the caller's Zod validation trigger its deterministic fallback.
    expect(res.content).toBe('');
    expect(res.finishReason).toBe('length');
  });

  it('rejects streaming rather than silently returning a stream object', async () => {
    const { provider } = providerWith(textResponse('hello'));

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }], stream: true }),
    ).rejects.toThrow(/Streaming/);
  });

  it('throws a clear error when used without initialization', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = new OpenRouterProvider();

    await expect(
      provider.chat({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/not initialized/);
  });
});
