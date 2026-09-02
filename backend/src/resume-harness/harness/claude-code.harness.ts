import {
  HarnessAdapter,
  HarnessBootstrap,
  HarnessBootstrapInput,
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
 * route and forwards under the operator's Console key.
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
        '--permission-mode',
        'acceptEdits',
        '--output-format',
        'text',
        PROMPT_PLACEHOLDER,
      ],
      proxyHeaders: harnessProxyHeaders(this.id),
    };
  }

  turnCommand(bootstrap: HarnessBootstrap, prompt: string): string[] {
    return fillPrompt(bootstrap.command, prompt);
  }

  /** Exposed for logging/assertion; identical to what the header carries. */
  get tag(): string {
    return harnessTag(this.id);
  }
}
