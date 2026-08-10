import { MockProvider } from './mock.provider';
import {
  LLMChatMessage,
  LLMToolCall,
  LLMChatWithToolsOptions,
} from '../interfaces/llm-provider.interface';

describe('MockProvider — chatWithTools scripting', () => {
  let provider: MockProvider;

  const baseOpts: LLMChatWithToolsOptions = {
    messages: [{ role: 'user', content: 'hi' }],
    tools: [
      { name: 'get_weather', parameters: { type: 'object', properties: {} } },
    ],
  };

  beforeEach(() => {
    provider = new MockProvider();
  });

  it('is always available', () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('returns scripted tool turns, then a terminal text turn', async () => {
    const turn1: LLMToolCall[] = [
      { id: 'call_1', name: 'get_weather', arguments: { city: 'Paris' } },
    ];
    const turn2: LLMToolCall[] = [
      { id: 'call_2', name: 'get_weather', arguments: { city: 'Berlin' } },
    ];

    provider.setScriptedToolTurns([turn1, turn2], 'All done');

    const r1 = await provider.chatWithTools(baseOpts);
    expect(r1.finishReason).toBe('tool_use');
    expect(r1.content).toBe('');
    expect(r1.toolCalls).toEqual(turn1);

    const r2 = await provider.chatWithTools(baseOpts);
    expect(r2.finishReason).toBe('tool_use');
    expect(r2.toolCalls).toEqual(turn2);

    // Queue exhausted → terminal text turn with no tool calls
    const r3 = await provider.chatWithTools(baseOpts);
    expect(r3.finishReason).toBe('stop');
    expect(r3.toolCalls).toBeUndefined();
    expect(r3.content).toBe('All done');
  });

  it('returns terminal text immediately when no turns are scripted', async () => {
    const r = await provider.chatWithTools(baseOpts);
    expect(r.finishReason).toBe('stop');
    expect(r.toolCalls).toBeUndefined();
    expect(typeof r.content).toBe('string');
  });

  it('leaves the existing chat() behavior intact', async () => {
    const res = await provider.chat({
      messages: [{ role: 'user', content: 'cover letter please' }],
    });
    expect(res.finishReason).toBe('stop');
    expect(typeof res.content).toBe('string');
    expect(res.toolCalls).toBeUndefined();
  });
});

describe('LLMChatMessage type compatibility', () => {
  it('accepts the legacy { role, content } shape', () => {
    // Compile-time check: original shape still valid.
    const legacy: LLMChatMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    expect(legacy).toHaveLength(3);

    // New shapes also valid.
    const withTool: LLMChatMessage = {
      role: 'tool',
      content: 'result',
      toolCallId: 'call_1',
    };
    const asstWithCalls: LLMChatMessage = {
      role: 'assistant',
      content: '',
      toolCalls: [{ id: 'call_1', name: 'x', arguments: {} }],
    };
    expect(withTool.toolCallId).toBe('call_1');
    expect(asstWithCalls.toolCalls).toHaveLength(1);
  });
});
