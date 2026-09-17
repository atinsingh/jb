# Harness models (LiteLLM)

This file is the memory for what we already proved on **this** account, through **LiteLLM** (`localhost:4000`), not the Bedrock console listing.

The bar is the résumé harness path: streaming chat + a tool call that includes an `id` the OpenCode/Codex/Claude Code SDKs will accept. `harness:bedrock-check` only proves a credential can spend. That is not enough.

Region probed: `us-east-1`. Latest Claude probe: 2026-09-16.

## Current status

| Category | Models | Meaning |
|---|---|---|
| Usable now | Qwen3 Coder Next | Available through LiteLLM with existing Bedrock IAM credentials and no Qwen key. Passed streaming tools plus the production OpenCode adapter's three-pass edit/compile/grounding probe. |
| Offered; file write verified | Claude Haiku 4.5, Sonnet 4.6 | Claude Code sandbox turns wrote requested files through LiteLLM with Bedrock IAM on 2026-09-16. Sonnet low and high both passed. Full résumé and PDF quality are not yet verified. |
| Usable for smoke checks | Nova Micro, Nova Lite, Nova Pro, Nova 2 Lite | Available through LiteLLM with the existing Bedrock IAM credential. Use for transport and browser smoke verification only; they are not approved résumé writers. |
| Not usable without additional steps | DeepSeek V3.2; MiniMax M2.5; Kimi K2.5; Devstral 2; Bedrock Sonnet 4.5 and Opus 4.5/4.6 | See the exact missing quality, configuration, credential, or account step below. Do not use these for ticket sign-off until that step passes. |
| Not usable | Bedrock Llama; DeepSeek R1; Nova Premier; legacy Bedrock Claude; unavailable Sonnet/Opus 5 routes | The model or account route cannot satisfy the harness protocol. Do not add them to the proxy or picker. |

Qwen is the current no-vendor-key résumé model with a three-pass quality probe.
Haiku and Sonnet 4.6 are the Claude aliases offered through Bedrock IAM. GPT-5.6 Luna remains
on the proxy but needs account enablement before it can be offered.

---

## On the proxy now (do not drop these)

These aliases are in `config.yaml` and are what a session can actually call.

### Bedrock — verified HTTP 200 on LiteLLM streaming + tools

IAM credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`). Forced `write_file` tool.

| Alias | Bedrock id |
|---|---|
| `bedrock/nova-micro/low` | `us.amazon.nova-micro-v1:0` |
| `bedrock/nova-2-lite/low` | `us.amazon.nova-2-lite-v1:0` |
| `bedrock/qwen3-coder-next/low` | `qwen.qwen3-coder-next` |

Same IAM path, same Converse tool shape; listed and seeded, not re-streamed in that same batch:

| Alias | Bedrock id |
|---|---|
| `bedrock/nova-lite/low` | `us.amazon.nova-lite-v1:0` |
| `bedrock/nova-pro/low` | `us.amazon.nova-pro-v1:0` |

Nova holds a tool call. It is still a weak résumé writer (the seed says so).
Qwen3 Coder Next also passes the transport protocol and uses the existing IAM
credential, so no Qwen API key is required. It is seeded in the product picker.
The first browser run exposed harness defects rather than a useful model
comparison: OpenCode started a fresh conversation each turn, could not run the
build command, prior model output was treated as factual input, and sparse
profiles were pressured to add prose. After those defects were fixed, the
production-path script completed three grounded, compiling passes in 42 seconds.

## Usable protocol, product verification still required

These models returned HTTP 200 twice on 2026-09-09: raw Bedrock Converse with
a forced `write_file`, then LiteLLM streaming with a non-empty call and a valid
string id. They use the existing Bedrock IAM credential and need no vendor API
keys. They are not offered because a transport pass alone does not prove
candidate-document quality.

| Provider | Bedrock id | Additional steps before offering |
|---|---|---|
| DeepSeek | `deepseek.v3.2` | Add the LiteLLM alias and seed row, recreate LiteLLM, then run the multi-turn résumé and PDF-quality flow. |
| MiniMax | `minimax.minimax-m2.5` | Add the LiteLLM alias and seed row, recreate LiteLLM, then run the multi-turn résumé and PDF-quality flow. |
| Moonshot AI | `moonshotai.kimi-k2.5` | Add the LiteLLM alias and seed row, recreate LiteLLM, then run the multi-turn résumé and PDF-quality flow. |
| Mistral AI | `mistral.devstral-2-123b` | Add the LiteLLM alias and seed row, recreate LiteLLM, then run the multi-turn résumé and PDF-quality flow. |

### Anthropic Claude — Haiku 4.5 and Sonnet 4.6 on Bedrock IAM

Alias names stay `anthropic/…` so Claude Code is the harness. LiteLLM calls
Bedrock with the same IAM pair as Nova/Qwen. Do not put `ANTHROPIC_API_KEY`
on these rows.

- `anthropic/claude-haiku-4-5/low` → `us.anthropic.claude-haiku-4-5-20251001-v1:0` (FREE, PRO, and ELITE default)
- `anthropic/claude-sonnet-4-6/low` → `us.anthropic.claude-sonnet-4-6` (FREE, PRO, and ELITE)
- `anthropic/claude-sonnet-4-6/high` → `us.anthropic.claude-sonnet-4-6` (FREE, PRO, and ELITE)

### OpenAI Platform

There are no `openai/gpt-5.1-codex*` rows and no `OPENAI_API_KEY` on this proxy.

### Bedrock — OpenAI GPT-5.6 Luna (IAM, no OpenAI key)

Alias names stay `openai/gpt-5.6-luna/{effort}` so Codex is the harness. LiteLLM calls `bedrock/converse/us.openai.gpt-5.6-luna` with the same IAM pair as Nova/Qwen. A live IAM probe on 2026-09-16 returned Bedrock `openai.gpt-5.6-luna is not available for this account` (sales enablement). Routing is IAM; the account still has to enable the GPT-5.6 family in Bedrock. Do not put `OPENAI_API_KEY` on these rows.

| Alias | Bedrock id |
|---|---|
| `openai/gpt-5.6-luna/low` | `us.openai.gpt-5.6-luna` |
| `openai/gpt-5.6-luna/medium` | `us.openai.gpt-5.6-luna` |
| `openai/gpt-5.6-luna/high` | `us.openai.gpt-5.6-luna` |
| `openai/gpt-5.6-luna/xhigh` | `us.openai.gpt-5.6-luna` |
| `openai/gpt-5.6-luna/max` | `us.openai.gpt-5.6-luna` |

---

## Never offer again (do not re-add)

These fail in a way that is the **model or the Bedrock route**, not a missing seed.

| What | Why |
|---|---|
| **Meta Llama** (3.1 8B, 3.3 70B, Llama 4 Maverick/Scout, any `bedrock/…llama…`) | 3.1 8B never tool-calls. 3.3 / Llama 4 emit writes with **empty content** or dump JSON as text. `fake_stream` does not fix it. A session cannot produce a résumé. |
| **DeepSeek R1** (`us.deepseek.r1-v1:0`) | Bedrock Converse returns `400 This model doesn't support tool use`; it cannot drive an editing harness. DeepSeek V3.2 is the usable replacement. |
| **Nova Premier** `us.amazon.nova-premier-v1:0` | Provider-marked **legacy**; 404 if unused 30 days. |
| **Claude 3 Haiku / Sonnet** on Bedrock (`claude-3-haiku-20240307`, `claude-sonnet-4-20250514`, `opus-4-1-20250805`) | Same **legacy** 404. |
| **Bare `claude-sonnet-5` / `claude-opus-5`** (`bedrock/us.anthropic.claude-sonnet-5`, `…claude-opus-5`) | **403 not available** on this account (Sales / extra access). Different from Sonnet 4.5 / Opus 4.5 dated profiles. |

Do not put any of the above in `config.yaml` or the seed. Leftover Mongo rows are hidden by `isOfferedHarnessAlias` (`llama`).

---

## Blocked until you do something (not “never”)

LiteLLM uses **IAM**. A Bedrock **API key** (`AWS_BEARER_TOKEN_BEDROCK`) can Converse+tools on some Claude profiles that IAM cannot. Haiku and Sonnet 4.6 have passed Claude Code file-writing turns through this proxy. Other Claude models remain unoffered.

| Id (bearer Converse + forced `write_file` succeeded) | Last observed LiteLLM IAM status before access propagated |
|---|---|
| `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | **404** on 2026-09-09; recheck before offering |
| `us.anthropic.claude-opus-4-5-20251101-v1:0` | **404** on 2026-09-09; recheck before offering |
| `us.anthropic.claude-opus-4-6-v1` | **404** on 2026-09-09; recheck before offering |

### How to enable other Bedrock Claude models later

1. Confirm the target model's Anthropic use-case access for the **IAM user/role LiteLLM uses** (not only the API key).
2. Recreate the proxy: `docker compose up -d --force-recreate litellm`
3. Hit LiteLLM (not raw Bedrock):

   `POST /v1/chat/completions` with `stream: true`, a `write_file` tool, `tool_choice` forced. Need **HTTP 200** and a tool-call **`id` string**.

4. After a Claude Code file-writing turn and any required résumé and PDF-quality checks pass, add the proxy alias and seed row, then run `npm run harness:seed-aliases`.
5. Do **not** switch Claude-on-Bedrock to `AWS_BEARER_TOKEN_BEDROCK` on this LiteLLM build: Converse crashes (`credentials` is `None`); `bedrock/invoke/` streams tool deltas **without** `id`, which OpenCode rejects.

If a future LiteLLM Converse handler accepts bearer auth and still emits tool ids, the IAM pair can go away.

---

## Adding any other model

1. Entitlement: `cd backend && npm run harness:bedrock-check` (or the vendor’s own list).
2. Proxy: streaming + tools, 200, non-empty write / real `id`.
3. `config.yaml` + seed together. Seed `$nin` deactivates anything you remove.
4. Recreate `jobocate-litellm`. Reload `/app/resume`.

For the edit/compile/content check, use the fast production-path probe before a
browser run:

`cd backend && npm run harness:probe-opencode -- --alias <alias> --passes 3`

It saves each generated `.tex` and `.pdf` under `tmp/resume-harness-probe/`,
destroys its sandbox, and exits nonzero when the harness command, LaTeX build,
or deterministic document checks fail.
