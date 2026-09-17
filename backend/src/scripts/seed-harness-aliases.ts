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
  // LiteLLM talks to Bedrock with IAM. Verified Claude aliases stay
  // `anthropic/…` so Claude Code is the harness.
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
    alias: 'bedrock/nova-2-lite/low',
    provider: 'bedrock',
    model: 'nova-2-lite',
    effort: 'low',
    label: 'Nova 2 Lite · cheap',
    maxOutputTokens: 8192,
    maxInputTokens: 128000,
    tiers: ['FREE', 'PRO', 'ELITE'],
    defaultForTiers: [],
    rank: 82,
  },
  // Qwen3 Coder Next uses the same Bedrock IAM route and needs no vendor key.
  // It passed the production OpenCode adapter's three-pass scripted check on
  // 2026-09-09 after session continuity and factual grounding were fixed.
  {
    alias: 'bedrock/qwen3-coder-next/low',
    provider: 'bedrock',
    model: 'qwen3-coder-next',
    effort: 'low',
    label: 'Qwen3 Coder Next · capable',
    maxOutputTokens: 8192,
    maxInputTokens: 128000,
    tiers: ['FREE', 'PRO', 'ELITE'],
    defaultForTiers: [],
    rank: 35,
  },
  // Meta Llama is not seeded. 3.1 8B never tool-calls; 4 Maverick/Scout and
  // 3.3 70B emit writes with empty content (or dump JSON as text), so a
  // session on them cannot produce a résumé. Re-seeding deactivates any
  // leftover rows below.

  // --- Anthropic (Claude Code harness; LiteLLM → Bedrock IAM) ---
  {
    alias: 'anthropic/claude-haiku-4-5/low',
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    effort: 'low',
    label: 'Haiku 4.5 · fast',
    tiers: ['FREE', 'PRO', 'ELITE'],
    defaultForTiers: ['FREE', 'PRO', 'ELITE'],
    rank: 40,
  },
  {
    alias: 'anthropic/claude-sonnet-4-6/low',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    effort: 'low',
    label: 'Sonnet 4.6 · fast',
    modelLabel: 'claude-sonnet-4-6',
    tiers: ['FREE', 'PRO', 'ELITE'],
    defaultForTiers: [],
    rank: 19,
  },
  {
    alias: 'anthropic/claude-sonnet-4-6/high',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    effort: 'high',
    label: 'Sonnet 4.6 · thorough',
    modelLabel: 'claude-sonnet-4-6',
    tiers: ['FREE', 'PRO', 'ELITE'],
    defaultForTiers: [],
    rank: 18,
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

  // A retired alias (no tools, or a 400 on the harness path) must disappear
  // from the picker. Upserting the live set leaves the old row selectable.
  const keep = ALIASES.map((d) => d.alias);
  const retired = await AliasModel.updateMany(
    { alias: { $nin: keep } },
    { $set: { isActive: false } },
  );
  if (retired.modifiedCount) {
    console.log(
      `Deactivated ${retired.modifiedCount} alias(es) no longer in the catalogue.`,
    );
  }

  console.log(`\nSeeded ${ALIASES.length} aliases.`);
  await connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
