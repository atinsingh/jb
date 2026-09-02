import {
  HarnessAdapter,
  HarnessBootstrap,
  HarnessBootstrapInput,
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
      command: ['opencode', 'run', PROMPT_PLACEHOLDER],
      proxyHeaders: harnessProxyHeaders(this.id),
    };
  }

  turnCommand(bootstrap: HarnessBootstrap, prompt: string): string[] {
    return fillPrompt(bootstrap.command, prompt);
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
