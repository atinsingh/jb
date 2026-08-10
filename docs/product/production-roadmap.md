# Jobocate — Production Readiness Roadmap

**Compiled:** 2026-07-28 · **Method:** 4 parallel code-audit agents (admin/ops, agent/AI layer, production infra, feature completeness) against live code on `feat/employer-backend`.

This is the authoritative "what's missing to ship" map. It supersedes ad-hoc notes where they conflict.

---

## 1. Executive summary — where the product actually stands

The product is **more built than it looks**, but three structural truths gate a real launch:

1. **The two surfaces are siloed.** `EmployerJob` is a *separate* Mongoose model from the scraped `Job` collection candidate matching uses. Nothing turns a candidate application into an `EmployerApplicant`. So the entire employer pipeline (applicants, interviews, offers, talent pool, notifications) is real-and-DB-backed but **permanently empty** until an employer manually POSTs — the two products don't touch.
2. **Several headline "AI" / "auto" features are simulated.** Auto-apply never contacts an ATS (`apply-runner` is a stub that flips status to `submitted_stub`). The employer "AI Recruiter" suite (autopilot/copilot/screening/sourcing/scorecard) is deterministic keyword templates with **no LLM**. Both are marketed as AI/automation.
3. **The ops plane doesn't exist.** No admin console (backend or frontend). `ROLE_ADMIN` is only a "super-employer" pass-through; a fully-built ingestion admin data model has **zero HTTP surface**.

Correcting the stale mental model:
- **`ROLE_AGENT` is NOT orphaned** — it's a complete, guarded backend for a **human career-concierge** who is assigned premium candidates and applies on their behalf with proof upload (`agents.controller.ts`, `agents.service.ts`, `agent-assignment.service.ts`). It just has **no operator frontend**, and `conciergeApi.js` wrongly points candidate code at agent-only endpoints.
- **Candidate Stripe billing IS real** (`billing.service.ts`: checkout/portal/webhook) — but **broken** (see P0). Employer billing is a DB simulation with synthetic invoices.

---

## 2. The missing pieces (gap map by domain)

Legend: 🟥 launch-blocker · 🟧 core-product · 🟨 scale/ops · ⬜ growth

### A. Admin Console / Operations plane — 🟥 **entirely missing**
- No `admin.module`/controller/service; no `@Controller('admin')`; no endpoint guarded by `@Roles('ROLE_ADMIN')` alone. Admins are created only via a manual `scripts/promote-admin.ts` CLI.
- Missing: user management (list/search/suspend/impersonate/role-change/reset), content moderation (jobs/resumes/orgs, abuse queue), platform metrics (users/jobs/apps/MRR), cross-tenant audit, feature flags / kill switches, admin billing (refunds/comps/MRR).
- **Ingestion/scraper ops console:** the data model is fully built and platform-scoped (`ingestion/schemas/*` — sources w/ `enabled`+`emergencyStopped` kill switch, runs, dead-letters "admins can reprocess", audit, `IngestionMetricsService`) but `ingestion.module.ts` has `controllers: []`. Zero API. This is the most "shovel-ready" admin surface.
- No admin frontend app shell at all.

### B. Agent operator layer (ROLE_AGENT) — 🟧 **backend done, no UI**
- Build the human-agent console frontend (`/agent/*`): queue of assigned candidates + their matches, apply-on-behalf action, proof upload, status updates — all six backend endpoints already exist.
- Fix `conciergeApi.js`: candidate concierge pages call agent-only endpoints and silently fall back to mock; needs a proper candidate-facing view of *their* concierge activity (a new candidate endpoint, not the agent queue).

### C. Real automation / AI truth — 🟧 (some 🟥 if marketed)
- **Auto-apply real ATS submission** — replace the `apply-runner` stub with real per-ATS automation (Playwright + Greenhouse/Lever/Workday templates) OR reposition around the existing browser extension (autofill + human submit). Product decision required.
- **Employer AI Recruiter → real LLM** — wire autopilot/copilot/screening/sourcing/scorecard to the provider layer (or relabel as "smart rules" honestly).
- **AI provider hardening** — two competing abstractions (`ai-services/ai-provider.service.ts` vs `llm/`), no 429/retry/backoff/failover, `llm/` never implemented Anthropic, legacy models (`gpt-4o-mini`, `claude-3-haiku-20240307`). Consolidate to one layer, add retry + provider failover, refresh models.
- **Queue/worker** — `bull`/`ioredis` are dead deps; all heavy work (Puppeteer, scraping, LLM, auto-apply) runs in-request. Introduce BullMQ+Redis workers.

### D. Cross-surface pipeline bridge — 🟧 **the missing spine**
- Producer: candidate `Application` → `EmployerApplicant` row on the target employer job.
- Producer: employer `EmployerJob` postings → candidate matching pool (unify with `Job`, or index both).
- Without this, the employer product has no organic data and matching never sees employer-posted roles.

### E. Notifications + messaging — 🟧
- **No notification producer anywhere** (employer table has no `create`; candidate has no table/module at all). Build an event → notification pipeline for both surfaces.
- Candidate notifications & messages pages are pure frontend sample data — need real backends.

### F. Payments — 🟥 (candidate) / 🟧 (employer)
- **Candidate Stripe is dead in 3 ways:** `main.ts` lacks `{ rawBody: true }` → webhook signature verify always throws; `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` absent from env; so nothing syncs.
- **Employer billing has no Stripe** — build checkout/webhook/entitlement sync to match candidate side.

### G. Transactional email — 🟥
- `EmailService` (nodemailer) exists but early-returns unless `SMTP_*` set (absent). Reset/verify tokens only hit logs; **org invites send no email at all**.

### H. File storage — 🟧
- Profile-picture upload is a non-persisting placeholder (buffer discarded). Résumé PDFs and agent "proof" write to **local disk**; company logo is a pasted URL string. No S3/GridFS → nothing survives a container restart or multi-instance deploy.

### I. Orphaned endpoints (frontend calls → no backend) — 🟥 quick fixes
1. `/api/interview-sessions/*` — entire `pages/candidate/interview-buddy/session/[id].jsx` live flow; real engine is under `/api/job-tracker/interview-sessions`. Also a WS event-name mismatch (`audio_chunk` vs `audio-chunk`) makes the only realtime gateway orphaned.
2. `/api/cover-letters/:id/regenerate` — no route.
3. `/api/users/help/{articles,feedback}` — no routes.
4. `/api/users/support/tickets(+/:id/reply)` — no routes.
5. `/api/entitlement` (singular) — backend is `entitlements` (plural) → 404.
6. `/api/resume-builder/{templates,context}` — fall through to `GET(:id)` and break.
7. `/api/job-matching/*` — module has no controller (legacy `api.js` prefix).

### J. Production infrastructure — 🟨 (some 🟥)
- **No production build/runtime** 🟥 — backend Dockerfile `CMD node server.js` (doesn't exist), no `npm run build`; frontend Dockerfile runs `yarn dev`; compose is dev-mode. No deployable artifact.
- **No CI, negligible tests** 🟥 — 6 `*.spec.ts` across 40+ modules; `test:e2e` points at a non-existent `test/` dir; no `.github/workflows`.
- **No observability** 🟨 — winston logging + `/health` exist; **no Sentry, no APM/metrics, no request tracing**.
- **Single-instance only** 🟨 — in-memory throttler + in-process crons ⇒ >1 replica = duplicate cron runs + per-instance limits. Needs Redis-backed throttler + leader-elected/queued crons.
- **Data** 🟨 — indexes good; no migration framework, no backup strategy; hardcoded localhost Mongo fallback.
- **Frontend API-URL drift** 🟥 quick — fallbacks to `localhost:3001` / `:4000` in a couple components will break in prod; consolidate on one `NEXT_PUBLIC_API_URL`.

### K. Security fixes (fold into P0) — 🟥
- **`MonitorController` (`jobs/monitor/*` scraper triggers) has NO auth guard** — publicly triggerable.
- **`register.dto.ts` accepts `ROLE_ADMIN`/`ROLE_AGENT`** — self-registration as admin/agent isn't blocked.
- LinkedIn OAuth `state` is a fixed guessable value doubling as CSRF token — validate a real nonce.

---

## 3. Phased plan to production

### Phase 0 — Launch blockers & truth (make it deployable, honest, secure)
*Goal: a real user can sign up, pay, get emails; nothing lies; it can be deployed and observed.*
**STATUS: code complete 2026-07-28 (Wave 0, 5 parallel agents). Both apps build clean (`nest build` + `next build`). Remaining = user must supply real secret VALUES + run a real `docker build`/CI once.**
- P0.1 ✅ Payments code: `{rawBody:true}` enabled in `main.ts` (was THE webhook-sync bug); startup warns if `STRIPE_*` unset. **User action: set real `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.** Backlog: `resetUsageForPeriod` is a no-op (usage counters don't reset on renewal).
- P0.2 ✅ Email code: `EmailService.sendOrgInviteEmail` added + wired into `employer-org inviteMember`. **User action: set real `SMTP_*`.** Backlog: needs a frontend `/accept-invite?token=` route to land invitees.
- P0.3 ✅ Security: `MonitorController` now `@Roles('ROLE_ADMIN')`; register DTO rejects `ROLE_ADMIN`/`ROLE_AGENT`; LinkedIn `state` uses a random nonce. Backlog: nonce not yet server-round-trip validated (needs cookie/Redis store — P3).
- P0.4 ✅ Orphaned endpoints: all 7 repointed/gated (interview-sessions→job-tracker, added `cover-letters/:id/regenerate`, entitlement→entitlements, help/support gated to honest empty states, resume-builder templates→local catalog, job-matching→matching); WS event names fixed. Backlog: real live-interview engine + ticket persistence.
- P0.5 ✅ Prod Docker: multi-stage `backend/Dockerfile` (`node dist/src/main.js`) + `frontend/Dockerfile` (`next build`+`next start`); `docker-compose.prod.yml`; frontend API URL consolidated on `NEXT_PUBLIC_API_URL`; comprehensive `backend/.env.example` + `frontend/.env.example`. **Unverified in sandbox: an actual `docker build` was not run (do once).**
- P0.6 ✅ CI: `.github/workflows/ci.yml` (build contracts → install → typecheck/build → jest, both apps). **Run once to confirm lockfile sync.**
- P0.7 ✅ Honesty pass (auto-apply): relabeled to "Beta — prepares/queues for your review; you confirm before submit; full automation rolling out." **Decision left to you:** whether to relabel the employer "AI Recruiter" (real heuristic ranking, no LLM) — currently kept as-is (defensible), becomes real LLM in P2.3.

### Phase 1 — Core product spine (make the two products actually work together)
**STATUS: P1.1–P1.3 code complete 2026-07-28 (Waves 1a/1b). Backend build clean, full suite 148 tests green, frontend build clean. + P2.3 (real LLM recruiter) pulled forward & done.**
- P1.1 ✅ **Pipeline bridge**: both apply seams upsert `EmployerApplicant` (new `upsertApplicant` + partial-unique `{jobId,candidateId}` index); `EmployerJobsService` now publishes to the matching pool via `publishEmployerJob` (fixed its `workplaceType` casing bug). Backlog: employer offer/interview → candidate notifications are dormant until `candidateId` is persisted on those schemas.
- P1.2 ✅ **Notifications**: `@Global NotificationsService.create({audience,…})` + candidate-notifications module/backend + candidate page rewired; producers fired at all live seams (apply create/status, applicant stage, message send). Candidate messages page still sample-only (backlog).
- P1.3 ✅ **File storage**: `StorageService` (`local | s3`) with static serving; 4 write sites + 2 serve routes migrated off inline `fs`; dead `/uploads/*` URLs now resolve. Backlog: `@aws-sdk/client-s3` not installed (S3 driver guarded); set `STORAGE_DRIVER=s3` + install SDK for prod.
- P2.3 ✅ (pulled forward) **Employer AI Recruiter is genuinely LLM-backed** (Claude `claude-opus-4-8` via the `llm/` stack, real `AnthropicProvider`), deterministic fallback preserved, byte-identical shapes. Backlog: employer features use the generic `ai_credits_per_month` entitlement — add an employer AI credit key + seed allowance to activate the LLM path (else it safely falls back).
- P1.4 ✅ **Agent operator console**: `/agent/dashboard` + `/agent/candidate/[id]` (apply-on-behalf, status/notes, proof upload) on the existing `agents` backend; `AgentSidebar` (concierge/purple); `ROLE_AGENT` login redirect + surface gating (ROLE_ADMIN exempt); fixed `conciergeApi.js` (was calling agent-only routes). Backlog: no candidate-facing "who is my concierge" endpoint yet (the concierge "Your coach" card stays a placeholder).
- **Backlog closed this pass:** employer AI now consults `EmployerSubscription.aiActionsLimit` (free 25 → enterprise 10000) so paying employers reach Claude; candidate offer/interview notifications fire (candidateId resolved from the linked applicant).

**Testing:** every new/modified backend function has a co-located `*.spec.ts`; the 2 pre-existing broken specs were repaired → **full suite green (161 tests)**, backend + frontend builds clean. (No frontend unit harness exists — agent console validated by `next build`; establishing Jest+RTL for the frontend is a tracked follow-up.)

**Wave-1 residual backlog (non-blocking):** brand-new employers reach Claude only after their `EmployerSubscription` exists (provision at onboarding to fix); candidate `messages` page still sample-only (needs a candidate messaging backend); install `@aws-sdk/client-s3` + set `STORAGE_DRIVER=s3` for multi-instance prod; add `GET /concierge/me` for the candidate concierge card; frontend test harness.

### Phase 2 — Real automation, AI & the ops plane
**STATUS: COMPLETE 2026-07-29 (Waves 2a–2d). Backend build clean, full jest suite 306 tests green, frontend build clean.** 2a admin console (users/metrics/moderation/ingestion-ops, + fixed the never-registered orchestration services). 2b Bull v4 queue/workers with `QUEUE_ENABLED` inline-fallback (pdf, auto-apply, 5 crons→repeatable jobs). 2d retired `ai-services/` → all AI on `llm/`, quota opt-in via `LLM_ENFORCE_QUOTA`. 2c scoped Greenhouse headless auto-apply (Puppeteer, `AUTO_APPLICATION_ENABLED`-gated, CAPTCHA/non-Greenhouse→`needs_human`, screenshot proof) — **needs live-form selector validation before enabling**. See `production-readiness-map` memory for full detail + backlog.

- P2.1 **Admin console** (§2.A): admin module + `RolesGuard`-protected APIs (users, moderation, metrics, billing-ops) + ingestion ops console (wire the existing data model) + admin frontend shell.
- P2.2 **Auto-apply real submission** (§2.C) — Playwright ATS adapters *or* extension repositioning (decision).
- P2.3 **Employer AI Recruiter → real LLM** + **AI provider consolidation/hardening** (retry/failover/models).
- P2.4 **BullMQ + Redis workers** — move Puppeteer/scrape/LLM/auto-apply off the request path.

### Phase 3 — Scale & growth ⬜
- Redis-backed throttler + HA cron; observability (Sentry/APM/tracing); Mongo migrations + backups; IaC/hosting (Vercel frontend + container host backend); load/perf; expanded test coverage.

---

## 4. Executing this with subagents

Structure the build as **waves** (each wave = parallel subagents; barrier between waves only where there's a real dependency). Use **worktree isolation** for any wave where agents edit files concurrently.

- **Wave 0 (parallel, independent files):** P0.1 payments · P0.2 email · P0.3 security · P0.4 orphaned endpoints · P0.5 Docker/env — five agents, mostly disjoint files, run concurrently in worktrees; one integration agent merges + runs both builds as the barrier.
- **Wave 1 (parallel after Wave 0):** P1.1 pipeline bridge and P1.2 notifications share models → run pipeline-bridge first (or same agent), then notifications/messages/file-storage/agent-console in parallel.
- **Wave 2 (parallel):** admin backend · admin frontend · AI-provider consolidation · employer-AI-LLM — mostly independent; auto-apply ATS is its own track (largest, spike first).
- **Verification after each wave:** a dedicated review agent (adversarial) + `nest build`/`next build` gate before the next wave starts.
- P0.6 CI should land early so every subsequent wave is gated automatically.

Product decisions that change the plan (resolve before Wave 2): (a) launch scope — real paid product vs investor/demo; (b) auto-apply strategy — headless ATS automation vs. browser-extension + human submit; (c) whether employer AI must be real LLM now or can ship as honest "smart rules."
