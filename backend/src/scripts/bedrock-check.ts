/**
 * Verifies an Amazon Bedrock API key and prints what it can actually call.
 *
 * Run this immediately after setting `AWS_BEARER_TOKEN_BEDROCK`, before
 * touching the proxy. The model ids in `infra/litellm/config.yaml` are a
 * starting guess: entitlement is per-account, per-region and per-model, and
 * most accounts are entitled to cross-region *inference profiles*
 * (`us.anthropic.…`) rather than the bare `anthropic.…` ids. Reconciling that
 * list against this output is the difference between a working proxy and a
 * stack of `AccessDeniedException`s surfacing as opaque 500s three layers up.
 *
 * Run: `npm run harness:bedrock-check`
 */
// The repo-wide env file at the root is the only source of vars.
import '../load-env';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TOKEN = process.env.AWS_BEARER_TOKEN_BEDROCK;

const CONTROL_PLANE = `https://bedrock.${REGION}.amazonaws.com`;
const RUNTIME = `https://bedrock-runtime.${REGION}.amazonaws.com`;

async function call<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(
      `${res.status} ${res.statusText} — ${(await res.text()).slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

async function main() {
  if (!TOKEN) {
    console.error(
      'AWS_BEARER_TOKEN_BEDROCK is not set.\n' +
        'Add it to .env.local at the repo root (copy .env.example if you have\n' +
        'not made one yet), then re-run.',
    );
    process.exit(1);
  }

  console.log(`Region: ${REGION}`);
  console.log(`Key:    ${TOKEN.slice(0, 8)}…${TOKEN.slice(-4)} (${TOKEN.length} chars)\n`);

  // --- 1. Foundation models the account can see -----------------------------
  // Anthropic (what the resume actually runs on) and Amazon Nova (the cheap end,
  // used to prove the pipe without spending Claude money).
  const WANTED = /^(Anthropic|Amazon)$/i;
  let anthropicModels: string[] = [];
  try {
    const body = await call<{ modelSummaries?: any[] }>(
      `${CONTROL_PLANE}/foundation-models`,
    );
    anthropicModels = (body.modelSummaries || [])
      .filter((m) => WANTED.test(m.providerName || ''))
      .filter((m) => /anthropic\.|amazon\.nova/i.test(m.modelId || ''))
      .map((m) => m.modelId);
    console.log(
      `✓ Key authenticates. ${anthropicModels.length} Anthropic/Nova foundation models visible.`,
    );
  } catch (err: any) {
    console.error(`✗ Could not list foundation models: ${err.message}`);
    console.error(
      '\nIf this is a 403, the key is valid but lacks bedrock:ListFoundationModels,\n' +
        'or the region is wrong. A 401/404 usually means the key or region is bad.',
    );
    process.exit(1);
  }

  // --- 2. Inference profiles (what you usually actually invoke) -------------
  let profiles: string[] = [];
  try {
    const body = await call<{ inferenceProfileSummaries?: any[] }>(
      `${CONTROL_PLANE}/inference-profiles?maxResults=200`,
    );
    profiles = (body.inferenceProfileSummaries || [])
      .map((p) => p.inferenceProfileId)
      .filter((id: string) => /anthropic|amazon\.nova/i.test(id));
    console.log(`✓ ${profiles.length} Anthropic/Nova inference profiles available.\n`);
  } catch (err: any) {
    console.log(`(inference profiles unavailable: ${err.message})\n`);
  }

  console.log('--- Use these in infra/litellm/config.yaml, prefixed `bedrock/` ---');
  const usable = profiles.length ? profiles : anthropicModels;
  usable.sort().forEach((id) => console.log(`  bedrock/${id}`));

  if (!usable.length) {
    console.log(
      '  (none)\n\nNo Anthropic models are enabled for this account in this region.\n' +
        'Enable model access in the Bedrock console, or try another region.',
    );
    process.exit(1);
  }

  // --- 3. A real, billed invocation ----------------------------------------
  // Listing proves entitlement to the control plane; only an invocation proves
  // the key can actually spend. That is exactly the distinction the OpenCode
  // Zen key failed on — it listed models happily and then refused every
  // completion for want of a payment method.
  //
  // Cheapest-first: Nova Micro costs a small fraction of Haiku and this probe
  // is about the credential, not the prose. Falls back up the ladder only if
  // the account has no Nova.
  const CHEAPEST_FIRST = [/nova-micro/i, /nova-lite/i, /haiku/i];
  const target =
    CHEAPEST_FIRST.map((re) => usable.find((id) => re.test(id))).find(Boolean) ||
    usable[0];

  console.log(`\n--- Invoking ${target} (cheapest available) to confirm the key can spend ---`);
  try {
    // Converse is the one request shape that works across Nova and Claude
    // alike; InvokeModel would need a different body per model family.
    const res = await fetch(
      `${RUNTIME}/model/${encodeURIComponent(target!)}/converse`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: [{ text: 'Reply with exactly: BEDROCK_OK' }] },
          ],
          inferenceConfig: { maxTokens: 16, temperature: 0 },
        }),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      console.error(`✗ Invoke failed: ${res.status} — ${text.slice(0, 400)}`);
      if (res.status === 403) {
        // Two very different causes share this status, and the fix for one is
        // useless for the other — so read the body rather than guess.
        if (/being verified|verification normally takes/i.test(text)) {
          console.error(
            '\nThe key is valid and the account simply is not activated for billing\n' +
              'yet — AWS says verification usually completes within ~2 hours. Nothing\n' +
              'to fix here; re-run this command later.',
          );
        } else {
          console.error(
            '\nA 403 here with a successful listing above means model access is not\n' +
              'enabled for this model in this region. Enable it in the Bedrock console\n' +
              '(Model access), then re-run.',
          );
        }
      }
      process.exit(1);
    }
    const parsed = JSON.parse(text);
    const reply = (parsed.output?.message?.content || [])
      .map((b: any) => b.text)
      .join('')
      .trim();
    console.log(`✓ Model replied: "${reply}"`);
    console.log(`  usage: ${JSON.stringify(parsed.usage || {})}`);
    console.log(
      '\nBedrock is ready.\n' +
        'Next:  docker compose up -d litellm\n' +
        '       cd backend && npm run harness:seed-aliases\n' +
        '\nNote: Nova Micro proves the credential and the pipe. Leave the tier\n' +
        'defaults on Claude for real resume generation — Nova will not hold an\n' +
        'agentic loop together well enough to emit compiling LaTeX.',
    );
  } catch (err: any) {
    console.error(`✗ Invoke failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
