# Harness models (LiteLLM)

This file is the memory for what we already proved on **this** account, through **LiteLLM** (`localhost:4000`), not the Bedrock console listing.

The bar is the résumé harness path: streaming chat + a tool call that includes an `id` the OpenCode/Codex/Claude Code SDKs will accept. `harness:bedrock-check` only proves a credential can spend. That is not enough.

Region probed: `us-east-1`. Latest probe: 2026-09-09.

## Current status

| Category | Models | Meaning |
|---|---|---|
| Usable now | Qwen3 Coder Next | Available through LiteLLM with existing Bedrock IAM credentials and no Qwen key. Passed streaming tools plus the production OpenCode adapter's three-pass edit/compile/grounding probe. |
| Usable for smoke checks | Nova Micro, Nova Lite, Nova Pro, Nova 2 Lite | Available through LiteLLM with the existing Bedrock IAM credential. Use for transport and browser smoke verification only; they are not approved résumé writers. |
| Not usable without additional steps | DeepSeek V3.2; MiniMax M2.5; Kimi K2.5; Devstral 2; Anthropic Console Claude; Bedrock Claude 4.5/4.6 | See the exact missing quality, configuration, credential, or account step below. Do not use these for ticket sign-off until that step passes. |
| Not usable | Bedrock Llama; DeepSeek R1; Nova Premier; legacy Bedrock Claude; unavailable Sonnet/Opus 5 routes | The model or account route cannot satisfy the harness protocol. Do not add them to the proxy or picker. |

Qwen is the current no-vendor-key résumé model. Tickets that explicitly require
an Anthropic model still need the Console key or Bedrock account enablement.

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

### Anthropic Console — served, not 404ing

`ANTHROPIC_API_KEY`. These are the real résumé models today.

- `anthropic/claude-haiku-4-5/low` (FREE default)
- `anthropic/claude-sonnet-4-5/low`
- `anthropic/claude-sonnet-4-5/high` (PRO default)
- `anthropic/claude-opus-4-5/high`
- `anthropic/claude-opus-4-5/max` (ELITE default)

### OpenAI Platform — in `config.yaml`

- `openai/gpt-5.1-codex/low` (config only; not in the picker until seeded)
- `openai/gpt-5.1-codex/high` (seeded)
- `openai/gpt-5.1-codex-max/high` (config only; not in the picker until seeded)

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

Do not put any of the above in `config.yaml` or the seed. Leftover Mongo rows are hidden by `isOfferedHarnessAlias` (`llama`, any `bedrock/` + `claude`).

---

## Blocked until you do something (not “never”)

LiteLLM uses **IAM**. A Bedrock **API key** (`AWS_BEARER_TOKEN_BEDROCK`) can Converse+tools on some Claude profiles that IAM cannot.

| Id (bearer Converse + forced `write_file` succeeded) | LiteLLM IAM stream+tools |
|---|---|
| `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | **404** use-case form |
| `us.anthropic.claude-sonnet-4-6` | **404** use-case form |
| `us.anthropic.claude-opus-4-5-20251101-v1:0` | **404** use-case form |
| `us.anthropic.claude-opus-4-6-v1` | **404** use-case form |
| `us.anthropic.claude-haiku-4-5-20251001-v1:0` (and `global.` twin) | **404** use-case form even on the API key |

### How to enable Bedrock Claude later

1. In AWS Bedrock, submit **Anthropic use case details** for the **IAM user/role LiteLLM uses** (not only the API key).
2. Recreate the proxy: `docker compose up -d --force-recreate litellm`
3. Hit LiteLLM (not raw Bedrock):

   `POST /v1/chat/completions` with `stream: true`, a `write_file` tool, `tool_choice` forced. Need **HTTP 200** and a tool-call **`id` string**.

4. Only then add `model_name` in `config.yaml`, a matching row in `backend/src/scripts/seed-harness-aliases.ts`, and `npm run harness:seed-aliases`.
5. Do **not** switch Claude-on-Bedrock to `AWS_BEARER_TOKEN_BEDROCK` on this LiteLLM build: Converse crashes (`credentials` is `None`); `bedrock/invoke/` streams tool deltas **without** `id`, which OpenCode rejects.

If a future LiteLLM Converse handler accepts bearer auth and still emits tool ids, the IAM pair can go away. Until a **proxy** call is 200, do not list the alias.

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
