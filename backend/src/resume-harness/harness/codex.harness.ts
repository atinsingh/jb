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

  private configToml(baseUrl: string, alias: ResolvedModelAlias): string {
    // The OpenAI-compatible route lives under /v1; Codex appends the rest.
    const apiBase = `${baseUrl.replace(/\/+$/, '')}/v1`;
    const ceiling = alias.maxOutputTokens
      ? [`model_max_output_tokens = ${alias.maxOutputTokens}`]
      : [];

    return [
      `model = "${alias.alias}"`,
      'model_provider = "litellm"',
      ...ceiling,
      // The sandbox is the isolation boundary; no interactive approval exists.
      'approval_policy = "never"',
      'sandbox_mode = "workspace-write"',
      '',
      '[model_providers.litellm]',
      'name = "LiteLLM"',
      `base_url = "${apiBase}"`,
      'env_key = "OPENAI_API_KEY"',
      'wire_api = "chat"',
      '',
      '[model_providers.litellm.http_headers]',
      `"${LITELLM_TAG_HEADER}" = "${harnessTag(this.id)}"`,
      '',
    ].join('\n');
  }
}
