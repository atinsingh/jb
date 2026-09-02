/**
 * Seeds the model+effort alias catalogue for resume harness sessions.
 *
 * This is configuration, not code: every alias here must also exist in
 * `infra/litellm/config.yaml` (which defines what it costs and what effort it
 * runs at), and this collection defines which tiers may select it. Changing the
 * tier mapping afterwards is an update to these documents — no redeploy, which
 * is the acceptance criterion the ticket is checking.
 *
 * Run: `npm run harness:seed-aliases` (idempotent).
 */
// The repo-wide env file at the root is the only source of vars.
import '../load-env';
import { connect, connection, model } from 'mongoose';
import {
  HarnessModelAlias,
  HarnessModelAliasSchema,
} from '../resume-harness/schemas/harness-model-alias.schema';

const ALIASES = [
  // --- Amazon Bedrock ---
  // Only seed aliases the proxy actually serves: a row here that has no
  // matching `model_name` in infra/litellm/config.yaml offers the candidate a
  // model that 404s at request time. Confirm with `npm run harness:bedrock-check`.
  {
    alias: 'bedrock/claude-haiku-4-5/low',
    provider: 'bedrock',
    model: 'claude-haiku-4-5',
    effort: 'low',
    label: 'Haiku 4.5 · fast (Bedrock)',
    tiers: ['FREE', 'PRO', 'ELITE'],
    // The FREE default. Ranked ahead of the Console alias below so there is
    // exactly one winner for the tier, not a rank tie-break nobody reads.
    defaultForTiers: ['FREE'],
    rank: 15,
  },
  // Amazon Nova — cheapest models on the proxy.
  //
  // Deliberately NOT a default for any tier. Nova is the right tool for
  // verifying auth, alias resolution and harness tagging without spending
  // Claude money, and the wrong tool for actually writing a resume: it does not
  // sustain an agentic edit-compile-fix loop well enough to land compiling
  // LaTeX. Listed so the model picker can offer it, defaulted nowhere.
  {
    alias: 'bedrock/nova-micro/low',
    provider: 'bedrock',
    model: 'nova-micro',
    effort: 'low',
    label: 'Nova Micro · cheapest (verification)',
    // Nova rejects a larger request outright ("maxTokens must be between 1 and
    // 10240") rather than truncating, so every harness is told the ceiling.
    maxOutputTokens: 8192,
    maxInputTokens: 128000,
    tiers: ['FREE', 'PRO', 'ELITE'],
    defaultForTiers: [],
    rank: 90,
  },
  {
    alias: 'bedrock/nova-lite/low',
    provider: 'bedrock',
    model: 'nova-lite',
    effort: 'low',
    label: 'Nova Lite · cheap',
    maxOutputTokens: 8192,
    maxInputTokens: 128000,
    tiers: ['FREE', 'PRO', 'ELITE'],
    defaultForTiers: [],
    rank: 85,
  },
  {
    alias: 'bedrock/nova-pro/low',
    provider: 'bedrock',
    model: 'nova-pro',
    effort: 'low',
    label: 'Nova Pro · low cost',
    maxOutputTokens: 8192,
    maxInputTokens: 128000,
    tiers: ['PRO', 'ELITE'],
    defaultForTiers: [],
    rank: 80,
  },
  {
    alias: 'bedrock/claude-sonnet-5/high',
    provider: 'bedrock',
    model: 'claude-sonnet-5',
    effort: 'high',
    label: 'Sonnet 5 · thorough (Bedrock)',
    tiers: ['PRO', 'ELITE'],
    defaultForTiers: ['PRO'],
    rank: 18,
  },
  {
    alias: 'bedrock/claude-opus-5/xhigh',
    provider: 'bedrock',
    model: 'claude-opus-5',
    effort: 'xhigh',
    label: 'Opus 5 · maximum (Bedrock)',
    tiers: ['ELITE'],
    defaultForTiers: ['ELITE'],
    rank: 8,
  },

  // --- Anthropic Console ---
  {
    alias: 'anthropic/claude-haiku-4-5/low',
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    effort: 'low',
    label: 'Haiku 4.5 · fast',
    tiers: ['FREE', 'PRO', 'ELITE'],
    // Selectable on FREE, but the Bedrock alias above is the tier default.
    rank: 40,
  },
  {
    alias: 'anthropic/claude-sonnet-4-5/low',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    effort: 'low',
    label: 'Sonnet 4.5 · fast',
    tiers: ['PRO', 'ELITE'],
    rank: 30,
  },
  {
    alias: 'anthropic/claude-sonnet-4-5/high',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    effort: 'high',
    label: 'Sonnet 4.5 · thorough',
    tiers: ['PRO', 'ELITE'],
    // Selectable, but Bedrock owns the tier default — that is the key we have.
    rank: 20,
  },
  {
    alias: 'openai/gpt-5.1-codex/high',
    provider: 'openai',
    model: 'gpt-5.1-codex',
    effort: 'high',
    label: 'GPT-5.1 Codex · thorough',
    tiers: ['PRO', 'ELITE'],
    rank: 20,
  },
  {
    alias: 'anthropic/claude-opus-4-5/high',
    provider: 'anthropic',
    model: 'claude-opus-4-5',
    effort: 'high',
    label: 'Opus 4.5 · thorough',
    tiers: ['ELITE'],
    rank: 10,
  },
  {
    alias: 'anthropic/claude-opus-4-5/max',
    provider: 'anthropic',
    model: 'claude-opus-4-5',
    effort: 'max',
    label: 'Opus 4.5 · maximum',
    tiers: ['ELITE'],
    // Selectable, but Bedrock owns the tier default — that is the key we have.
    rank: 5,
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await connect(uri);
  const AliasModel = model(HarnessModelAlias.name, HarnessModelAliasSchema);

  for (const doc of ALIASES) {
    await AliasModel.updateOne(
      { alias: doc.alias },
      { $set: { ...doc, isActive: true } },
      { upsert: true },
    );
    console.log(`✓ ${doc.alias}  →  ${doc.tiers.join(', ')}`);
  }

  console.log(`\nSeeded ${ALIASES.length} aliases.`);
  await connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
