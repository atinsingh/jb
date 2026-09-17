import {
  HarnessAdapter,
  HarnessBootstrap,
  HarnessBootstrapInput,
  HarnessOutput,
  LITELLM_TAG_HEADER,
  PROMPT_PLACEHOLDER,
  ResolvedModelAlias,
  fillPrompt,
  harnessProxyHeaders,
  harnessTag,
} from './harness.types';

/**
 * Codex CLI, pointed at the LiteLLM proxy.
 *
 * Codex resolves its endpoint from a named entry under `[model_providers]` in
 * its config, which is also the only place it will attach custom headers — so
 * unlike Claude Code this adapter has to write a config file rather than set
 * environment variables alone. `CODEX_HOME` moves that config inside the
 * session workspace so it dies with the sandbox.
 *
 * The credential is a LiteLLM virtual key read from `OPENAI_API_KEY` via the
 * provider's `env_key`. The ChatGPT Plus/Pro login path is a Consumer Terms
 * product and is not implemented here in any form.
 *
 * Codex reads AGENTS.md natively, so no extra context file is generated.
 */
export class CodexHarness implements HarnessAdapter {
  readonly id = 'codex' as const;
  readonly displayName = 'Codex';
  readonly contextFileNames = ['AGENTS.md'];

  bootstrap(input: HarnessBootstrapInput): HarnessBootstrap {
    const { proxy, alias, workdir } = input;
    const codexHome = `${workdir}/.codex`;

    return {
      env: {
        OPENAI_BASE_URL: proxy.baseUrl,
        OPENAI_API_KEY: proxy.apiKey,
        CODEX_HOME: codexHome,
        HOME: workdir,
      },
      files: [
        ...input.contextFiles,
        {
          path: '.codex/config.toml',
          contents: this.configToml(proxy.baseUrl, alias),
        },
      ],
      command: [
        'codex',
        'exec',
        // JSONL is what the résumé screen streams as tool/thinking activity.
        // Without it Codex is silent until the process exits.
        '--json',
        // The workspace is not a git repo; without this Codex refuses to run.
        '--skip-git-repo-check',
        PROMPT_PLACEHOLDER,
      ],
      proxyHeaders: harnessProxyHeaders(this.id),
    };
  }

  turnCommand(bootstrap: HarnessBootstrap, prompt: string): string[] {
    return fillPrompt(bootstrap.command, prompt);
  }

  parseOutput(stdout: string): HarnessOutput {
    const text: string[] = [];
    const activities = new Map<string, HarnessOutput['activities'][number]>();

    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        this.ingestEvent(event, text, activities);
      } catch {
        // Codex may print a diagnostic on stdout. It is not assistant text.
      }
    }

    return {
      response: text.at(-1),
      activities: [...activities.values()],
    };
  }

  private ingestEvent(
    event: any,
    text: string[],
    activities: Map<string, HarnessOutput['activities'][number]>,
  ): void {
    const errorMessage = this.errorMessage(event);
    if (errorMessage) {
      activities.set('codex-error', {
        id: 'codex-error',
        label: errorMessage.slice(0, 240),
        status: 'error',
      });
      return;
    }

    const item = event?.item;
    if (!item || typeof item !== 'object') return;
    if (item.type === 'agent_message') {
      const message = String(item.text || '').trim();
      if (message) text.push(message);
      return;
    }

    const id = String(item.id || event.type || activities.size);
    const label = this.itemLabel(item);
    if (!label) return;

    const status = this.itemStatus(event?.type, item.status);
    activities.set(id, { id, label: label.slice(0, 240), status });
  }

  private errorMessage(event: any): string | undefined {
    if (event?.type === 'error') {
      const message = String(event.message || event.error || '').trim();
      return message || undefined;
    }
    if (event?.type === 'turn.failed') {
      const message = String(
        event.error?.message || event.message || '',
      ).trim();
      return message || 'Codex turn failed.';
    }
    return undefined;
  }

  private itemStatus(
    eventType: unknown,
    itemStatus: unknown,
  ): HarnessOutput['activities'][number]['status'] {
    if (itemStatus === 'failed' || eventType === 'item.failed') return 'error';
    if (itemStatus === 'completed' || eventType === 'item.completed') {
      return 'completed';
    }
    if (eventType === 'item.started' || eventType === 'item.updated') {
      return 'running';
    }
    if (['pending', 'running', 'completed', 'error'].includes(String(itemStatus))) {
      return itemStatus as HarnessOutput['activities'][number]['status'];
    }
    return 'running';
  }

  private itemLabel(item: any): string | undefined {
    if (item.type === 'reasoning') {
      const summary = Array.isArray(item.summary)
        ? item.summary.map((part: any) => part?.text).find(Boolean)
        : undefined;
      return String(summary || item.text || 'Thinking').trim();
    }
    if (item.type === 'command_execution') {
      return String(item.command || 'shell').trim();
    }
    if (item.type === 'mcp_tool_call' || item.type === 'tool_call') {
      return String(item.tool || item.name || item.title || 'tool').trim();
    }
    if (item.type === 'file_change' || item.type === 'patch') {
      const path =
        item.changes?.[0]?.path || item.path || item.file || 'files';
      return `Edit ${path}`;
    }
    if (item.type === 'web_search') {
      return String(item.query || 'Search').trim();
    }
    const fallback = String(item.title || item.text || '').trim();
    return fallback || undefined;
  }

  private configToml(baseUrl: string, alias: ResolvedModelAlias): string {
    // The OpenAI-compatible route lives under /v1; Codex appends the rest.
    const apiBase = `${baseUrl.replace(/\/+$/, '')}/v1`;
    const ceiling = alias.maxOutputTokens
      ? [`model_max_output_tokens = ${alias.maxOutputTokens}`]
      : [];

    return [
      `model = "${alias.alias}"`,
      'model_provider = "litellm"',
      `model_reasoning_effort = "${alias.effort}"`,
      ...ceiling,
      // The sandbox is the isolation boundary; no interactive approval exists.
      'approval_policy = "never"',
      'sandbox_mode = "workspace-write"',
      '',
      '[model_providers.litellm]',
      'name = "LiteLLM"',
      `base_url = "${apiBase}"`,
      'env_key = "OPENAI_API_KEY"',
      'wire_api = "responses"',
      '',
      '[model_providers.litellm.http_headers]',
      `"${LITELLM_TAG_HEADER}" = "${harnessTag(this.id)}"`,
      '',
    ].join('\n');
  }
}
