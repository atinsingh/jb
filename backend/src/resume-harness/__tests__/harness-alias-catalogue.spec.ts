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
    // Bearer Converse can hit some Claude profiles; the proxy uses IAM, and
    // every Anthropic Bedrock id 404s with the use-case-form error. Offering
    // those aliases is the Llama failure mode again. Nova Micro/Lite/Pro/2
    // Lite return 200 with a tool-call id on that same path. Nova Premier is
    // legacy. Llama is refused separately.
    expect(CONFIG).toContain('us.amazon.nova-micro-v1:0');
    expect(CONFIG).toContain('us.amazon.nova-lite-v1:0');
    expect(CONFIG).toContain('us.amazon.nova-pro-v1:0');
    expect(CONFIG).toContain('us.amazon.nova-2-lite-v1:0');
    expect(CONFIG).toContain('qwen.qwen3-coder-next');
    expect(CONFIG).not.toMatch(/model:\s*bedrock\/[^\s]*anthropic\.claude/);
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
    expect(seededAliases.filter((a) => a.startsWith('bedrock/claude'))).toEqual(
      [],
    );
  });

  it('deactivates catalogue rows that were removed from the seed', () => {
    // Upsert-only seeding would leave a retired unusable model in the picker.
    expect(SEED).toMatch(/\$nin/);
    expect(SEED).toMatch(/isActive:\s*false/);
  });
});
