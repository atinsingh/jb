import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The picker is a join of two catalogues: LiteLLM aliases in
 * `infra/litellm/config.yaml`, and the Mongo rows seeded from
 * `seed-harness-aliases.ts`. Every seeded model must exist on the proxy, but a
 * protocol-only model may remain on the proxy without being offered in the
 * product picker.
 */
const REPO = join(__dirname, '..', '..', '..', '..');
const CONFIG = readFileSync(
  join(REPO, 'infra', 'litellm', 'config.yaml'),
  'utf8',
);
const SEED = readFileSync(
  join(__dirname, '..', '..', 'scripts', 'seed-harness-aliases.ts'),
  'utf8',
);

const seededAliases = [...SEED.matchAll(/alias:\s*'([^']+)'/g)].map(
  (m) => m[1],
);
const configAliases = [...CONFIG.matchAll(/^\s*- model_name:\s*(\S+)/gm)].map(
  (m) => m[1],
);

describe('harness alias catalogue', () => {
  it('keeps GPT-5.6 Luna on the Bedrock IAM proxy but does not offer it', () => {
    expect(
      configAliases.filter((alias) => alias.startsWith('openai/gpt-5.6-luna/')),
    ).toEqual([
      'openai/gpt-5.6-luna/low',
      'openai/gpt-5.6-luna/medium',
      'openai/gpt-5.6-luna/high',
      'openai/gpt-5.6-luna/xhigh',
      'openai/gpt-5.6-luna/max',
    ]);
    expect(seededAliases.join('\n')).not.toMatch(/gpt-5\.6-luna/);
  });

  it('sends GPT-5.6 Luna through Bedrock IAM, not an OpenAI Platform key', () => {
    // Codex still owns the runtime when Luna is re-seeded. The proxy
    // backend must be Bedrock so this account's IAM pair is enough.
    const lunaBlocks = [
      ...CONFIG.matchAll(
        /- model_name:\s*(openai\/gpt-5\.6-luna\/\S+)\r?\n([\s\S]*?)(?=\r?\n  - model_name:|\r?\nlitellm_settings:)/g,
      ),
    ];
    expect(lunaBlocks.map((match) => match[1])).toEqual([
      'openai/gpt-5.6-luna/low',
      'openai/gpt-5.6-luna/medium',
      'openai/gpt-5.6-luna/high',
      'openai/gpt-5.6-luna/xhigh',
      'openai/gpt-5.6-luna/max',
    ]);
    for (const [, , body] of lunaBlocks) {
      expect(body).toMatch(/model:\s*bedrock\/converse\/us\.openai\.gpt-5\.6-luna/);
      expect(body).toMatch(/aws_access_key_id:\s*os\.environ\/AWS_ACCESS_KEY_ID/);
      expect(body).toMatch(
        /aws_secret_access_key:\s*os\.environ\/AWS_SECRET_ACCESS_KEY/,
      );
      expect(body).not.toMatch(/OPENAI_API_KEY/);
      expect(body).not.toMatch(/model:\s*openai\/gpt-5\.6-luna\s*$/m);
    }
  });

  it('offers only verified Haiku and Sonnet 4.6 routes through Bedrock IAM', () => {
    const claudeBlocks = [
      ...CONFIG.matchAll(
        /- model_name:\s*(anthropic\/claude-[^\s]+)\r?\n([\s\S]*?)(?=\r?\n  - model_name:|\r?\nlitellm_settings:)/g,
      ),
    ];
    expect(claudeBlocks.map((match) => match[1])).toEqual([
      'anthropic/claude-haiku-4-5/low',
      'anthropic/claude-sonnet-4-6/low',
      'anthropic/claude-sonnet-4-6/high',
    ]);
    for (const [, , body] of claudeBlocks) {
      expect(body).toMatch(/model:\s*bedrock\/us\.anthropic\.claude-/);
      expect(body).toMatch(/aws_access_key_id:\s*os\.environ\/AWS_ACCESS_KEY_ID/);
      expect(body).toMatch(
        /aws_secret_access_key:\s*os\.environ\/AWS_SECRET_ACCESS_KEY/,
      );
      expect(body).not.toMatch(/ANTHROPIC_API_KEY/);
      expect(body).not.toMatch(/model:\s*anthropic\/claude-/);
    }
    const claudeProviders = [
      ...SEED.matchAll(
        /alias:\s*'anthropic\/claude-[^']+'[\s\S]*?provider:\s*'([^']+)'/g,
      ),
    ].map((match) => match[1]);
    expect(claudeProviders.every((provider) => provider === 'anthropic')).toBe(
      true,
    );
    expect(seededAliases.filter((alias) => alias.startsWith('anthropic/claude-'))).toEqual([
      'anthropic/claude-haiku-4-5/low',
      'anthropic/claude-sonnet-4-6/low',
      'anthropic/claude-sonnet-4-6/high',
    ]);
  });

  it('clears stale Sonnet tier defaults when the catalogue is re-seeded', () => {
    const sonnetRows = [
      ...SEED.matchAll(
        /alias:\s*'(anthropic\/claude-sonnet-4-6\/(?:low|high))'([\s\S]*?)\r?\n  \},/g,
      ),
    ];
    expect(sonnetRows.map((match) => match[1])).toEqual([
      'anthropic/claude-sonnet-4-6/low',
      'anthropic/claude-sonnet-4-6/high',
    ]);
    for (const [, , body] of sonnetRows) {
      expect(body).toMatch(/defaultForTiers:\s*\[\]/);
    }
  });

  it('offers both Sonnet 4.6 efforts to every tier', () => {
    const sonnetTiers = [
      ...SEED.matchAll(
        /alias:\s*'anthropic\/claude-sonnet-4-6\/(?:low|high)'[\s\S]*?tiers:\s*\[([^\]]+)\]/g,
      ),
    ].map((match) => match[1]);
    expect(sonnetTiers).toEqual([
      "'FREE', 'PRO', 'ELITE'",
      "'FREE', 'PRO', 'ELITE'",
    ]);
  });

  it('shows Sonnet with the same kebab-case model name as other models', () => {
    const sonnetRows = [
      ...SEED.matchAll(
        /alias:\s*'anthropic\/claude-sonnet-4-6\/(?:low|high)'([\s\S]*?)\r?\n  \},/g,
      ),
    ];
    expect(sonnetRows).toHaveLength(2);
    for (const [, body] of sonnetRows) {
      expect(body).toMatch(/modelLabel:\s*'claude-sonnet-4-6'/);
    }
  });

  it('does not keep vendor API-key routes on the proxy', () => {
    expect(CONFIG).not.toMatch(
      /api_key:\s*os\.environ\/(ANTHROPIC_API_KEY|OPENAI_API_KEY)/,
    );
    expect(configAliases.join('\n')).not.toMatch(/gpt-5\.1-codex/);
    expect(seededAliases.join('\n')).not.toMatch(/gpt-5\.1-codex/);
  });

  it('seeds only aliases the proxy actually serves', () => {
    expect(seededAliases.length).toBeGreaterThan(0);
    for (const alias of seededAliases) {
      expect(configAliases).toContain(alias);
    }
  });

  it('does not offer Bedrock Llama — it cannot write a résumé through a harness', () => {
    // Llama 3.1 8B never emits a tool call. Llama 4 Maverick/Scout and Llama
    // 3.3 70B do emit calls, but they dump empty writes (or JSON-as-text)
    // instead of a filled resume.tex. Either way the session is unusable.
    expect(seededAliases.join('\n')).not.toMatch(/llama/i);
    expect(configAliases.join('\n')).not.toMatch(/llama/i);
  });

  it('only lists Bedrock models the LiteLLM IAM path can tool-call', () => {
    // Haiku and Sonnet 4.6 are the verified Claude routes.
    expect(CONFIG).toContain('us.amazon.nova-micro-v1:0');
    expect(CONFIG).toContain('us.amazon.nova-lite-v1:0');
    expect(CONFIG).toContain('us.amazon.nova-pro-v1:0');
    expect(CONFIG).toContain('us.amazon.nova-2-lite-v1:0');
    expect(CONFIG).toContain('qwen.qwen3-coder-next');
    expect(CONFIG).toContain('us.anthropic.claude-haiku-4-5-20251001-v1:0');
    expect(CONFIG).toContain('us.anthropic.claude-sonnet-4-6');
    expect(CONFIG).not.toContain('us.anthropic.claude-sonnet-4-5');
    expect(CONFIG).not.toContain('us.anthropic.claude-opus-');
    expect(CONFIG).not.toMatch(/nova-premier/);
    for (const alias of [
      'bedrock/nova-micro/low',
      'bedrock/nova-lite/low',
      'bedrock/nova-pro/low',
      'bedrock/nova-2-lite/low',
    ]) {
      expect(configAliases).toContain(alias);
      expect(seededAliases).toContain(alias);
    }
    // Qwen also passes the production-path scripted multi-turn check. It must
    // remain both proxied and selectable; removing either half breaks the
    // verified no-vendor-key fallback.
    expect(configAliases).toContain('bedrock/qwen3-coder-next/low');
    expect(seededAliases).toContain('bedrock/qwen3-coder-next/low');
  });

  it('deactivates catalogue rows that were removed from the seed', () => {
    // Upsert-only seeding would leave a retired unusable model in the picker.
    expect(SEED).toMatch(/\$nin/);
    expect(SEED).toMatch(/isActive:\s*false/);
  });
});
