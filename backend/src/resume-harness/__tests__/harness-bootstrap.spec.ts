import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { HarnessRegistry } from '../harness/harness.registry';
import {
  HARNESS_IDS,
  HarnessId,
  LITELLM_TAG_HEADER,
} from '../harness/harness.types';

const HARNESS_DIR = join(__dirname, '..', 'harness');

const bootstrapInput = (sessionId = 'sess-1') => ({
  sessionId,
  workdir: '/workspace',
  proxy: {
    baseUrl: 'http://litellm:4000',
    // A LiteLLM virtual key. Metered, per-user, revocable — the only credential
    // any harness is ever given.
    apiKey: 'sk-litellm-virtual-abc123',
  },
  alias: {
    alias: 'anthropic/claude-sonnet-4-5/high',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    effort: 'high',
    label: 'Sonnet 4.5 — high effort',
  },
  contextFiles: [{ path: 'AGENTS.md', contents: '# shared rules' }],
});

describe('harness bootstrap', () => {
  const registry = new HarnessRegistry();

  it('exposes exactly the three supported harnesses', () => {
    expect(
      registry
        .list()
        .map((h) => h.id)
        .sort(),
    ).toEqual([...HARNESS_IDS].sort());
  });

  it('routes OpenAI models through Codex on the server', () => {
    expect((registry as any).forProvider('openai').id).toBe('codex');
  });

  it('passes the selected effort into Codex execution', () => {
    const boot = registry.get('codex').bootstrap({
      ...bootstrapInput(),
      alias: {
        alias: 'openai/gpt-5.6-luna/xhigh',
        provider: 'openai',
        model: 'gpt-5.6-luna',
        effort: 'xhigh',
        label: 'GPT-5.6 Luna · xhigh',
      },
    });
    const config = boot.files.find(
      (file) => file.path === '.codex/config.toml',
    );

    expect(config?.contents).toContain('model_reasoning_effort = "xhigh"');
  });

  it('uses the Responses wire API current Codex still accepts', () => {
    const boot = registry.get('codex').bootstrap({
      ...bootstrapInput(),
      alias: {
        alias: 'openai/gpt-5.6-luna/high',
        provider: 'openai',
        model: 'gpt-5.6-luna',
        effort: 'high',
        label: 'GPT-5.6 Luna · high',
      },
    });
    const config = boot.files.find(
      (file) => file.path === '.codex/config.toml',
    );

    expect(config?.contents).toContain('wire_api = "responses"');
    expect(config?.contents).not.toContain('wire_api = "chat"');
  });

  it('streams Codex tool and thinking events as JSONL activities', () => {
    const adapter = registry.get('codex');
    const boot = adapter.bootstrap(bootstrapInput());
    expect(boot.command).toEqual(
      expect.arrayContaining(['codex', 'exec', '--json', '--dangerously-bypass-approvals-and-sandbox']),
    );

    expect(
      adapter.parseOutput?.(
        [
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'item_think',
              type: 'reasoning',
              summary: [{ text: 'Planning the résumé edits.' }],
            },
          }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'item_cmd',
              type: 'command_execution',
              command: 'cat CANDIDATE.md',
            },
          }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'item_cmd',
              type: 'command_execution',
              command: 'cat CANDIDATE.md',
              status: 'completed',
            },
          }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'item_msg',
              type: 'agent_message',
              text: 'Updated resume.tex from the candidate facts.',
            },
          }),
          JSON.stringify({
            type: 'error',
            message:
              'openai.gpt-5.6-luna is not available for this account.',
          }),
        ].join('\n'),
      ),
    ).toEqual({
      response: 'Updated resume.tex from the candidate facts.',
      activities: [
        {
          id: 'item_think',
          kind: 'reasoning',
          label: 'Planning the résumé edits.',
          status: 'running',
        },
        {
          id: 'item_cmd',
          kind: 'tool',
          label: 'Run cat',
          status: 'completed',
        },
        {
          id: 'codex-error',
          label: 'openai.gpt-5.6-luna is not available for this account.',
          status: 'error',
        },
      ],
      error: 'openai.gpt-5.6-luna is not available for this account.',
    });
  });

  it('does not turn a recovered Codex retry into a failed turn', () => {
    const adapter = registry.get('codex');
    const retry = JSON.stringify({ type: 'error', message: 'Reconnecting... 1/5' });
    expect(adapter.parseStreamEvent?.(retry)).toEqual([]);
    expect(adapter.parseOutput?.([
      retry,
      JSON.stringify({ type: 'item.completed', item: { id: 'answer', type: 'agent_message', text: 'Done.' } }),
      JSON.stringify({ type: 'turn.completed', usage: {} }),
    ].join('\n'))?.error).toBeUndefined();
  });

  it('uses structured Claude output and normalizes live text and tool lifecycle', () => {
    const adapter = registry.get('claude-code');
    const boot = adapter.bootstrap(bootstrapInput());
    expect(boot.command).toEqual(expect.arrayContaining([
      '--output-format', 'stream-json', '--include-partial-messages',
    ]));
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'stream_event',
      event: { type: 'content_block_start', content_block: { type: 'tool_use', id: 'tool-1', name: 'Read' } },
    }))).toEqual([{ type: 'activity', activity: { id: 'tool-1', kind: 'tool', label: 'Read', status: 'running' } }]);
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'I can help.' } },
    }))).toEqual([{ type: 'token', text: 'I can help.' }]);
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tool-1', is_error: false }] },
    }))).toEqual([{ type: 'activity', activity: { id: 'tool-1', kind: 'tool', label: 'Tool', status: 'completed' } }]);
    expect(adapter.parseOutput?.(JSON.stringify({ type: 'result', result: 'I can help.', is_error: false })))
      .toEqual({ response: 'I can help.', activities: [] });
  });

  it('normalizes Codex message, reasoning, tool, and failure events', () => {
    const adapter = registry.get('codex');
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'item.started', item: { id: 'cmd-1', type: 'command_execution', command: 'cat CANDIDATE.md' },
    }))).toEqual([{ type: 'activity', activity: { id: 'cmd-1', kind: 'tool', label: 'Run cat', status: 'running' } }]);
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'item.completed', item: { id: 'msg-1', type: 'agent_message', text: 'Done.' },
    }))).toEqual([{ type: 'token', text: 'Done.' }]);
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'turn.failed', error: { message: 'Provider unavailable' },
    }))).toEqual([{ type: 'error', message: 'Provider unavailable' }]);
  });

  it('normalizes OpenCode text and tool events through the same contract', () => {
    const adapter = registry.get('opencode');
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'text', part: { type: 'text', text: 'Checking the résumé.' },
    }))).toEqual([{ type: 'token', text: 'Checking the résumé.' }]);
    expect(adapter.parseStreamEvent?.(JSON.stringify({
      type: 'tool_use', part: { type: 'tool', callID: 'read-1', tool: 'read', state: { status: 'running', title: 'Read CANDIDATE.md' } },
    }))).toEqual([{ type: 'activity', activity: { id: 'read-1', kind: 'tool', label: 'Read', status: 'running' } }]);
  });

  describe.each(HARNESS_IDS)('%s', (id: HarnessId) => {
    const adapter = () => registry.get(id);

    it('routes every call at the LiteLLM proxy base URL', () => {
      const { env, files } = adapter().bootstrap(bootstrapInput());
      const surface = JSON.stringify({ env, files });
      expect(surface).toContain('http://litellm:4000');
      // No direct provider endpoint may appear anywhere in the sandbox config.
      expect(surface).not.toMatch(
        /https:\/\/api\.(anthropic|openai)\.com|generativelanguage\.googleapis\.com/,
      );
    });

    it('tags the proxy request with the active harness', () => {
      const boot = adapter().bootstrap(bootstrapInput());
      expect(boot.proxyHeaders[LITELLM_TAG_HEADER]).toBe(`harness=${id}`);
      // and the tag must actually reach the wire via env or a config file,
      // not just be reported back to us.
      const surface = JSON.stringify({ env: boot.env, files: boot.files });
      expect(surface).toContain(`harness=${id}`);
    });

    it('carries the resolved alias rather than a model literal', () => {
      const boot = adapter().bootstrap(bootstrapInput());
      const surface = JSON.stringify({
        env: boot.env,
        files: boot.files,
        command: boot.command,
      });
      expect(surface).toContain('anthropic/claude-sonnet-4-5/high');
    });

    it('authenticates only with the metered proxy key', () => {
      const { env } = adapter().bootstrap(bootstrapInput());
      const values = Object.values(env).join(' ');
      expect(values).toContain('sk-litellm-virtual-abc123');

      // Nothing that smells like a consumer-subscription credential.
      for (const name of Object.keys(env)) {
        expect(name).not.toMatch(
          /OAUTH|REFRESH_TOKEN|SESSION_KEY|SUBSCRIPTION/i,
        );
      }
      expect(values).not.toMatch(/sk-ant-oat|oauth|Bearer ya29\./i);
    });
  });

  /**
   * Claude Pro/Max and ChatGPT Plus/Pro logins are Consumer Terms paths and are
   * prohibited here with no exception, so this asserts against the source of
   * the whole harness layer rather than against one adapter's output — an
   * env-flag escape hatch added later still fails this.
   */
  it('has no subscription-OAuth auth path anywhere in the harness layer', () => {
    const sources = readdirSync(HARNESS_DIR)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
      .map((f) => ({
        file: f,
        code: readFileSync(join(HARNESS_DIR, f), 'utf8'),
      }));

    expect(sources.length).toBeGreaterThanOrEqual(HARNESS_IDS.length);

    const forbidden: RegExp[] = [
      /claude\s+setup-token/i,
      /codex\s+login/i,
      /opencode\s+auth\s+login/i,
      /CLAUDE_CODE_OAUTH_TOKEN/,
      /OPENAI_CODEX_AUTH/i,
      /auth\.json/i,
      /sk-ant-oat/i,
      /oauth/i,
      /subscription[_-]?(login|auth)/i,
    ];

    for (const { file, code } of sources) {
      // Comments are allowed to say the word "oauth" while forbidding it; the
      // check targets executable code.
      const executable = code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const pattern of forbidden) {
        expect({ file, match: executable.match(pattern)?.[0] ?? null }).toEqual(
          {
            file,
            match: null,
          },
        );
      }
    }
  });

  it('keeps OpenCode in one auto-approved, plugin-free session across turns', () => {
    const boot = registry.get('opencode').bootstrap(bootstrapInput());
    expect(boot.command).toEqual(
      expect.arrayContaining([
        '--continue',
        '--auto',
        '--pure',
        '--format',
        'json',
      ]),
    );
  });

  it('separates OpenCode tool activity from its final assistant response', () => {
    const adapter = registry.get('opencode');
    const output = [
      JSON.stringify({
        type: 'text',
        part: {
          type: 'text',
          text: 'I will inspect the candidate facts first.',
        },
      }),
      JSON.stringify({
        type: 'tool_use',
        part: {
          type: 'tool',
          tool: 'read',
          state: { status: 'completed', title: 'Read CANDIDATE.md' },
        },
      }),
      JSON.stringify({
        type: 'text',
        part: {
          type: 'text',
          text: 'I tailored the résumé for the cloud role and kept every claim grounded in your profile.',
        },
      }),
      JSON.stringify({
        type: 'step_finish',
        part: { type: 'step-finish', reason: 'stop' },
      }),
    ].join('\n');

    expect(adapter.parseOutput?.(output)).toEqual({
      response:
        'I tailored the résumé for the cloud role and kept every claim grounded in your profile.',
      activities: [{ label: 'Read CANDIDATE.md', status: 'completed' }],
    });
  });
});

/**
 * Output-token ceilings.
 *
 * Models differ in how much they may emit in one response — Nova Micro caps at
 * 10,240 — and a harness that asks for more gets a hard provider error on its
 * very first turn ("maxTokens must be between 1 and 10240"), not a truncated
 * reply. Each harness therefore has to be told the ceiling.
 *
 * The number arrives on the resolved alias, i.e. from the alias collection.
 * That is the whole point: a per-model limit is a fact about a model, and this
 * codebase does not keep facts about models in code.
 */
describe('harness bootstrap — output token ceiling', () => {
  const registry = new HarnessRegistry();

  const inputWithLimit = (maxOutputTokens?: number) => ({
    sessionId: 'sess-1',
    workdir: '/workspace',
    proxy: {
      baseUrl: 'http://litellm:4000',
      apiKey: 'sk-litellm-virtual-abc123',
    },
    alias: {
      alias: 'bedrock/nova-micro/low',
      provider: 'bedrock',
      model: 'nova-micro',
      effort: 'low',
      label: 'Nova Micro',
      maxOutputTokens,
      maxInputTokens: maxOutputTokens ? 128000 : undefined,
    },
    contextFiles: [],
  });

  describe.each(HARNESS_IDS)('%s', (id: HarnessId) => {
    it('carries the ceiling into its own config when the alias sets one', () => {
      const boot = registry.get(id).bootstrap(inputWithLimit(8192) as any);
      const surface = JSON.stringify({ env: boot.env, files: boot.files });
      expect(surface).toContain('8192');
    });

    it('says nothing about a ceiling when the alias has none', () => {
      const boot = registry.get(id).bootstrap(inputWithLimit(undefined) as any);
      const surface = JSON.stringify({ env: boot.env, files: boot.files });
      // No invented default — an absent limit must stay absent.
      expect(surface).not.toMatch(
        /8192|maxOutputTokens|max_output_tokens.*null/,
      );
    });
  });
});
