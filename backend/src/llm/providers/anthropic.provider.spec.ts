import { AnthropicProvider } from './anthropic.provider';
import { LLMChatWithToolsOptions } from '../interfaces/llm-provider.interface';

describe('AnthropicProvider — chatWithTools', () => {
  let provider: AnthropicProvider;
  let createMock: jest.Mock;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    provider = new AnthropicProvider();

    createMock = jest.fn();
    (provider as any).client = { messages: { create: createMock } };
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

  it('passes input_schema + system, and parses tool_use blocks', async () => {
    createMock.mockResolvedValue({
      model: 'claude-opus-4-8',
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: 'Let me check.' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'get_weather',
          input: { city: 'Paris' },
        },
      ],
      usage: { input_tokens: 12, output_tokens: 8 },
    });

    const result = await provider.chatWithTools({
      messages: [
        { role: 'system', content: 'You are terse.' },
        { role: 'user', content: 'weather in Paris?' },
      ],
      tools,
    });

    const arg = createMock.mock.calls[0][0];
    expect(arg.system).toBe('You are terse.');
    expect(arg.tools).toEqual([
      {
        name: 'get_weather',
        description: 'Get the weather',
        input_schema: tools[0].parameters,
      },
    ]);
    expect(arg.tool_choice).toEqual({ type: 'auto' });

    expect(result.content).toBe('Let me check.');
    expect(result.finishReason).toBe('tool_use');
    expect(result.toolCalls).toEqual([
      { id: 'toolu_1', name: 'get_weather', arguments: { city: 'Paris' } },
    ]);
    expect(result.usage.promptTokens).toBe(12);
    expect(result.usage.completionTokens).toBe(8);
  });

  it('builds a tool_result user block from a tool message and tool_use from assistant toolCalls', async () => {
    createMock.mockResolvedValue({
      model: 'claude-opus-4-8',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'It is sunny.' }],
      usage: { input_tokens: 30, output_tokens: 4 },
    });

    const result = await provider.chatWithTools({
      messages: [
        { role: 'user', content: 'weather in Paris?' },
        {
          role: 'assistant',
          content: 'Checking',
          toolCalls: [
            { id: 'toolu_1', name: 'get_weather', arguments: { city: 'Paris' } },
          ],
        },
        { role: 'tool', toolCallId: 'toolu_1', content: '72F sunny' },
      ],
      tools,
    });

    const sent = createMock.mock.calls[0][0].messages;

    // assistant turn → text + tool_use blocks
    expect(sent[1]).toEqual({
      role: 'assistant',
      content: [
        { type: 'text', text: 'Checking' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'get_weather',
          input: { city: 'Paris' },
        },
      ],
    });

    // tool turn → user message with a tool_result block
    expect(sent[2]).toEqual({
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'toolu_1', content: '72F sunny' },
      ],
    });

    expect(result.content).toBe('It is sunny.');
    expect(result.toolCalls).toBeUndefined();
    expect(result.finishReason).toBe('end_turn');
  });

  it('maps toolChoice "none" to {type:"none"}', async () => {
    createMock.mockResolvedValue({
      model: 'claude-opus-4-8',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'ok' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    await provider.chatWithTools({
      messages: [{ role: 'user', content: 'x' }],
      tools,
      toolChoice: 'none',
    });

    expect(createMock.mock.calls[0][0].tool_choice).toEqual({ type: 'none' });
  });

  it('leaves the existing chat() call shape unchanged (no tools passed)', async () => {
    createMock.mockResolvedValue({
      model: 'claude-opus-4-8',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'hi' }],
      usage: { input_tokens: 2, output_tokens: 1 },
    });

    const res = await provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
    });

    const arg = createMock.mock.calls[0][0];
    expect(arg.tools).toBeUndefined();
    expect(arg.tool_choice).toBeUndefined();
    expect(res.content).toBe('hi');
  });
});
