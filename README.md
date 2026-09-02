# Jobocate

A **two-sided AI job platform**.

- **Candidates** get eligibility-aware job matches, tailored applications they approve, an application tracker, interview prep, and controlled auto-apply.
- **Employers** post structured roles and get candidates ranked on job-related criteria, with the reasoning shown.

The principle everything is built to: **the candidate is in control and the reasoning is shown.** Nothing is auto-submitted without approval, and no qualification is ever invented.

---

## Stack

| Layer | Tech | Port | Path |
|---|---|---|---|
| API | NestJS 10 + Mongoose | 8000 | `backend/` |
| Web | Next.js (pages router), React, `--jb-*` tokens | 3000 | `frontend/` |
| DB | MongoDB (Docker) | 27017 | `docker-compose.yml` |
| LLM proxy | self-hosted LiteLLM | 4000 | `infra/agent-platform/` |
| Agent platform | LiteLLM Agent Platform (resume harness sandboxes) | 4100 | `infra/agent-platform/` |
| Shared types | `@jobocate/contracts` (Zod + TS) | — | `packages/contracts/` |

API routes are prefixed **`/api`** — except `/health` and `/health/readiness`, which are not. Swagger: `http://localhost:8000/api/docs`.

---

## Quick start

**Prereqs:** Node 18+, Docker Desktop, and a Supabase project (see [Auth](#auth)).

> **`npm install` in `backend/` and `frontend/` needs `--legacy-peer-deps`.** The dep tree has known peer conflicts; this is expected, not a broken lockfile.

### Everything in Docker

```bash
docker compose up --build     # mongo + backend + frontend
docker compose down
```

### Local dev (the usual loop)

```bash
docker compose up -d mongodb                    # Mongo only

cp .env.example .env.local                      # ONE env file, repo root — fill it in

cd backend
npm install --legacy-peer-deps
npm run start:dev                               # http://localhost:8000/health

cd ../frontend
npm install --legacy-peer-deps
npm run dev                                     # http://localhost:3000
```

Seed data: `npm run db:seed` in `backend/`.

---

## Environment

There is **one env file for the whole repo**: `.env.local` at the root, copied from the committed **`.env.example`**. The backend, the frontend, both compose stacks, the Playwright suite and the CLI scripts all read it. Fill that template rather than copying variable lists out of this file, and do not create per-app env files — the duplication they caused is why they were removed.

Precedence is `real process env` > `.env.local` > `.env`, so CI and compose can override any line without editing it. Only `NEXT_PUBLIC_*` names are inlined into the browser bundle; everything else stays server-side.

The minimum to boot:

| Var | Where | Purpose |
|---|---|---|
| `MONGODB_URI` | backend | Mongo connection string |
| `SUPABASE_URL` / `SUPABASE_JWKS_URL` | backend | Verifies incoming Supabase access tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | **Backend only.** Bypasses all authorisation — must never carry a `NEXT_PUBLIC_` prefix |
| `FRONTEND_URL` | backend | CORS origin (`CORS_EXTRA_ORIGINS` for additional ones, e.g. `:3001`) |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000` |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | frontend | Public by design, safe in the browser |

Optional but worth knowing: `LLM_<FEATURE>_{PROVIDER,MODEL}` tunes each AI feature; `GREENHOUSE_BOARDS` / `LEVER_BOARDS` drive the ingestion cron; `LITELLM_BASE_URL` and `AGENT_PLATFORM_URL` back the resume harness.

There is **no `JWT_SECRET`** any more — Supabase issues and signs tokens; the backend only verifies them against the project JWKS.

---

## Auth

**Supabase Auth owns identity.** Google, LinkedIn (OIDC) and email+password all issue Supabase sessions; the backend verifies them in `backend/src/auth/supabase-token.service.ts`. The old hand-rolled `/api/auth/*/callback` endpoints were deleted — do not register redirect URIs against them.

Provider credentials live in the **Supabase dashboard**, not in our `.env`. Setup is per project (`jobocate-dev`, `jobocate-prod`); the parts that reliably trip people up:

- **Two redirect legs, easily confused.** Provider → Supabase is `https://<project-ref>.supabase.co/auth/v1/callback`, registered in Google Cloud Console / the LinkedIn portal. Supabase → app is `http://localhost:3000/auth/success`, registered in Supabase. A `redirect_uri does not match` error is always the *first* leg. LinkedIn compares the string exactly, so a trailing slash is a different URL.
- **Google's consent screen has a publishing status.** While it is `Testing`, only listed test users can sign in; everyone else gets `access_denied`. Publish the app, or add the accounts — the scopes used (`openid`, email, profile) need no Google review. *Authorized JavaScript origins* is not needed; Supabase exchanges the code server-side.
- **Redirect URL allow-list.** Every origin (local, staging, prod) must be listed in Supabase or the callback is rejected. This is the most common setup failure.
- **Leave "Confirm email" OFF.** Supabase's built-in sender is test-grade and often delivers nothing, dead-ending signup on a "check your inbox" screen. Turning it on needs custom SMTP first and changes product behaviour — its own ticket, not a side effect.
- **Access token TTL: 30 minutes.** `signOut` revokes the refresh token, but a live access token stays valid until it expires; the short TTL bounds that window.

---

## Repo layout

```
backend/            NestJS API — 49 modules (module map is in the Developer Guide)
frontend/           Next.js app — marketing, candidate app, employer app
packages/contracts/ @jobocate/contracts — shared Zod schemas + TS types
e2e/                Playwright suite driving the real stack
extension/          MV3 autofill extension (fills, never submits)
infra/              Self-hosted LiteLLM + agent platform for the resume harness
design/             Claude Design prompt pack
docs/               Developer guide, security, product roadmaps
mobile/             React Native client (out of scope for backend/frontend work)
catalyst-ui-kit/    Vendored UI kit
```

### Shared packages

`packages/contracts` is consumed by the backend as `@jobocate/contracts`. If Nest fails to compile on a missing export from it, **build the package first** (`npm run build` in `packages/contracts`) — the backend imports the built output, not the source.

---

## Testing

```bash
cd backend
npm test                                  # Jest unit suite, collaborators mocked
npm run test:e2e                          # real AppModule + real Mongo
npm run typecheck                         # tsc --noEmit

cd ../e2e
npm test                                  # Playwright, full stack
```

- `test:e2e` uses its own **`jobocate_e2e`** database and refuses any URI that does not name one. Never point it at the dev DB. Details: [`backend/test/README.md`](backend/test/README.md).
- The **frontend has no unit-test script.** `npm run build` is its smoke test; user-visible flows are covered by the Playwright specs in [`e2e/`](e2e/README.md).

---

## Documentation

| Doc | What it is |
|---|---|
| [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) | **Start here.** Architecture, full backend/frontend module maps, env reference, gotchas, how to extend common things |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security model, hardening audit, release checklist |
| [`docs/QA_SMOKE_TEST.md`](docs/QA_SMOKE_TEST.md) | Last full functional smoke-test report |
| [`docs/product/production-roadmap.md`](docs/product/production-roadmap.md) | Authoritative "what's missing to ship" map |
| [`docs/product/alpha-go-live.md`](docs/product/alpha-go-live.md) | Operator runbook for the paid alpha |
| [`docs/product/parity-gaps-spec.md`](docs/product/parity-gaps-spec.md) | Competitive gaps: extension autofill, referrals |
| [`docs/product/mobile-app-plan.md`](docs/product/mobile-app-plan.md) | Mobile client plan (Expo/RN) |
| [`docs/content/voice-and-content-guide.md`](docs/content/voice-and-content-guide.md) | Source of truth for marketing and product copy |
| [`CLAUDE.md`](CLAUDE.md) | Working rules for agents in this repo |
| [`backend/LOGGING.md`](backend/LOGGING.md) | Winston setup, levels, rotation |
| [`backend/test/README.md`](backend/test/README.md) | How the backend e2e suite boots, and why |
| [`e2e/README.md`](e2e/README.md) | Browser suite — why it exists, how to run it |
| [`extension/README.md`](extension/README.md) | Autofill extension MVP |
| [`infra/agent-platform/README.md`](infra/agent-platform/README.md) | LiteLLM + sandbox services behind résumé generation |
| [`frontend/scripts/README.md`](frontend/scripts/README.md) | Résumé template preview generation |
| [`design/CLAUDE_DESIGN_PROMPTS.md`](design/CLAUDE_DESIGN_PROMPTS.md) | Ordered prompt pack for designing screens |

---

## Troubleshooting

- **`npm install` fails on peer deps** — you forgot `--legacy-peer-deps`.
- **Backend can't reach Mongo** — some machines run it on **27018** because 27017 was taken. Match `MONGODB_URI` to the port `docker ps` actually shows.
- **Port already in use** — change the mapping in `docker-compose.yml`. The frontend will also bind **3001** if 3000 is busy; add that origin to `CORS_EXTRA_ORIGINS` when it does.
- **AI features return canned or generic text** — the LLM key is missing or rate-limited. Every AI feature degrades to a deterministic fallback rather than erroring, so this fails quietly.
- **App screens show plausible-looking sample data** — the frontend falls back to samples when the API or auth is unavailable. Confirm the backend is up before debugging the screen.
- **`OverwriteModelError` at boot** — something re-registered the `EmployerApplicant` schema. `ai-recruiter` deliberately reuses the one from `employer-pipeline`.
- **A query silently matches nothing** — the `ownerId` representation gotcha; see Developer Guide §7.

## License

Private and proprietary.
