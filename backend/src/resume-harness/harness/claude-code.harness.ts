import {
  HarnessAdapter,
  HarnessBootstrap,
  HarnessBootstrapInput,
  HarnessOutput,
  HarnessStreamEvent,
  PROMPT_PLACEHOLDER,
  fillPrompt,
  harnessProxyHeaders,
  harnessTag,
} from './harness.types';

/**
 * Claude Code, pointed at the LiteLLM proxy.
 *
 * Claude Code speaks the Anthropic Messages wire format and takes its endpoint
 * and credential from `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN`, so routing
 * it through the proxy needs no wrapper — the proxy exposes an Anthropic-shaped
 * route and forwards to Bedrock with IAM.
 *
 * The credential handed in is a LiteLLM virtual key, which is metered per
 * request. The Claude Pro/Max login path is a Consumer Terms product and is not
 * implemented here, not behind a flag, and not as a fallback.
 *
 * Claude Code does not read AGENTS.md natively, so the shared rules reach it
 * through the `@AGENTS.md` import that `ContextFilesService` writes into
 * CLAUDE.md.
 */
export class ClaudeCodeHarness implements HarnessAdapter {
  readonly id = 'claude-code' as const;
  readonly displayName = 'Claude Code';
  readonly contextFileNames = ['AGENTS.md', 'CLAUDE.md'];

  bootstrap(input: HarnessBootstrapInput): HarnessBootstrap {
    const { proxy, alias, workdir } = input;

    return {
      env: {
        ANTHROPIC_BASE_URL: proxy.baseUrl,
        // Claude Code sends this as the bearer credential. It is the LiteLLM
        // virtual key, never a provider key and never a subscription token.
        ANTHROPIC_AUTH_TOKEN: proxy.apiKey,
        ANTHROPIC_API_KEY: proxy.apiKey,
        // The alias is opaque here: whatever provider+model+effort the proxy
        // has mapped it to is the proxy's business.
        ANTHROPIC_MODEL: alias.alias,
        ANTHROPIC_SMALL_FAST_MODEL: alias.alias,
        // Tags the spend log so per-harness usage is reportable.
        ANTHROPIC_CUSTOM_HEADERS: Object.entries(harnessProxyHeaders(this.id))
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n'),
        // Only set when the alias states a ceiling — an invented default here
        // would be a model fact living in code.
        ...(alias.maxOutputTokens
          ? { CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(alias.maxOutputTokens) }
          : {}),
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        DISABLE_TELEMETRY: '1',
        HOME: workdir,
      },
      files: input.contextFiles,
      command: [
        'claude',
        '--print',
        // The sandbox is the isolation boundary, so the harness is free to edit
        // inside it without a human approving each write.
        '--dangerously-skip-permissions',
        '--output-format',
        'stream-json',
        '--include-partial-messages',
        '--verbose',
        PROMPT_PLACEHOLDER,
      ],
      proxyHeaders: harnessProxyHeaders(this.id),
    };
  }

  turnCommand(bootstrap: HarnessBootstrap, prompt: string): string[] {
    return fillPrompt(bootstrap.command, prompt);
  }

  parseStreamEvent(line: string): HarnessStreamEvent[] {
    let record: any;
    try { record = JSON.parse(line); } catch { return []; }
    if (record?.type === 'stream_event') {
      const event = record.event;
      if (event?.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const text = String(event.delta.text || '');
        return text ? [{ type: 'token', text }] : [];
      }
      if (event?.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        const tool = event.content_block;
        return [{
          type: 'activity',
          activity: { id: String(tool.id || 'tool'), kind: 'tool', label: String(tool.name || 'Tool').slice(0, 80), status: 'running' },
        }];
      }
    }
    if (record?.type === 'user' && Array.isArray(record.message?.content)) {
      return record.message.content
        .filter((part: any) => part?.type === 'tool_result' && part.tool_use_id)
        .map((part: any) => ({
          type: 'activity' as const,
          activity: { id: String(part.tool_use_id), kind: 'tool' as const, label: 'Tool', status: part.is_error ? 'error' as const : 'completed' as const },
        }));
    }
    if (record?.type === 'result' && record.is_error) {
      return [{ type: 'error', message: String(record.result || record.error || 'Claude Code failed.').slice(0, 240) }];
    }
    return [];
  }

  parseOutput(stdout: string): HarnessOutput {
    let response: string | undefined;
    let error: string | undefined;
    const activities = new Map<string, HarnessOutput['activities'][number]>();
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let record: any;
      try { record = JSON.parse(line); } catch { continue; }
      if (record?.type === 'assistant' && Array.isArray(record.message?.content)) {
        const text = record.message.content
          .filter((part: any) => part?.type === 'text')
          .map((part: any) => String(part.text || ''))
          .join('');
        if (text.trim()) response = text.trim();
      }
      if (record?.type === 'result') {
        if (record.is_error) error = String(record.result || record.error || 'Claude Code failed.');
        else if (record.result) response = String(record.result).trim();
      }
      for (const event of this.parseStreamEvent(line)) {
        if (event.type !== 'activity') continue;
        const existing = activities.get(event.activity.id || 'tool');
        activities.set(event.activity.id || 'tool', {
          ...existing,
          ...event.activity,
          label: event.activity.label === 'Tool' && existing?.label ? existing.label : event.activity.label,
        });
      }
    }
    return { response, activities: [...activities.values()], ...(error ? { error } : {}) };
  }

  /** Exposed for logging/assertion; identical to what the header carries. */
  get tag(): string {
    return harnessTag(this.id);
  }
}
