import {
  HarnessAdapter,
  HarnessBootstrap,
  HarnessBootstrapInput,
  HarnessOutput,
  HarnessStreamEvent,
  LITELLM_TAG_HEADER,
  PROMPT_PLACEHOLDER,
  ResolvedModelAlias,
  fillPrompt,
  harnessProxyHeaders,
  harnessTag,
} from './harness.types';

/**
 * OpenCode, pointed at the LiteLLM proxy.
 *
 * OpenCode configures providers in `opencode.json` and can drive any
 * OpenAI-compatible endpoint through the `@ai-sdk/openai-compatible` package,
 * which is exactly what the proxy is. The provider is declared inline rather
 * than by name so the alias list is whatever the proxy exposes for this
 * session, with no model catalogue baked into the image.
 *
 * The credential is a LiteLLM virtual key, on the same metered footing as the
 * other two harnesses. There is no interactive sign-in step here.
 *
 * OpenCode reads AGENTS.md natively, so no extra context file is generated.
 */
export class OpenCodeHarness implements HarnessAdapter {
  readonly id = 'opencode' as const;
  readonly displayName = 'OpenCode';
  readonly contextFileNames = ['AGENTS.md'];

  bootstrap(input: HarnessBootstrapInput): HarnessBootstrap {
    const { proxy, alias, workdir } = input;
    const configPath = 'opencode.json';

    return {
      env: {
        OPENCODE_CONFIG: `${workdir}/${configPath}`,
        // Referenced from the config below as {env:LITELLM_API_KEY} so the key
        // is never written to a file on disk.
        LITELLM_API_KEY: proxy.apiKey,
        OPENCODE_DISABLE_AUTOUPDATE: '1',
        HOME: workdir,
      },
      files: [
        ...input.contextFiles,
        {
          path: configPath,
          contents: this.config(proxy.baseUrl, alias),
        },
      ],
      command: [
        'opencode',
        'run',
        // HOME is the persistent session workspace. Continue keeps the
        // conversation and its corrections across product turns; on an empty
        // workspace OpenCode starts a session automatically.
        '--continue',
        // The container is the approval boundary. Auto approval lets OpenCode
        // run the build command its contract requires instead of silently
        // skipping shell tools in non-interactive mode.
        '--auto',
        // User-level plugins would make identical sandboxes behave differently.
        '--pure',
        // JSONL separates intermediate text, tool use and the final response.
        // The service exposes tool activity live and saves only the final text.
        '--format',
        'json',
        PROMPT_PLACEHOLDER,
      ],
      proxyHeaders: harnessProxyHeaders(this.id),
    };
  }

  turnCommand(bootstrap: HarnessBootstrap, prompt: string): string[] {
    return fillPrompt(bootstrap.command, prompt);
  }

  parseStreamEvent(line: string): HarnessStreamEvent[] {
    let event: any;
    try { event = JSON.parse(line); } catch { return []; }
    const part = event?.part;
    if (event?.type === 'text' && part?.type === 'text' && part.text) {
      return [{ type: 'token', text: String(part.text) }];
    }
    if (event?.type === 'tool_use' && part?.type === 'tool') {
      return [{
        type: 'activity',
        activity: {
          id: String(part.callID || part.id || part.tool || 'tool'),
          kind: 'tool',
          label: this.toolLabel(part.tool),
          status: ['pending', 'running', 'completed', 'error'].includes(part.state?.status)
            ? part.state.status
            : 'running',
        },
      }];
    }
    if (event?.type === 'error') {
      return [{ type: 'error', message: String(event.error?.message || event.message || 'OpenCode failed.') }];
    }
    return [];
  }

  parseOutput(stdout: string): HarnessOutput {
    const text: string[] = [];
    const activities = new Map<string, HarnessOutput['activities'][number]>();

    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        const part = event?.part;
        if (event?.type === 'text' && part?.type === 'text' && part.text?.trim()) {
          text.push(part.text.trim());
        }
        if (event?.type === 'tool_use' && part?.type === 'tool') {
          const eventId = part.callID || part.id;
          const id = String(eventId || `${activities.size}`);
          const status = ['pending', 'running', 'completed', 'error'].includes(part.state?.status)
            ? part.state.status
            : undefined;
          activities.set(id, {
            ...(eventId ? { id } : {}),
            label: String(part.state?.title || this.toolLabel(part.tool)).slice(0, 240),
            status,
          });
        }
      } catch {
        // OpenCode may place a diagnostic on stdout. It is not assistant text.
      }
    }

    return {
      response: text.at(-1),
      activities: [...activities.values()],
    };
  }

  private toolLabel(tool: unknown): string {
    const name = String(tool || 'tool').replace(/[_-]+/g, ' ');
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  }

  private config(baseUrl: string, alias: ResolvedModelAlias): string {
    // The AI SDK's openai-compatible provider appends /chat/completions to
    // baseURL, so it must point at the proxy's /v1 root, not the host root.
    const apiBase = `${baseUrl.replace(/\/+$/, '')}/v1`;

    const model: Record<string, unknown> = { name: alias.label || alias.alias };
    // Both halves or neither: OpenCode validates `limit` strictly and refuses
    // to start on a partial block ("Missing key …limit.context") rather than
    // defaulting the half you left out. Without any limit it asks for its own
    // default, which a small model rejects outright.
    if (alias.maxOutputTokens && alias.maxInputTokens) {
      model.limit = {
        context: alias.maxInputTokens,
        output: alias.maxOutputTokens,
      };
    }

    return `${JSON.stringify(
      {
        $schema: 'https://opencode.ai/config.json',
        provider: {
          litellm: {
            npm: '@ai-sdk/openai-compatible',
            name: 'LiteLLM',
            options: {
              baseURL: apiBase,
              apiKey: '{env:LITELLM_API_KEY}',
              headers: {
                [LITELLM_TAG_HEADER]: harnessTag(this.id),
              },
            },
            models: {
              [alias.alias]: model,
            },
          },
        },
        model: `litellm/${alias.alias}`,
        autoupdate: false,
      },
      null,
      2,
    )}\n`;
  }
}
