# JOB-103 AI Budget Completion Design

## Purpose

Complete the missing JOB-103 behavior without replacing employer ATS behavior that is already implemented and covered. Candidate generation, candidate ATS, and employer ATS must use owner-scoped LiteLLM virtual keys and authoritative LiteLLM spend while preserving the free deterministic employer AI-content heuristic.

## Existing behavior to preserve

- Employer ATS provisions an employer-owned LiteLLM virtual key and reuses an employer-owned ATS sandbox.
- Employer assessments run the deterministic heuristic independently of ATS availability and preserve its result when ATS is blocked or fails.
- Employer ATS already exposes typed runtime states, `/100` scores, default server-side alias resolution, actual spend reconciliation, and idempotent usage persistence.
- `/employer/screening` already shows ATS budget status and states that the heuristic is unmetered.
- Candidate ATS already reuses the active candidate resume sandbox and snapshots the resume-session alias.

These paths will be extended only where a verified JOB-103 requirement is missing. Existing working behavior, APIs, and tests must not be rewritten merely to fit a new abstraction.

## Verified gaps

1. Candidate resume generation receives a process-level LiteLLM key rather than a candidate-owned virtual key.
2. Candidate generation and ATS do not share an authoritative candidate budget gateway.
3. Candidate ATS lacks typed budget states, owner-wide dispatch coordination, actual-cost reconciliation, and complete persisted attribution.
4. Employer usage attribution does not persist every required source artifact and job-description identifier.
5. Candidate and employer billing surfaces do not show AI limit, actual spend, remaining amount, period, and reset time.
6. `/app/resume` does not show remaining candidate budget or a clearly labeled usage-based estimate before ATS execution.
7. Cross-flow concurrency, owner isolation, tier updates, and billing/API agreement are not fully covered.

## Architecture

### Shared owner budget service

Add a backend owner-scoped AI budget service consumed by candidate resume generation, candidate ATS, and the existing employer ATS runtime. Its public contract supports:

- `ownerId` and `ownerType` (`candidate` or `employer`);
- a single encrypted LiteLLM virtual key per owner;
- tier-derived model aliases and USD budget limit;
- authoritative budget reads from LiteLLM;
- an atomic, expiring owner-level dispatch claim keyed by logical run id;
- idempotent completion using the same logical run id;
- actual LiteLLM spend and request-log reconciliation;
- redacted usage metadata with `usageContext` and `harness=ats` where applicable.

The service does not introduce a credit ledger, token conversion, synthetic charge, provider price table, or per-service key. It uses LiteLLM management APIs only.

The current employer runtime remains responsible for employer sandbox lifecycle. The candidate resume harness remains responsible for the candidate sandbox lifecycle. The shared budget service owns budget identity and authorization, not containers.

### Race-safe authorization

Only one metered dispatch may hold an owner's atomic dispatch claim at a time. This coordinates candidate generation and ATS against the same pool and prevents two requests from both knowingly passing a stale budget check. The claim is released after reconciliation and expires after a bounded timeout for crash recovery.

No exact amount is precharged. LiteLLM remains authoritative for final spend. A blocked duplicate returns a typed running/in-progress state rather than calling the provider.

### Candidate generation

At session provisioning, resolve or create the candidate's virtual key and inject only that key into the existing resume sandbox. Before every model-producing turn, acquire an owner-level dispatch claim and read the authoritative candidate budget. If exhausted or misconfigured, do not execute the harness command. After the command, reconcile actual LiteLLM spend and release the claim even when the provider or persistence path fails.

Generation and ATS therefore use the same candidate key, pool, aliases, and sandbox without creating an ATS-specific key or container.

### Candidate ATS

Extend the persisted ATS session with explicit typed state and immutable attribution:

- owner and actor ids/types;
- logical run id;
- source resume session, revision, and content hash;
- job-description hash;
- alias, provider, model, and effort snapshot;
- LiteLLM request ids and actual cost;
- budget status/reason where ATS is not dispatched.

Refreshing the same logical run must not create a second usage charge. A newly created assessment may snapshot a newly selected allowed alias; retrying an existing assessment retains its snapshot.

### Employer ATS completion

Keep the existing employer key, sandbox, assessment, and heuristic implementation. Adapt it to the shared owner-budget contract only where doing so removes duplicated key/budget handling without changing observable behavior. Add the missing resume artifact/version/hash and job-description hash to redacted usage attribution. Preserve the existing no-picker server default, tier validation, partial-result behavior, and employer-only ownership checks.

### APIs

- Add `GET /api/resume-harness/budget` for the candidate pool. Its values include generation and candidate ATS spend from the same authoritative LiteLLM key.
- Extend the existing employer billing usage response with `aiBudget` containing limit, spent, remaining, period, and reset time.
- Keep the existing employer assessment budget endpoint for the screening workflow.
- Return typed states for `NOT_RUN`, `RUNNING`, `COMPLETE`, `PARTIAL`, `BUDGET_EXHAUSTED`, `CONFIGURATION_ERROR`, and `PROVIDER_FAILED` where each workflow exposes ATS state.
- Never return virtual keys, provider credentials, raw resume text, job-description text, or provider payloads.

### UI

- `/app/resume`: show candidate remaining budget and a clearly labeled usage-based estimate or range before ATS Run; disable duplicate execution; refresh the actual budget after completion; distinguish typed blocked/failure states without generic warnings for non-attempts.
- `/app/billing`: show the candidate pool's limit, actual spend, remaining amount, period, and reset time, explicitly covering both resume generation and candidate ATS.
- `/employer/screening`: preserve the existing budget and heuristic messaging, adding only missing state handling.
- `/employer/billing`: show the employer pool's limit, actual spend, remaining amount, period, and reset time.
- Preserve strict ATS guidance: scores above 70 say “Good to submit”; 70 or below says “Improve before submitting.” Keep heuristic likelihood separate from ATS and workflow scores.

No new page, sidebar entry, or runtime provider picker is introduced.

## Failure handling

- Budget exhaustion and tier-disallowed aliases fail before provider dispatch.
- Provider failures record only spend LiteLLM actually reports.
- Reconciliation and lock release run on success and failure; a persistence failure must not strand an owner lock.
- Foreign owner ids receive the project-standard non-disclosing response.
- Logs and budget events contain ids, hashes, aliases, token counts, request ids, and costs only; source text and credentials are redacted.
- The deterministic employer heuristic is never metered and still runs when ATS is unavailable.

## Test strategy

Use focused red-green tests before each production change. Cover:

1. Candidate generation and ATS use the same candidate key, pool, and sandbox.
2. Candidate and employer owners cannot read, mutate, or dispatch through each other's keys.
3. Employer behavior already covered by passing tests remains unchanged.
4. Owner-level concurrent preflight permits at most one metered dispatch.
5. Exhausted budgets skip provider execution and return typed state.
6. Actual LiteLLM cost is recorded once per logical run, including failed provider calls and retries.
7. Alias/effort snapshots remain stable across default changes and reject disallowed defaults before dispatch.
8. Tier changes update only the correct owner's existing key.
9. Employer usage attribution includes artifact/version/hash and job-description hash without source text.
10. Candidate and employer billing APIs agree with their respective UI displays after ATS usage.
11. Candidate resume and employer screening Playwright specs cover budget, partial result, duplicate-run prevention, `/100`, and advisory threshold copy.

## Verification

After focused tests pass:

- run the complete backend Jest suite and backend build/typecheck;
- run the frontend production build and the smallest relevant Playwright specs;
- start the required Docker Compose services, including MongoDB, Redis, LiteLLM, the agent platform, backend, and frontend as required by the repository setup;
- use `npm run harness:probe-opencode -- --alias <alias>` for production adapter protocol/model checks;
- follow `docs/verification-prompt.md` and `infra/litellm/MODELS.md` for the live multi-prompt resume verification, using the required default smoke model unless configuration excludes it;
- verify one-container reuse, payer isolation, budget blocking, actual spend, partial employer results, tier changes, and matching billing displays;
- capture only redacted evidence;
- run `graphify update .` after code changes.

## Out of scope

Payment collection, top-ups, invoicing changes, migrations/backfills, a separate credit ledger, provider price-table ownership, Resume-Matcher hosting-cost allocation, candidate exposure of AI-content likelihood, new routes/pages, and unrelated refactors remain out of scope.
