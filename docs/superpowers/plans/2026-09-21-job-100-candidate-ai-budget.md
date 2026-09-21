# JOB-100 Candidate AI Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce one USD-denominated LiteLLM budget per candidate across all resume harnesses, reconcile candidate billing to Free and Paid, and show the same authoritative budget on resume and billing pages.

**Architecture:** A new `ai-budget` backend module validates YAML policy, owns encrypted LiteLLM virtual-key accounts, and exposes strict preflight/status operations. The existing resume harness injects the candidate key at sandbox creation and preflights every model-running operation; billing and resume UI consume the same budget API. LiteLLM persists keys/spend in PostgreSQL, while Mongo stores only encrypted key material and application reference data.

**Tech Stack:** NestJS 10, TypeScript, Mongoose/MongoDB, LiteLLM, PostgreSQL, Stripe test mode, Next.js 16/React 19, Jest, Playwright, Docker Compose, YAML + Zod.

**Spec:** `docs/superpowers/specs/2026-09-21-job-100-candidate-ai-budget-design.md`

## Global Constraints

- Candidate allowances are USD 0.50/month for `FREE` and USD 4.00/month for `PRO`.
- Monthly and yearly Paid subscriptions both reset the AI allowance every month.
- LiteLLM actual USD spend is authoritative; there is no credit conversion or Jobocate balance ledger.
- Keep existing `LLMQuotaService` action counters separate.
- No master-key fallback for candidate execution; budget unavailability fails closed.
- One candidate virtual key is reused by Claude Code, Codex, and OpenCode.
- `candidate_ats_review` and `employer_ats_review` are reserved policy entries and are not activated before JOB-103.
- `ai_content_heuristic` is explicitly unmetered.
- No migrations, backfills, dual reads, or compatibility layers.
- Do not change mobile, browser extension, Catalyst, or unrelated packages.
- Use tests first and keep every commit limited to the task it completes.
- Do not run the backend watcher and backend build concurrently.

## Review Focus

- A malformed or partially missing YAML file must fail startup instead of granting unlimited use; Task 1 tests invalid currency, limits, services, and aliases.
- Two concurrent turns for one candidate must not both bypass preflight; Task 3 tests atomic lease contention and stale-lease recovery.
- A yearly Stripe subscriber must receive a monthly LiteLLM reset, not a yearly budget; Tasks 1 and 6 pin cadence independently from budget duration.
- A LiteLLM key created remotely but not persisted locally must not be leaked or silently replaced with the master key; Tasks 2 and 3 test redaction and unavailable behavior.
- Exhaustion must block model calls while leaving non-model document/history operations usable; Tasks 4 and 7 test both API and UI behavior.

---

### Task 1: Declarative budget policy and model pricing validation

**Files:**
- Create: `backend/config/ai-budget.yaml`
- Create: `backend/src/ai-budget/ai-budget-policy.types.ts`
- Create: `backend/src/ai-budget/ai-budget-policy.service.ts`
- Create: `backend/src/ai-budget/ai-budget-policy.service.spec.ts`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `infra/litellm/config.yaml`

**Interfaces:**
- Produces: `AiBudgetPolicyService.tier(tier: string): TierBudgetPolicy`
- Produces: `AiBudgetPolicyService.service(service: AiBudgetServiceId): ServiceBudgetPolicy`
- Produces: `AiBudgetPolicyService.estimate(alias: string, service: AiBudgetServiceId): AiCostEstimate`
- Produces: exported `parseAiBudgetPolicy(value: unknown): AiBudgetPolicy`

- [ ] **Step 1: Add the YAML parser dependency**

Run: `cd backend; npm install yaml@^2.8.1`

Expected: `yaml` is a direct backend dependency and the lockfile is updated.

- [ ] **Step 2: Write failing policy tests**

Create tests that parse a complete policy and assert:

```ts
expect(policy.tiers.FREE).toEqual({ maxBudgetUsd: 0.5, budgetDuration: '1mo' });
expect(policy.tiers.PRO).toEqual({ maxBudgetUsd: 4, budgetDuration: '1mo' });
expect(policy.services.ai_content_heuristic.metered).toBe(false);
expect(policy.services.candidate_ats_review.enabled).toBe(false);
expect(policy.stripe.paid.yearly.priceId).toBe('price_1UAYoyGD4YhJNu0gFPMaEQZH');
```

Also test rejection of non-USD currency, negative/zero limits, duplicate/missing service IDs, exact fixed-charge declarations, estimates with `minUsd > maxUsd`, and an estimate alias absent from `infra/litellm/config.yaml`.

- [ ] **Step 3: Run the policy test and confirm failure**

Run: `cd backend; npm test -- --runInBand src/ai-budget/ai-budget-policy.service.spec.ts`

Expected: FAIL because the policy parser/service does not exist.

- [ ] **Step 4: Add policy types and strict parser**

Define these stable types:

```ts
export type AiBudgetOwnerType = 'candidate' | 'employer';
export type AiBudgetServiceId =
  | 'resume_agent_turn'
  | 'resume_look_change'
  | 'candidate_ats_review'
  | 'employer_ats_review'
  | 'ai_content_heuristic';

export interface TierBudgetPolicy {
  maxBudgetUsd: number;
  budgetDuration: '1mo';
}

export interface AiCostEstimate {
  kind: 'range' | 'usage_based';
  minUsd?: number;
  maxUsd?: number;
  label: string;
}
```

Use Zod to reject unknown keys. `AiBudgetPolicyService` reads `config/ai-budget.yaml` once at construction, validates it, and exposes immutable lookups. Resolve the path with `join(process.cwd(), 'config', 'ai-budget.yaml')` and allow a constructor-injected path only in tests.

- [ ] **Step 5: Add the approved YAML policy**

The YAML must contain exactly `FREE` and `PRO` budget tiers, `lowRemainingRatio: 0.2`, the five service entries from the spec, optional range estimates by alias, and the verified Stripe product/price IDs and amounts. ATS service entries use `enabled: false`; heuristic uses `metered: false`.

- [ ] **Step 6: Add explicit LiteLLM `model_info` cost fields**

For every offered alias in `infra/litellm/config.yaml`, add LiteLLM-supported input/output cost fields using current provider pricing. Effort remains in `litellm_params`; do not create per-harness aliases. Add comments that actual token and reasoning-token usage determines final spend.

- [ ] **Step 7: Run policy tests and backend typecheck**

Run: `cd backend; npm test -- --runInBand src/ai-budget/ai-budget-policy.service.spec.ts; npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/config/ai-budget.yaml backend/src/ai-budget backend/package.json backend/package-lock.json infra/litellm/config.yaml
git commit -m "feat(ai-budget): add validated usage policy"
```

### Task 2: Strict LiteLLM virtual-key client and encrypted account schema

**Files:**
- Create: `backend/src/ai-budget/litellm-budget.client.ts`
- Create: `backend/src/ai-budget/litellm-budget.client.spec.ts`
- Create: `backend/src/ai-budget/ai-budget-secret.codec.ts`
- Create: `backend/src/ai-budget/ai-budget-secret.codec.spec.ts`
- Create: `backend/src/ai-budget/schemas/ai-budget-account.schema.ts`
- Create: `backend/src/ai-budget/ai-budget.module.ts`

**Interfaces:**
- Produces: `LiteLlmBudgetClient.generate(input): Promise<{ key: string; keyId: string }>`
- Produces: `LiteLlmBudgetClient.update(key: string, input): Promise<void>`
- Produces: `LiteLlmBudgetClient.info(key: string): Promise<LiteLlmKeyInfo>`
- Produces: `LiteLlmBudgetClient.revoke(key: string): Promise<void>`
- Produces: `AiBudgetSecretCodec.encrypt/decrypt(value: string): string`
- Produces: Mongo model `AiBudgetAccount` unique on `{ ownerType, ownerId }`

- [ ] **Step 1: Write failing client and codec tests**

Mock `global.fetch` and assert `/key/generate`, `/key/update`, `/key/info`, and `/key/delete` use the master key only as management authorization. Assert generated body includes `max_budget`, `budget_duration: '1mo'`, `max_parallel_requests: 1`, allowed models, and owner metadata. Assert missing master key, network failure, non-2xx, or malformed response throws a typed `AI_BUDGET_UNAVAILABLE` exception and never returns `RESUME_HARNESS_LITELLM_KEY`.

Codec tests must prove AES-256-GCM round-trip, random IVs, tamper failure, and no plaintext substring in ciphertext.

- [ ] **Step 2: Run tests and confirm failure**

Run: `cd backend; npm test -- --runInBand src/ai-budget/litellm-budget.client.spec.ts src/ai-budget/ai-budget-secret.codec.spec.ts`

Expected: FAIL because the client and codec do not exist.

- [ ] **Step 3: Implement typed errors, strict client, and generic codec**

Create `AiBudgetUnavailableException` with response body:

```ts
{
  statusCode: 503,
  code: 'AI_BUDGET_UNAVAILABLE',
  message: 'AI budget is temporarily unavailable. No AI work was started.'
}
```

The client must normalize LiteLLM key info to:

```ts
interface LiteLlmKeyInfo {
  spendUsd: number;
  limitUsd: number;
  resetAt?: Date;
}
```

Do not copy the employer client's shared-proxy fallback. Adapt the employer codec's AES-GCM pattern with generic candidate-safe messages.

- [ ] **Step 4: Add account schema and module wiring**

The schema stores `ownerType`, `ownerId`, `keyId`, `keyAlias`, `encryptedKey`, `appliedTier`, `appliedLimitUsd`, `budgetDuration`, `lastSyncedAt`, optional `activeRunId`, and `runLockUntil`. Add the unique compound index and register the model/client/codec/policy providers in `AiBudgetModule`.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `cd backend; npm test -- --runInBand src/ai-budget/litellm-budget.client.spec.ts src/ai-budget/ai-budget-secret.codec.spec.ts; npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai-budget
git commit -m "feat(ai-budget): add strict virtual key accounts"
```

### Task 3: Candidate budget orchestration, status, and concurrency lease

**Files:**
- Create: `backend/src/ai-budget/ai-budget.service.ts`
- Create: `backend/src/ai-budget/ai-budget.service.spec.ts`
- Modify: `backend/src/ai-budget/ai-budget.module.ts`
- Modify: `backend/src/resume-harness/resume-harness.module.ts`

**Interfaces:**
- Consumes: policy, strict LiteLLM client, codec, account model, `ModelAliasService.tierFor/listForTier`
- Produces: `AiBudgetService.statusCandidate(userId: string): Promise<AiBudgetSnapshot>`
- Produces: `AiBudgetService.ensureCandidateAccess(userId: string): Promise<CandidateBudgetAccess>`
- Produces: `AiBudgetService.withCandidateLease<T>(userId, service, attribution, run): Promise<T>`

- [ ] **Step 1: Write failing orchestration tests**

Cover lazy creation, reuse across three harness attribution values, tier-driven key update, actual-spend normalization, `healthy/low/exhausted/unavailable`, encrypted persistence, and no secret in snapshots. Add two concurrent lease calls: the first holds the lease and the second must receive `AI_BUDGET_OPERATION_IN_PROGRESS`. Add stale-lock recovery after 15 minutes.

Use the stable result types:

```ts
export interface AiBudgetSnapshot {
  unit: 'USD';
  tier: string;
  limit: number;
  spent: number;
  remaining: number;
  periodStart: string;
  periodEnd: string;
  resetAt: string;
  status: 'healthy' | 'low' | 'exhausted' | 'unavailable';
  lastRefreshedAt: string;
}

export interface CandidateBudgetAccess {
  apiKey: string;
  keyId: string;
  keyAlias: string;
  snapshot: AiBudgetSnapshot;
}
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `cd backend; npm test -- --runInBand src/ai-budget/ai-budget.service.spec.ts`

Expected: FAIL because `AiBudgetService` does not exist.

- [ ] **Step 3: Implement account synchronization and normalized status**

Use a key alias `candidate:<ownerId>`, models from the candidate's offered aliases, and metadata `{ ownerType: 'candidate', ownerId }`. Calculate monthly period boundaries in UTC. Clamp `remaining` to zero and round displayed money to six decimals without rounding enforcement decisions.

- [ ] **Step 4: Implement atomic leases and typed exhaustion**

Claim the Mongo record using `findOneAndUpdate` where no active run exists or `runLockUntil < now`. Preflight spend after claiming and release in `finally`. `AiBudgetExhaustedException` returns HTTP 402 with code `AI_BUDGET_EXHAUSTED`. LiteLLM still receives `max_parallel_requests: 1` as the final enforcement layer.

- [ ] **Step 5: Export module and run tests**

Run: `cd backend; npm test -- --runInBand src/ai-budget/ai-budget.service.spec.ts; npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/ai-budget backend/src/resume-harness/resume-harness.module.ts
git commit -m "feat(ai-budget): enforce candidate budget accounts"
```

### Task 4: Resume API, sandbox credential, and all model-running preflights

**Files:**
- Modify: `backend/src/resume-harness/resume-harness.controller.ts`
- Modify: `backend/src/resume-harness/resume-harness.service.ts`
- Modify: `backend/src/resume-harness/__tests__/resume-harness.service.spec.ts`
- Modify: `backend/test/resume-harness.e2e-spec.ts`
- Modify: `backend/src/resume-harness/dto/resume-harness.dto.ts`

**Interfaces:**
- Consumes: `AiBudgetService.statusCandidate`, `ensureCandidateAccess`, `withCandidateLease`
- Produces: `GET /api/resume-harness/budget`
- Extends: `GET /api/resume-harness/options` model entries with `estimate`
- Emits: SSE `{ type: 'error', code, message, budget }` for blocked streams

- [ ] **Step 1: Add failing service tests for credential injection and enforcement**

Assert `startSession` calls `ensureCandidateAccess` before `sandbox.provision` and injects the returned key into `boot.proxy.apiKey`, `JOBOCATE_LITELLM_API_KEY`, and harness-specific proxy environment. Assert it never calls the old `proxyAuth()` shared key path.

Assert ordinary turn, streaming turn, template change, and vibe change run inside `withCandidateLease` using `resume_agent_turn` or `resume_look_change`. Assert restore, archive, PDF, history, and revert-without-model do not acquire a lease.

- [ ] **Step 2: Add failing controller/e2e tests**

Test the exact budget response shape, option estimate shape, HTTP 402 exhaustion, HTTP 503 unavailable, and a streaming final error event where sandbox execution count remains zero.

- [ ] **Step 3: Run tests and confirm failure**

Run: `cd backend; npm test -- --runInBand src/resume-harness/__tests__/resume-harness.service.spec.ts; npm run test:e2e -- --runInBand test/resume-harness.e2e-spec.ts`

Expected: FAIL on missing budget route and missing preflight calls.

- [ ] **Step 4: Inject `AiBudgetService` and remove candidate shared-key fallback**

Replace `proxyAuth()` use for candidate sandboxes with the access object returned by the budget service. Keep the internal LiteLLM base URL resolution, but the API key must come only from the candidate account. Do not alter the employer runtime in this task.

- [ ] **Step 5: Wrap every model-running path and normalize SSE errors**

Use one logical run ID per user action. Tags must include `ownerType=candidate`, `ownerId`, `usageContext`, `harness`, `modelAlias`, `model`, `effort`, `sessionId`, and `logicalRunId`. Catch typed budget errors at the controller stream boundary, emit the final error frame, and avoid calling the existing turn callback.

- [ ] **Step 6: Add budget and estimate endpoints**

Controller method:

```ts
@Get('budget')
budget(@Request() req) {
  return this.service.budget(this.userId(req));
}
```

`options()` adds estimates returned by policy without exposing token prices or secrets.

- [ ] **Step 7: Run focused and regression tests**

Run: `cd backend; npm test -- --runInBand src/ai-budget src/resume-harness src/ats; npm run test:e2e -- --runInBand test/resume-harness.e2e-spec.ts; npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/resume-harness backend/test/resume-harness.e2e-spec.ts
git commit -m "feat(resume): enforce shared LiteLLM budget"
```

### Task 5: PostgreSQL-backed LiteLLM persistence in Docker

**Files:**
- Modify: `docker-compose.yml`
- Modify: `infra/litellm/config.yaml`
- Modify: `.env.example`

**Interfaces:**
- Produces: healthy `litellm-db` PostgreSQL service
- Produces: LiteLLM `database_url: os.environ/LITELLM_DATABASE_URL`
- Preserves: host ports 3000, 4000, 4100, 8000, and MongoDB 27018

- [ ] **Step 1: Add a failing Compose/config assertion test**

Add a Node/Jest test in `backend/src/ai-budget/litellm-docker-config.spec.ts` that parses `docker-compose.yml` and `infra/litellm/config.yaml`, asserting a healthy PostgreSQL dependency, a persistent volume, nonempty container-only `LITELLM_DATABASE_URL`, and enabled `database_url`.

- [ ] **Step 2: Run and confirm failure**

Run: `cd backend; npm test -- --runInBand src/ai-budget/litellm-docker-config.spec.ts`

Expected: FAIL because Compose has no PostgreSQL service and LiteLLM database URL is commented out.

- [ ] **Step 3: Add the database service and dependency**

Add `litellm-db` using a pinned PostgreSQL image, a healthcheck with `pg_isready`, and `litellm_postgres_data`. Set the Compose-network URL explicitly on LiteLLM and make LiteLLM depend on database health. Do not source a blank host value over the container URL.

- [ ] **Step 4: Enable LiteLLM persistence and document host configuration**

Set `general_settings.database_url` to `os.environ/LITELLM_DATABASE_URL`. Update `.env.example` so host-run LiteLLM users know a PostgreSQL URL is mandatory for virtual keys/spend logs.

- [ ] **Step 5: Validate config**

Run: `docker compose config --quiet`

Expected: exit 0.

Run: `cd backend; npm test -- --runInBand src/ai-budget/litellm-docker-config.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml infra/litellm/config.yaml .env.example backend/src/ai-budget/litellm-docker-config.spec.ts
git commit -m "build(litellm): persist virtual keys and spend"
```

### Task 6: Idempotent Free/Paid plan reconciliation and billing APIs

**Files:**
- Create: `backend/src/billing/candidate-plan-catalog.ts`
- Create: `backend/src/billing/candidate-plan-catalog.spec.ts`
- Modify: `backend/src/scripts/seed.ts`
- Modify: `backend/src/billing/billing.service.ts`
- Modify: `backend/src/billing/billing.controller.ts`
- Modify: `backend/src/billing/__tests__/billing.service.spec.ts`
- Modify: `frontend/src/services/billingApi.js`

**Interfaces:**
- Consumes: Stripe assertions from validated AI-budget policy
- Produces: exactly two active candidate plans (`FREE`, `PRO`)
- Produces: `GET /api/billing/plans`, `GET /api/billing/subscription`, existing checkout/portal/cancel APIs
- Produces frontend calls: `getPlans`, `getSubscription`, `createCheckout`, `getAiBudget`

- [ ] **Step 1: Write failing catalogue reconciliation tests**

Use in-memory/mock models to start with Free, Pro, Elite, Interview, and duplicate/stale entitlement fixtures. Run reconciliation twice and assert:

```ts
expect(activeTypes).toEqual(['FREE', 'PRO']);
expect(paid.priceMonthly).toBe(10);
expect(paid.priceYearly).toBe(100);
expect(paid.stripePriceIdMonthly).toBe('price_1UAYnMGD4YhJNu0gYLmLjYsb');
expect(paid.stripePriceIdYearly).toBe('price_1UAYoyGD4YhJNu0gFPMaEQZH');
expect(entitlementKeys).toEqual([...new Set(entitlementKeys)]);
```

Assert user, subscription, invoice, resume, application, and employer models are never touched.

- [ ] **Step 2: Run and confirm failure**

Run: `cd backend; npm test -- --runInBand src/billing/candidate-plan-catalog.spec.ts`

Expected: FAIL because reconciliation does not exist and the current seed calls `deleteMany({})`.

- [ ] **Step 3: Extract catalogue data and implement idempotent upserts**

Export `reconcileCandidatePlans(planModel, entitlementModel, policy)`. Upsert by plan type and entitlement `(planId, featureKey)`, mark other candidate plans inactive, and delete only stale entitlement rows belonging to Free/Paid. Remove blanket plan and entitlement deletion from `seed.ts`.

Paid display name is `Paid`; Free remains `Free`. Preserve the old action-count `ai_credits_per_month` entitlement only for `LLMQuotaService`, with comments that it is unrelated to the LiteLLM resume budget.

- [ ] **Step 4: Add backend billing response tests**

Assert plans are sorted, inactive tiers are excluded, yearly checkout selects the yearly price, and the yearly billing cycle does not change `budgetDuration` from `1mo`.

- [ ] **Step 5: Implement frontend API helpers**

Replace stale comments/fallback helpers with calls to:

```js
export const getPlans = () => apiCall('/api/billing/plans');
export const getSubscription = () => apiCall('/api/billing/subscription');
export const getAiBudget = () => apiCall('/api/resume-harness/budget');
export const createCheckout = (planId, billingCycle) =>
  apiCall('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId, billingCycle }),
  });
```

Keep invoices on `/api/users/invoices` unless the backend route is deliberately consolidated in the same task.

- [ ] **Step 6: Run billing tests and typecheck**

Run: `cd backend; npm test -- --runInBand src/billing; npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/billing backend/src/scripts/seed.ts frontend/src/services/billingApi.js
git commit -m "fix(billing): reconcile Free and Paid plans"
```

### Task 7: Candidate resume and billing UI

**Files:**
- Modify: `frontend/src/services/resumeHarnessApi.js`
- Modify: `frontend/src/pages/app/resume.jsx`
- Modify: `frontend/src/pages/app/billing.jsx`
- Modify: `frontend/src/pages/app/subscription.jsx`
- Modify: `e2e/specs/candidate/resume.spec.ts`
- Create: `e2e/specs/candidate/billing.spec.ts`

**Interfaces:**
- Consumes: `AiBudgetSnapshot`, plan/subscription/invoice endpoints, option estimates
- Produces: one shared UI interpretation for healthy/low/exhausted/unavailable

- [ ] **Step 1: Extend Playwright mocks with budget states**

Add reusable responses for healthy (`remaining: 3.25`), low (`remaining: 0.5`), exhausted (`remaining: 0`), and unavailable. Resume tests assert the displayed amount, reset date, estimate, refresh after a result event, and disabled model-running actions when exhausted.

Billing tests assert only Free and Paid appear, monthly prices are USD 0/USD 10, yearly prices are USD 0/USD 100, checkout receives the correct cycle, and the same budget text appears as on resume.

- [ ] **Step 2: Run Playwright and confirm failure**

Run: `cd e2e; npm test -- specs/candidate/resume.spec.ts specs/candidate/billing.spec.ts`

Expected: FAIL because the pages do not fetch/render budget and billing still hardcodes three obsolete plans.

- [ ] **Step 3: Add budget API and error metadata to resume client**

Export `getHarnessBudget`. Preserve `code`, `status`, and `budget` from JSON error bodies for ordinary and stream setup failures. Pass SSE `code` and `budget` through unchanged.

- [ ] **Step 4: Render budget in resume workspace**

Fetch options, templates, and budget together. Show `AI budget: $X.XX of $Y.YY remaining`, status copy, reset time, and selected alias estimate. Refresh after result or typed blocked/error events. Disable start/update/look-change actions only for `exhausted` or `unavailable`; keep history, PDF, archive, restore, and non-model controls available.

- [ ] **Step 5: Replace hardcoded billing cards**

Load plans, subscription, invoices, and budget. Render API feature lists and exact monthly/yearly prices. Paid checkout calls `createCheckout` and redirects only when the API returns a URL. Free is never sent to checkout. Remove sample/fallback invoice data and stale $29/$59 copy.

- [ ] **Step 6: Remove the duplicate subscription data source**

Make `/app/subscription` render the canonical billing component or redirect to `/app/billing`; it must not retain a separate plan/usage table.

- [ ] **Step 7: Run focused Playwright and frontend build**

Run: `cd e2e; npm test -- specs/candidate/resume.spec.ts specs/candidate/billing.spec.ts`

Expected: PASS.

Run: `cd frontend; npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/services/resumeHarnessApi.js frontend/src/pages/app/resume.jsx frontend/src/pages/app/billing.jsx frontend/src/pages/app/subscription.jsx e2e/specs/candidate
git commit -m "feat(candidate): show plans and AI budget"
```

### Task 8: Local database reconciliation and complete verification

**Files:**
- Modify only if failures expose a scoped defect in files from Tasks 1-7
- Update: `graphify-out/*` via `graphify update .`

**Interfaces:**
- Verifies all previous task interfaces against Docker, MongoDB, LiteLLM, Stripe test catalogue, backend, and frontend

- [ ] **Step 1: Capture the pre-change local reference-data state**

Start Docker Desktop if its daemon is unavailable, then run `docker compose up -d litellm-db mongodb litellm agent-platform`. Record counts and stable IDs for `subscription_plans`, `plan_entitlements`, `ai_budget_accounts`, and `harness_model_aliases`. Do not enumerate or delete user content collections.

- [ ] **Step 2: Build the resume sandbox image and start application services**

Run:

```bash
docker build -f infra/agent-platform/harness.Dockerfile -t jobocate/resume-harness:latest infra/agent-platform
docker compose up -d backend frontend
```

Wait for health checks and inspect logs only for the services started in this task.

- [ ] **Step 3: Reconcile reference data twice**

Run: `docker compose exec backend npm run db:seed`

Run it a second time. Query MongoDB and assert exactly two active plans, one Free and one Paid, correct price IDs, and no duplicate entitlements. Confirm user/resume/application collection counts did not change.

- [ ] **Step 4: Run all focused backend tests**

Run: `cd backend; npm test -- --runInBand src/ai-budget src/resume-harness src/billing src/ats src/employer-pipeline; npm run test:e2e -- --runInBand test/resume-harness.e2e-spec.ts; npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Run production builds without the backend watcher**

Stop only the backend watcher/container started for this task before `cd backend; npm run build`. Then run the backend build, restart the service, and run `cd frontend; npm run build`.

Expected: both builds PASS.

- [ ] **Step 6: Run focused Playwright**

Run: `cd e2e; npm test -- specs/candidate/resume.spec.ts specs/candidate/billing.spec.ts specs/employer/resume-assessment.spec.ts`

Expected: PASS, including preserved free heuristic behavior.

- [ ] **Step 7: Probe the production OpenCode adapter**

Run: `cd backend; npm run harness:probe-opencode -- --alias bedrock/nova-2-lite/low --passes 3`

Expected: three successful production-adapter passes without master-key execution.

- [ ] **Step 8: Perform the real shared-pool acceptance run**

Using the configured test candidate, execute one grounded multi-prompt resume turn through Claude Code, Codex, and OpenCode. Capture before/after `GET /api/resume-harness/budget` responses and LiteLLM key info/spend logs. Verify one key ID, three correct harness tags, increasing spend in one pool, and billing/resume UI agreement. If a provider credential is unavailable, report that exact external blocker without replacing it with a mock acceptance claim.

- [ ] **Step 9: Update Graphify and inspect the final diff**

Run: `graphify update .`

Run: `git status --short; git diff --check; git diff --stat`

Expected: graph updated, no whitespace errors, and no unrelated files modified.

- [ ] **Step 10: Commit final verification fixes and graph update**

```bash
git add backend frontend e2e docker-compose.yml infra/litellm .env.example graphify-out
git commit -m "test(ai-budget): verify shared candidate spend"
```

### Task 9: Final review and JOB-103 handoff boundary

**Files:**
- Review: all commits since `079158b`
- Review: `docs/superpowers/specs/2026-09-21-job-103-ai-budget-design.md`

**Interfaces:**
- Confirms JOB-100 exports a reusable owner-aware core without activating employer behavior

- [ ] **Step 1: Review the complete branch against the JOB-100 spec**

Confirm every completion criterion has test or runtime evidence. Search for shared candidate proxy-key fallbacks, plaintext virtual-key logging, hardcoded obsolete candidate prices, and duplicate budget calculations.

- [ ] **Step 2: Verify scope boundaries**

Confirm no employer ATS policy entry was activated, no heuristic analysis was charged, no JOB-111 automatic routing was implemented, and no unrelated package changed.

- [ ] **Step 3: Run the final verification command set**

Run the focused backend suite, backend build, frontend build, candidate Playwright specs, `docker compose ps`, and `git diff --check` once more after review fixes.

Expected: all pass and all required services report healthy.

- [ ] **Step 4: Produce the implementation handoff**

Report commits, exact tests/builds, Docker health, local reconciliation counts, Stripe mappings, real LiteLLM key/spend evidence, any unavailable external credential, and the narrow remaining JOB-103 work. Do not claim JOB-103 complete.
