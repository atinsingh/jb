# JOB-103 Employer ATS Gap-Patch Design

## Purpose

Patch only the remaining employer-side JOB-103 contract gaps. Preserve the employer ATS, assessment, heuristic, sandbox, key, spend-reconciliation, and screening behavior already delivered with JOB-102. Do not implement work assigned to other Jira tickets.

## Jira audit boundary

This design was reconciled against only the board's **To Do** and **Done** tracks.

### To Do ownership to preserve

- **JOB-100** owns candidate virtual-key provisioning, candidate generation preflight, `GET /api/resume-harness/budget`, candidate pricing estimates, and candidate résumé/billing budget UI. JOB-103 must consume that service when it exists; it must not implement JOB-100.
- **JOB-111** owns `DEFAULT_AUTOMATIC_MODEL_ALIAS`, direct provider/runtime routing, and no-picker default validation. JOB-103 must not implement that routing feature.
- JOB-113, JOB-116, JOB-123, and JOB-124 do not own employer ATS budget behavior and remain outside this change.

### Done behavior to preserve

- **JOB-101** owns candidate Resume-Matcher sessions, the shared candidate résumé sandbox, immutable session alias, `harness=ats`, persisted results, staleness, and the 0–100 score contract.
- **JOB-102** owns exact employer artifact/job pairing, the employer assessment lifecycle, independent deterministic AI-content heuristic, partial results, score semantics, and screening UI. Its completion record also delivered the current employer-only key, budget enforcement, reusable employer sandbox, and actual-cost reconciliation.
- **JOB-105** owns generated résumé lifecycle and sandbox teardown/reaping; JOB-103 must not alter it.
- **JOB-108** keeps one Mongo user identity while switching candidate/employer personas. Budget and sandbox records must therefore remain separated by `ownerType`, even when the underlying `ownerId` is the same.
- JOB-99, JOB-107, JOB-109, and JOB-112 do not change the employer ATS budget contract.

## Existing employer behavior to retain

- One employer-owned virtual key and budget pool per `{ownerId, ownerType: employer}`.
- One reusable employer ATS sandbox per employer persona; no per-service, per-applicant, or per-run container.
- Atomic owner-level run locking before the authoritative LiteLLM budget read.
- No provider dispatch after budget exhaustion or configuration failure.
- Actual LiteLLM spend-delta and request-log reconciliation, including provider failures.
- Idempotent usage persistence for the same logical run id.
- Employer plan changes update only the employer key.
- The free deterministic heuristic runs independently and remains visible when ATS is blocked or fails.
- Existing explicit assessment states, `/100` scores, strict `>70` advisory threshold, and unchanged recruiter fit score/flag.
- Existing screening budget display and “AI-content heuristic does not use AI budget” copy.

These behaviors receive regression tests only where needed to protect a patch. They are not candidates for refactoring or replacement.

## Verified gaps

### 1. Incomplete metered-call attribution

`EmployerAtsAssessmentInput` already carries the application id, resume artifact id/version/hash, job id, and job-description hash. `EmployerAtsRuntimeService.finish()` currently persists owner, context, alias, effort, run id, request ids, and cost, but the artifact/job fields are dropped before that write.

Patch the existing runtime boundary so `prepare` or `finish` receives a redacted attribution snapshot and stores:

- application id;
- resume artifact id, version, and SHA-256 hash;
- job id and job-description SHA-256 hash;
- owner id/type and actor id;
- `usageContext=employer_resume_assessment` and `harness=ats`;
- logical run id, model alias, provider, effort;
- LiteLLM request ids, token counts, actual cost, and success state.

Do not store resume text, job-description text, credentials, or provider payloads. The existing `requestId=ats:<logicalRunId>` upsert remains the idempotency boundary.

### 2. Employer billing omits AI budget totals

`GET /api/employer/billing/usage` currently returns action/seat/job/sourcing counters only, and `/employer/billing` does not request or display AI budget status.

Extend the existing employer billing usage response with an `aiBudget` object sourced from the same authoritative LiteLLM key status used by ATS dispatch:

- status and typed reason;
- limit, actual spend, and remaining USD;
- period and reset time when available;
- last-refreshed time.

The billing read must not expose or log the virtual key. It must not maintain a second ledger or rely on cached Mongo spend when LiteLLM is available. If the management API is unavailable, return a typed unavailable/configuration state rather than fabricated zero spend.

Update `/employer/billing` to call the existing usage endpoint and render the AI budget summary. Preserve its current subscription, invoice, and company-detail behavior.

## Integration constraints

- Prefer a narrow reusable employer budget-status provider shared by the runtime and billing API. Do not introduce a candidate/general budget subsystem before JOB-100 exists.
- Avoid circular Nest module dependencies. If extraction is needed, move only the budget-status read contract and its directly required key/account helpers to a neutral employer-scoped module; keep sandbox and assessment orchestration in `employer-pipeline`.
- Keep the current schema; no migrations, backfills, dual reads, or compatibility fields.
- Do not add routes or sidebar entries.
- Do not add `DEFAULT_AUTOMATIC_MODEL_ALIAS` behavior from JOB-111.
- Do not alter candidate generation, candidate billing, or candidate ATS behavior from JOB-100/JOB-101.

## Tests

Follow red-green TDD with focused tests that fail for the missing behavior before production edits.

1. Gateway/runtime test proves all redacted artifact/job attribution reaches the idempotent `LLMUsage` record.
2. Mutation check proves removing any required attribution field fails the test, while raw resume/job content never appears.
3. Employer billing service/controller test proves `aiBudget` uses the authoritative budget provider and preserves existing usage counters.
4. Unavailable-budget test proves billing returns a typed state rather than zero or an exception that breaks the rest of the billing page.
5. Employer billing Playwright test proves limit, actual spend, remaining, period, and reset time render from `/api/employer/billing/usage`.
6. Focused regressions retain employer-only owner scoping, one reusable employer sandbox, exhausted-budget provider blocking, heuristic partial results, actual-cost reconciliation, and same-run idempotency.
7. Dual-role ownership regression uses the same `ownerId` with different `ownerType` values and proves the employer read cannot select a candidate budget record.

## Verification

After focused tests pass:

- run the complete backend Jest suite and report every failure by name;
- run backend typecheck/build and the frontend production build;
- run the smallest employer assessment and employer billing Playwright specs;
- start only the required Docker Compose services for MongoDB, Redis, LiteLLM, agent platform, backend, and frontend;
- use the production OpenCode adapter probe for non-UI model/protocol checks;
- follow `docs/verification-prompt.md` and `infra/litellm/MODELS.md` only for live résumé/browser evidence required by the ticket;
- verify employer key/sandbox reuse, authoritative budget blocking, actual LiteLLM spend, complete redacted attribution, heuristic partial behavior, and agreement between screening/billing displays;
- run `graphify update .` after code changes.

## Out of scope

JOB-100 candidate budgeting, JOB-111 automatic routing, candidate UI changes, payment collection, top-ups, invoices, migrations/backfills, a separate credit ledger, provider price tables, new pages/routes, candidate AI-content likelihood, Resume-Matcher algorithm changes, and unrelated refactors are out of scope.
