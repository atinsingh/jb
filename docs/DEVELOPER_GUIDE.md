# Jobocate — Developer Guide

The single source of truth for understanding, running, and fixing Jobocate. (Older
scattered docs — `GETTING_STARTED.md`, `PROJECT_STRUCTURE.md`, `API_DOCUMENTATION.md`,
etc. — predate this and may be stale; trust this file where they conflict.)

---

## 1. What it is

A **two-sided AI job platform**:
- **Candidates** get eligibility-aware job matches, tailored applications they approve, an application tracker, interview prep, and controlled auto-apply.
- **Employers** post structured roles and get candidates ranked on job-related criteria with the reasoning shown.

Design principle throughout: **the candidate is in control and the reasoning is shown** — nothing is auto-submitted without approval, and no qualifications are invented.

## 2. Stack & layout

| Layer | Tech | Port | Path |
|---|---|---|---|
| Backend | NestJS 10 + Mongoose (MongoDB) | 8000 | `backend/` |
| Frontend | Next.js (pages router), React, inline styles + `--jb-*` tokens | 3000 | `frontend/` |
| Shared types | `packages/contracts` (monorepo) | — | `packages/` |
| Browser extension | MV3 autofill (Greenhouse/Lever) | — | `extension/` |
| DB | MongoDB (Docker `jobocate-mongodb`) | 27017 | `docker-compose.yml` |

- Backend API is prefixed `/api` (except `/health`). Swagger at `/api/docs`.
- Frontend surfaces: **marketing** (`pages/*.js`), **candidate app** (`pages/app/*.jsx`, dark rail `AppSidebar`), **employer app** (`pages/employer/*.jsx`, `EmployerSidebar`).

## 3. Run it locally

**Prereqs:** Node 18+, Docker (for Mongo), and `--legacy-peer-deps` for all backend/frontend `npm install` (the dep tree has peer conflicts — this is expected).

```bash
# 1. Mongo
docker compose up -d mongodb            # or your own mongod on :27017

# 2. Backend
cd backend
npm install --legacy-peer-deps
cp .env.example .env                     # then fill in (see §4); MUST set JWT_SECRET + MONGODB_URI
npm run build && npm run start:prod      # or: npm run dev   (watch mode)
# health: curl http://localhost:8000/api/health

# 3. Frontend
cd ../frontend
npm install --legacy-peer-deps
npm run dev                              # http://localhost:3000
```

Build for release: `npm run build` in each (both currently exit 0). Type-check backend without emitting: `npm run typecheck`.

## 4. Environment variables

**Backend (`backend/.env`)** — required in bold:

| Var | Purpose |
|---|---|
| **`MONGODB_URI`** | Mongo connection string |
| **`JWT_SECRET`** | Signs auth tokens. **Mandatory in production — the app refuses to boot without it** (dev has an insecure fallback). |
| `JWT_EXPIRES_IN` | Token TTL (default `7d`) |
| `FRONTEND_URL` | CORS origin (default `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | Google OAuth |
| `LINKEDIN_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | LinkedIn OAuth |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY` (or `EMERGENT_LLM_KEY`) | LLM access |
| `LLM_<FEATURE>_{PROVIDER,MODEL,TEMP,MAX_TOKENS}` | Per-feature LLM tuning (match, cover-letter, interview, resume-parse, …). See `llm/` module. |
| `GREENHOUSE_BOARDS`, `LEVER_BOARDS` | Comma-separated board slugs the scrapers poll |
| `JOB_SCRAPING_ENABLED`, `AUTO_APPLICATION_ENABLED` | Feature flags for the cron jobs |

**Frontend (`frontend/.env.local`):** `NEXT_PUBLIC_API_URL=http://localhost:8000` (legacy `REACT_APP_BACKEND_URL` also read).

> If AI features return canned/fallback text, the LLM key is missing or rate-limited (OpenAI/Anthropic 429). Every AI feature degrades gracefully to a deterministic fallback rather than erroring.

**Tests.** `npm test` runs the unit suite (mocked collaborators). `npm run test:e2e` boots the real AppModule against a real MongoDB and drives the HTTP surface — auth, RBAC, the full employer→candidate→employer hiring journey, and the candidate core surface. It uses its own `jobocate_e2e` database and refuses any URI that doesn't name one. Details and two non-obvious config choices: `backend/test/README.md`.

**Reference fields must use `Schema.Types.ObjectId`.** In a `@Prop`, mongoose's `Types.ObjectId` (the BSON class) silently produces a **Mixed** path under `@nestjs/mongoose`, so nothing is cast and a string query stops matching an ObjectId-stored value. Always write `@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'X' })`. `npm run db:migrate-objectid` converts legacy string ids in an existing database (dry run by default, `-- --apply` to write).

**LLM providers.** `openai`, `anthropic`, `openrouter` and `mock`, selected per feature via `LLM_<FEATURE>_PROVIDER` (or globally with `LLM_DEFAULT_PROVIDER`). A feature whose configured provider has no key falls through to OpenRouter — one OpenAI-compatible endpoint in front of ~400 models — and only then to `mock`, so one `OPENROUTER_API_KEY` is enough to make every AI feature real. On the fallback path the model id comes from `OPENROUTER_MODEL`, since provider-native ids (`claude-opus-4-8`) are not OpenRouter slugs (`anthropic/claude-sonnet-4.5`). `:free` slugs cost nothing; anything else bills the account's credit balance.

## 5. Backend module map (48 modules under `backend/src/`)

**Core candidate flow**
- `auth` — JWT + Google/LinkedIn OAuth (guards are per-route via `@UseGuards(JwtAuthGuard)`).
- `users` — profile, preferences, `autofill-payload` (feeds the extension).
- `resume`, `resume-parser`, `resume-builder` — import/parse/build résumés (`resume-parser` has a heuristic fallback when the LLM is down).
- `job-profiles`, `jobs` — candidate profile + job records.
- `geography` — **Stage-1 eligibility** (country/visa/seniority gate; a CA candidate is excluded from US-only roles).
- `matching` (+ `matching/skill-taxonomy`, `match-scorer`) — **Stage-2 weighted, explainable scoring**. `EligibleJobsService` applies eligibility → preference filters → score; `GET /api/matching/eligible-jobs`, `/preview`.
- `applications`, `apply-runner`, `job-tracker` — apply + controlled auto-apply + pipeline tracking.
- `cover-letters`, `interview-buddy` — AI cover letters + interview prep/mock/scoring.
- `llm` — provider-agnostic LLM abstraction; all AI features route through it.
- `entitlement`, `billing` — plan gating + subscriptions.

**Job ingestion**
- `monitors` — Greenhouse + Lever scrapers (**work**; Indeed is dead — anti-bot). Hourly cron; needs `*_BOARDS` env.
- `ingestion` — normalization pipeline (adapters, dedup, expiration). Skill extraction backfills job skills for matching.

**Employer flow** (all `ownerId`-scoped, JWT-guarded, seed sensible defaults on first read)
- `employer-jobs`, `employer-pipeline` (canonical `EmployerApplicant`), `employer-interviews`, `employer-offers`, `employer-org`, `employer-billing`.
- `ai-recruiter` — autopilot/screen/copilot/sourcing/scorecard (deterministic heuristics, **no LLM calls**). Reuses the pipeline model.
- `employer-audit/-integrations/-developer/-security/-talent/-distribution/-notifications/-approvals/-company/-messages` — peripheral, each seeds defaults.

**Cross-cutting:** `common` (logger, filters, interceptors), `middleware`, `health`.

## 6. Frontend map (66 pages)

- **Marketing** — `pages/index.js` renders `components/home/HomeBoardingPass.jsx` (the "Boarding Pass" design: cream `#EFF0EC`, green `#2F7D3A`, Hanken 800, JetBrains Mono; imported from the Claude Design system). Other marketing pages use shared `SiteNav`/`SiteFooter`.
- **Candidate app** — `pages/app/*.jsx` inside `components/app/AppSidebar` (dark rail). `dashboard.jsx` implements the design-system app dashboard.
- **Employer app** — `pages/employer/*.jsx` inside `EmployerSidebar`.
- **Brand** — one shared `components/brand/Logo.jsx` (the `[J] jobocate` mark) is used in **all** chrome; never hand-code a wordmark.
- **Services** — each screen has `services/<screen>Api.js` (JWT from `localStorage`, throws on non-2xx). App screens **gracefully fall back to sample data** when the backend/auth is unavailable.

## 7. Gotchas (read before you debug)

1. **`--legacy-peer-deps`** is required for every `npm install` in both apps.
2. **`ownerId` is a Mixed path at runtime** (`@Prop({ type: Types.ObjectId }) ownerId` is *not* recognized as an ObjectId SchemaType, so there is **no** string↔ObjectId query casting). Each module must be internally consistent — write and query the **same** representation. Mixing (seed writes ObjectId, `find({ownerId: string})`) silently matches nothing.
3. **`ai-recruiter` reuses the `EmployerApplicant` model** from `employer-pipeline` — do **not** re-register that schema elsewhere or Mongoose throws `OverwriteModelError` at boot.
4. **OAuth signups hardcode `ROLE_CANDIDATE`** (`google.strategy.ts`, LinkedIn in `auth.service.ts`) — social signup can't create an employer yet; intended role isn't threaded through OAuth state. Known bug.
5. **`services/api.js`** historically had stale paths (`/api/job-matching/*`); the live routes are `/api/matching/*`, `/api/applications/*`, `/api/jobs/*`. Newer per-screen service modules use correct paths.
6. **styled-jsx does not scope `<Link>` (next/link) elements** — scoped `.class` rules won't hit them. Wrap such rules as `.parent :global(.class)` (see `HomeBoardingPass.jsx`).

## 8. How to fix / extend common things

- **Add a backend endpoint:** add a route to the module's controller (`@UseGuards(JwtAuthGuard)` if it touches user data) + a service method; DTOs are validated globally (whitelist + forbidNonWhitelisted).
- **Add a candidate page:** `pages/app/foo.jsx` + a `services/fooApi.js`; render inside `<AppSidebar active="foo" />`; add graceful sample fallback.
- **Change matching behavior:** eligibility rules → `geography/`; scoring/weights → `matching/match-scorer.service.ts`; skills → `matching/skill-taxonomy.ts`.
- **Add a job board:** extend the monitor providers under `monitors/providers/` and set the `*_BOARDS` env.
- **Touch the marketing look:** it's the design system — the palette/type live in `HomeBoardingPass.jsx`; the logo is `components/brand/Logo.jsx`. Designs are read from the Claude Design project via the Design MCP (`DesignSync`).

## 9. Testing & health

- Backend: `npm test` (Jest), `npm run test:e2e`, `npm run typecheck`, `npm run health`.
- Frontend: `npm run build` is the current smoke test (no unit suite). Both apps build clean (exit 0).
- Manual: seed via `npm run db:seed`; Swagger at `/api/docs` to exercise endpoints.

## 10. Release checklist

- [ ] `JWT_SECRET` + `MONGODB_URI` set (backend won't boot in prod without JWT_SECRET).
- [ ] `FRONTEND_URL` set to the real origin (CORS).
- [ ] OAuth client IDs/secrets + redirect URIs set.
- [ ] LLM key set (or accept fallbacks).
- [ ] `npm run build` green in both apps.
- [ ] Review `docs/SECURITY.md` — residual `npm audit` highs are transitive; plan the `--force` bump + retest.
