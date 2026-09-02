import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { HarnessRegistry } from '../harness/harness.registry';
import { HARNESS_IDS, HarnessId, LITELLM_TAG_HEADER } from '../harness/harness.types';

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
    expect(registry.list().map((h) => h.id).sort()).toEqual(
      [...HARNESS_IDS].sort(),
    );
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
        expect(name).not.toMatch(/OAUTH|REFRESH_TOKEN|SESSION_KEY|SUBSCRIPTION/i);
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
      .map((f) => ({ file: f, code: readFileSync(join(HARNESS_DIR, f), 'utf8') }));

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
        expect({ file, match: executable.match(pattern)?.[0] ?? null }).toEqual({
          file,
          match: null,
        });
      }
    }
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
    proxy: { baseUrl: 'http://litellm:4000', apiKey: 'sk-litellm-virtual-abc123' },
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
      expect(surface).not.toMatch(/8192|maxOutputTokens|max_output_tokens.*null/);
    });
  });
});
