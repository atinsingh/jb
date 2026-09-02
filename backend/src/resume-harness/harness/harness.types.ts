/**
 * Harness layer contracts.
 *
 * A "harness" is the agent CLI that actually edits the LaTeX resume inside the
 * session sandbox: Claude Code, Codex, or OpenCode. The rest of the module only
 * ever talks to `HarnessAdapter`, so adding or removing a supported harness is
 * a registry entry plus one adapter file — the generation flow does not change.
 *
 * Two rules are enforced here rather than trusted to each adapter:
 *
 * 1. **Metered keys only.** Every adapter is handed one credential: a LiteLLM
 *    virtual key. Claude Pro/Max and ChatGPT Plus/Pro logins are Consumer Terms
 *    paths and must never reach this system, so no adapter may emit a
 *    subscription login step, a token file, or an env flag that re-enables one.
 *    `harness-bootstrap.spec.ts` asserts this against the source of this folder.
 *
 * 2. **The alias is opaque.** An adapter receives a resolved provider+model+
 *    effort alias and passes it through. It never names a model, never picks an
 *    effort level, and never inspects the user's tier.
 */

/** The harnesses this platform supports, in display order. */
export const HARNESS_IDS = ['claude-code', 'codex', 'opencode'] as const;

export type HarnessId = (typeof HARNESS_IDS)[number];

/**
 * LiteLLM reads request tags from this header and stores them on the spend log,
 * which is how per-harness usage stays reportable without giving each harness
 * its own alias namespace (see JOB-98 "RESOLVED - OpenCode alias namespace").
 */
export const LITELLM_TAG_HEADER = 'x-litellm-tags';

/** A file dropped into the sandbox workspace before the harness runs. */
export interface HarnessContextFile {
  /** Path relative to the sandbox workdir. */
  path: string;
  contents: string;
}

/**
 * A model+effort alias as configured on the LiteLLM proxy, after the caller's
 * tier has been checked. Adapters treat `alias` as the model name to send.
 */
export interface ResolvedModelAlias {
  alias: string;
  provider: string;
  model: string;
  effort: string;
  label: string;
  /** Plan type the alias was resolved against; carried for display and support. */
  tier?: string;
  /**
   * Most output tokens this model accepts in one response, when it is lower
   * than what a harness would otherwise ask for. Nova Micro caps at 10,240 and
   * rejects the request outright rather than truncating, so the harness has to
   * be told. Undefined means "no ceiling worth stating" — never a default
   * invented here, because a per-model limit is a fact about a model and those
   * live in the alias collection, not in code.
   */
  maxOutputTokens?: number;
  /**
   * Context window. Needed alongside maxOutputTokens because OpenCode rejects
   * a partial `limit` block outright rather than defaulting the missing half.
   */
  maxInputTokens?: number;
}

export interface HarnessProxyAuth {
  /** Base URL of the LiteLLM proxy. No provider endpoint is ever used. */
  baseUrl: string;
  /** LiteLLM virtual key — metered, scoped, revocable. */
  apiKey: string;
}

export interface HarnessBootstrapInput {
  sessionId: string;
  /** Absolute path of the workspace inside the sandbox. */
  workdir: string;
  proxy: HarnessProxyAuth;
  alias: ResolvedModelAlias;
  /** Shared/context files produced by `ContextFilesService`. */
  contextFiles: HarnessContextFile[];
}

export interface HarnessBootstrap {
  /** Environment for every process in the sandbox. */
  env: Record<string, string>;
  /** Context files plus any harness-specific config file. */
  files: HarnessContextFile[];
  /**
   * argv used to run one non-interactive turn. `PROMPT_PLACEHOLDER` is
   * substituted with the turn instruction by `turnCommand`.
   */
  command: string[];
  /** Headers this harness will send to the proxy, for assertion and logging. */
  proxyHeaders: Record<string, string>;
}

/** Substituted with the turn's instruction when the command is executed. */
export const PROMPT_PLACEHOLDER = '__JOBOCATE_PROMPT__';

export interface HarnessAdapter {
  readonly id: HarnessId;
  readonly displayName: string;
  /**
   * Which shared-rule files this harness reads natively. Codex and OpenCode
   * read `AGENTS.md`; Claude Code reads `CLAUDE.md` and imports `AGENTS.md`
   * from it.
   */
  readonly contextFileNames: string[];
  bootstrap(input: HarnessBootstrapInput): HarnessBootstrap;
  /** Fills the prompt into the bootstrap command for one turn. */
  turnCommand(bootstrap: HarnessBootstrap, prompt: string): string[];
}

/** The tag every proxy request from `id` carries. */
export const harnessTag = (id: HarnessId): string => `harness=${id}`;

/** Header map shared by all adapters. */
export const harnessProxyHeaders = (
  id: HarnessId,
): Record<string, string> => ({
  [LITELLM_TAG_HEADER]: harnessTag(id),
});

/** Default prompt substitution shared by all adapters. */
export const fillPrompt = (
  command: string[],
  prompt: string,
): string[] => command.map((arg) => (arg === PROMPT_PLACEHOLDER ? prompt : arg));
