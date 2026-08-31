# Jobocate — Claude working notes

Scope for this file: **backend** (`backend/`) and **frontend** (`frontend/`) only. Ignore mobile, the browser extension, Catalyst demos, and other packages unless the user names them.

Jobocate is a two-sided AI job platform: candidates get eligibility-aware matches and applications they approve; employers post roles and see ranked candidates with reasoning. Nothing is auto-submitted without approval, and qualifications are not invented.

## How to work

1. **Smallest change that meets the asked goal.** Edit only files required for this task. No drive-by refactors, no “while I’m here” cleanups, no rewriting adjacent modules, no extra docs.
2. **Tests first, then implementation.** Write or extend a failing test that encodes the goal, watch it fail for the right reason, then implement until that test passes. This is to prevent implementing first and retrofitting tests that rubber-stamp the code.
3. **Cover the goal, not every line.** One focused test (or a small suite) that proves the behavior is enough. Do not add per-function, per-branch, or snapshot bloat. Do not test framework wiring, getters, or CSS class names unless that *is* the bug.
4. **No migrations / backfills for older shapes.** The product is not live. Change the current schema, DTOs, and UI to match the task. Do not write `db:migrate-*` scripts, dual-read old+new fields, or compatibility layers for previous implementations unless the user explicitly asks.
5. **Find code with graphify before grepping the whole tree.** A knowledge graph already exists at `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`). Use it to locate modules, callers, and paths. Broad search is a fallback after a graph query, or when the graph is clearly stale for the files you just added.

## Graphify — find things here first

`graphify-out/graph.json` is the map of this repo. For questions like “where is X?”, “what calls Y?”, “how does Z flow?”, query the graph **before** a wide file walk.

```bash
graphify query "How does candidate matching work?"
graphify query "What calls JwtAuthGuard?" --dfs
graphify query "Where is employer pipeline updated after apply?" --budget 1500
graphify path "AuthModule" "UsersModule"
graphify explain "EligibleJobsService"
```

- Prefer **query** for orientation, **path** when you need the link between two named pieces, **explain** for one node.
- Quote `source_location` from graph output when citing a fact.
- After you **add or rename** backend/frontend code in a session, refresh with `graphify --update` (from repo root) so the next lookup is not stale. Do not rebuild the full graph unless `graph.json` is missing.
- If `graphify` is unavailable, read `graphify-out/GRAPH_REPORT.md` community hubs, then open the named files. Last resort: targeted grep in `backend/src` or `frontend/src`.

Communities that usually matter: NestJS module wiring, auth/OAuth, matching, job tracker, employer pipeline, LLM providers, candidate/employer pages, frontend services.

## Layout (backend + frontend)

| Layer | Stack | Port | Path |
|---|---|---|---|
| API | NestJS 10 + Mongoose | 8000 | `backend/` |
| Web | Next.js pages router, React | 3000 (dev may bind 3001) | `frontend/` |
| DB | MongoDB (Docker) | 27017 typical; this machine may use 27018 | `docker-compose.yml` service `mongodb` |

- API prefix is `/api` except `/health` and `/health/readiness`. Swagger: `http://localhost:8000/api/docs`.
- Backend env: `backend/.env` (Nest loads this, not `.env.local`). Template: `backend/env.example`. Need `MONGODB_URI` + `JWT_SECRET`. CORS: `FRONTEND_URL` (single origin for links) + `CORS_EXTRA_ORIGINS` for extra browsers (e.g. `:3001`).
- Frontend env: `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- `npm install` in both apps needs `--legacy-peer-deps`.
- Shared contracts (`packages/contracts`) are consumed by the backend. If Nest fails to compile missing `@jobocate/contracts` exports, `npm run build` in `packages/contracts` first. Do not expand work into that package unless the task requires a new shared type.

### Backend map

- **Candidate:** `auth`, `users`, `resume` / `resume-parser` / `resume-builder`, `job-profiles`, `jobs`, `geography` (eligibility), `matching`, `applications`, `apply-runner`, `job-tracker`, `cover-letters`, `interview-buddy`, `llm`, `entitlement`, `billing`.
- **Ingestion:** `monitors` (Greenhouse/Lever), `ingestion`.
- **Employer:** `employer-jobs`, `employer-pipeline` (`EmployerApplicant`), `employer-interviews`, `employer-offers`, `employer-org`, `employer-billing`, `ai-recruiter` (reuses pipeline model — do not re-register that schema).
- New HTTP: controller route + service method; JWT via `@UseGuards(JwtAuthGuard)` when it is user data; DTOs go through the global ValidationPipe (whitelist).

### Frontend map

- Marketing: `frontend/src/pages/*.js` (and related components). Candidate app: `pages/app/*.jsx` + `AppSidebar`. Employer app: `pages/employer/*.jsx` + `EmployerSidebar`.
- Per-screen API modules: `frontend/src/services/<screen>Api.js`. Live matching routes are `/api/matching/*` (not legacy `/api/job-matching/*`).
- Screens should keep a graceful fallback when the API is down; do not rip that out unless the task says so.
- One wordmark: `frontend/src/components/brand/Logo.jsx`. Tokens: `--jb-*`.

## Tests (write these first)

**Order of work:** failing test → implement → only the tests that already existed plus the new goal test(s) should be the bar.

**Backend**

- Unit: `npm test` in `backend/` (Jest). Colocate `*.spec.ts` next to the unit under test when the behavior is a function/service. Mock collaborators; do not boot the whole app.
- HTTP / vertical slice: `npm run test:e2e` (or a single file, e.g. `npm run test:e2e -- test/auth.e2e-spec.ts`). Real `AppModule` + Mongo `jobocate_e2e`. Needs Mongo; never point this at the dev DB.
- Add an e2e case only when the goal is an HTTP contract, auth/RBAC, or a cross-module flow. Extend an existing suite when the behavior already lives there.

**Frontend**

- There is no unit-test script in `frontend/package.json`. Do not stand up Jest/RTL “for completeness.”
- If the goal is a user-visible flow, add or extend the smallest Playwright spec under `e2e/` that asserts that flow. If the goal is a pure UI-state helper with no existing harness, a single focused test is enough — or skip automated tests when the change is copy/layout-only and the user did not ask for coverage.
- Do not screenshot-assert whole pages or duplicate the same click-path across files.

A test is done when it would fail if the feature were reverted. That is the whole standard.

## Do not do

- Schema dual-write, data backfills, or “support both old and new documents.”
- Expanding the task into mobile, extension, infra, or unrelated employer/candidate surfaces.
- New flags, env vars, or feature toggles unless the task needs them to compile/run.
- Mocking away the thing under test so the new test cannot fail.

## Run (when you need to verify)

```bash
docker compose up -d mongodb          # if 27017 is taken, Mongo may already be on 27018 — match MONGODB_URI
cd backend && npm run start:dev       # http://localhost:8000/health
cd frontend && npm run dev            # http://localhost:3000
```

Health: `GET /health`. Paid-style readiness (keys, SMTP, Stripe) is `GET /health/readiness` — local dev will often show `ready: false`; that is expected without those secrets.
