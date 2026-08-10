import { OpenAIProvider } from './openai.provider';
import { LLMChatWithToolsOptions } from '../interfaces/llm-provider.interface';

describe('OpenAIProvider — chatWithTools', () => {
  let provider: OpenAIProvider;
  let createMock: jest.Mock;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    provider = new OpenAIProvider();

    createMock = jest.fn();
    // Replace the SDK client with a mock.
    (provider as any).client = {
      chat: { completions: { create: createMock } },
    };
  });

  const tools: LLMChatWithToolsOptions['tools'] = [
    {
      name: 'get_weather',
      description: 'Get the weather',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    },
  ];

  it('maps tools to function format, passes tool_choice, and parses tool_calls (JSON args)', async () => {
    createMock.mockResolvedValue({
      model: 'gpt-4o-mini',
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_abc',
                type: 'function',
                function: {
                  name: 'get_weather',
                  arguments: '{"city":"Paris"}',
                },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const result = await provider.chatWithTools({
      messages: [{ role: 'user', content: 'weather in Paris?' }],
      tools,
    });

    // Request shape
    const arg = createMock.mock.calls[0][0];
    expect(arg.tool_choice).toBe('auto');
    expect(arg.tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get the weather',
          parameters: tools[0].parameters,
        },
      },
    ]);

    // Parsed response
    expect(result.content).toBe('');
    expect(result.finishReason).toBe('tool_calls');
    expect(result.toolCalls).toEqual([
      { id: 'call_abc', name: 'get_weather', arguments: { city: 'Paris' } },
    ]);
    expect(result.usage.promptTokens).toBe(10);
    expect(result.usage.completionTokens).toBe(5);
  });

  it('translates tool + assistant-with-toolCalls messages into OpenAI roles', async () => {
    createMock.mockResolvedValue({
      model: 'gpt-4o-mini',
      choices: [{ finish_reason: 'stop', message: { content: 'Sunny.' } }],
      usage: { prompt_tokens: 20, completion_tokens: 3, total_tokens: 23 },
    });

    const result = await provider.chatWithTools({
      messages: [
        { role: 'user', content: 'weather in Paris?' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'call_abc', name: 'get_weather', arguments: { city: 'Paris' } },
          ],
        },
        { role: 'tool', toolCallId: 'call_abc', content: '72F sunny' },
      ],
      tools,
      toolChoice: 'auto',
    });

    const sent = createMock.mock.calls[0][0].messages;

    // assistant turn carries tool_calls with stringified arguments
    expect(sent[1]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_abc',
          type: 'function',
          function: { name: 'get_weather', arguments: '{"city":"Paris"}' },
        },
      ],
    });

    // tool turn → OpenAI tool role with tool_call_id
    expect(sent[2]).toEqual({
      role: 'tool',
      tool_call_id: 'call_abc',
      content: '72F sunny',
    });

    expect(result.content).toBe('Sunny.');
    expect(result.toolCalls).toBeUndefined();
    expect(result.finishReason).toBe('stop');
  });

  it('returns {} for unparseable tool-call arguments rather than throwing', async () => {
    createMock.mockResolvedValue({
      model: 'gpt-4o-mini',
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'call_bad',
                type: 'function',
                function: { name: 'get_weather', arguments: 'not json' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const result = await provider.chatWithTools({
      messages: [{ role: 'user', content: 'x' }],
      tools,
    });

    expect(result.toolCalls).toEqual([
      { id: 'call_bad', name: 'get_weather', arguments: {} },
    ]);
  });

  it('leaves the existing chat() call shape unchanged', async () => {
    createMock.mockResolvedValue({
      model: 'gpt-4o-mini',
      choices: [{ finish_reason: 'stop', message: { content: 'hello' } }],
      usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
    });

    const res = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });

    const arg = createMock.mock.calls[0][0];
    // No tools / tool_choice leak into a plain chat() call.
    expect(arg.tools).toBeUndefined();
    expect(arg.tool_choice).toBeUndefined();
    expect(res.content).toBe('hello');
  });
});
