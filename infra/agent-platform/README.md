# Resume harness infrastructure

Two services stand behind the resume-generation screen. Both are self-hosted and
neither is optional — without them the screen renders its degraded state and the
API returns 503 from `POST /api/resume-harness/sessions`.

| Service | What it is | Port |
|---|---|---|
| `litellm` | LiteLLM proxy. The only route between a harness and a model. | 4000 |
| `agent-platform` | [LiteLLM Agent Platform](https://github.com/BerriAI/litellm-agent-platform) (MIT). Provisions one sandbox per session. | 4100 |

## Bring it up

```bash
# Keys are metered platform keys. Anthropic Console + OpenAI Platform only —
# a Claude Pro/Max or ChatGPT Plus/Pro login must never be configured here.
export ANTHROPIC_API_KEY=sk-ant-api03-...
export OPENAI_API_KEY=sk-proj-...
export LITELLM_MASTER_KEY=sk-litellm-master-...

docker build -f infra/agent-platform/harness.Dockerfile \
  -t jobocate/resume-harness:latest infra/agent-platform

docker compose up -d litellm agent-platform
```

Backend `.env` then needs:

```
LITELLM_BASE_URL=http://localhost:4000
RESUME_HARNESS_LITELLM_KEY=sk-litellm-virtual-...   # a virtual key, not the master key
AGENT_PLATFORM_URL=http://localhost:4100
AGENT_PLATFORM_API_KEY=...
RESUME_SANDBOX_IMAGE=jobocate/resume-harness:latest
RESUME_SANDBOX_TTL_SECONDS=3600
```

Seed the alias catalogue once (`harness_model_aliases` is what maps tiers to the
aliases declared in `infra/litellm/config.yaml`):

```bash
cd backend && npm run harness:seed-aliases
```

## Sandbox lifecycle

- **Provisioned** by `SandboxService.provision`, named `resume-<sessionId>` and
  labelled with the session and harness. One session, one sandbox — the naming
  is what makes a second sandbox for the same session impossible to create
  silently and an orphan traceable back to its session.
- **Reaped** three ways, in order of preference: `DELETE /api/resume-harness/sessions/:id`
  on an explicit end; the platform's TTL (`RESUME_SANDBOX_TTL_SECONDS`) for a
  session the user abandons; and `docker compose restart agent-platform` for the
  case where the platform itself has lost track.
- **Observed** through the platform's own `/v1/sandboxes` listing and the
  `session` / `harness` labels, and through LiteLLM's spend log, where each
  request carries `harness=<id>` from the `x-litellm-tags` header.

## Why the harness cannot change mid-session

Swapping harness would mean re-binding a live sandbox and re-hydrating agent
state. The LaTeX artifact is already persisted on the session, so starting a new
session with `carryFromSessionId` reaches the same place for near-zero cost and
removes the failure class entirely. The API rejects a harness change with 409.
