# JOB-100 Candidate AI Budget Design

## Objective

Meter candidate resume generation through one persistent LiteLLM virtual key and one USD-denominated monthly budget per candidate. Claude Code, Codex, and OpenCode must consume the same pool, exhausted or unavailable budgets must block before sandbox/model execution, and the existing resume and billing pages must show the same authoritative budget state.

This work also reconciles candidate billing with the two active Stripe test products supplied for the paid tier and removes obsolete hardcoded plan displays. It establishes the reusable owner-aware budget core that JOB-103 will later use for employer ATS metering without implementing JOB-103 early.

## Approved product decisions

- The user-facing candidate tiers are Free and Paid.
- Free receives a USD 0.50 AI budget every month.
- Paid receives a USD 4.00 AI budget every month.
- The USD 100 yearly subscription receives the same USD 4.00 allowance each month, not USD 48 or the full annual allowance up front.
- The UI calls the allowance an **AI budget** and displays USD. There is no credit multiplier, token-to-credit conversion, or separate Jobocate balance ledger.
- LiteLLM's reported spend is authoritative. Configured estimates are guidance only and never replace actual spend.
- `FREE` remains the internal key for Free. `PRO` remains the internal key for the single Paid tier so unrelated entitlement and model-access code does not require a broad rename.
- Existing action-count quotas remain separate from this resume budget. They are not merged into LiteLLM spend.
- Heuristic AI-content analysis remains free and unmetered.

## Stripe catalogue

The existing Stripe sandbox products are billing cadences for the same Paid tier:

| Cadence | Product | Price | Amount |
| --- | --- | --- | --- |
| Monthly | `prod_VAucq8N2hh10sb` | `price_1UAYnMGD4YhJNu0gYLmLjYsb` | USD 10/month |
| Yearly | `prod_VAue1EgKKX8FIz` | `price_1UAYoyGD4YhJNu0gFPMaEQZH` | USD 100/year |

Free is an internal entitlement and does not need a zero-dollar Stripe product. The candidate plan catalogue must expose only Free and Paid. Legacy Elite and Interview plan definitions may remain as internal enum values where unrelated code still references them, but their candidate subscription-plan records must be inactive and absent from candidate billing UI.

The idempotent catalogue reconciliation stores the two verified price IDs on the Paid plan. Checkout continues to select the monthly or yearly price from the requested billing cycle. Product IDs, price IDs, cadence, amount, and tier must agree in seed/config validation so a stale UI price cannot silently diverge from checkout.

## Configuration ownership

Configuration is split by responsibility.

### LiteLLM model configuration

`infra/litellm/config.yaml` remains authoritative for:

- alias to provider-model routing;
- effort/reasoning configuration;
- provider token pricing or an explicit LiteLLM pricing override;
- request tagging and spend-log persistence.

Aliases are never duplicated per harness or service. Harness and service attribution is carried by request tags. Reasoning-token and output-token usage is charged according to the selected model configuration and LiteLLM's actual accounting.

### Application budget policy

`backend/config/ai-budget.yaml` is the declarative application policy. It contains:

- a version and USD currency;
- candidate tier limits and the one-month duration;
- low-budget thresholds;
- stable service identifiers;
- whether each service is metered;
- the pool and owner type a service uses;
- optional display estimate ranges by alias/model/effort;
- Stripe catalogue assertions needed by the candidate plan reconciler.

Initial service entries are:

| Service | Metered now | Owner/pool | Notes |
| --- | --- | --- | --- |
| `resume_agent_turn` | Yes | candidate/candidate-ai | Session creation does not charge; model-running turns do. |
| `resume_look_change` | Yes | candidate/candidate-ai | Template and vibe changes that invoke a model. |
| `candidate_ats_review` | No, reserved for JOB-103 | candidate/candidate-ai | Defined so JOB-103 can activate the consumer without inventing a second policy format. |
| `employer_ats_review` | No, reserved for JOB-103 | employer/employer-ai | No employer behavior changes in JOB-100. |
| `ai_content_heuristic` | No | none | Explicitly free and never sent through budget charging. |

An estimate is a range or `usage based`; it is never an exact promised charge. Missing or invalid policy causes a startup/configuration failure rather than silently granting unlimited use.

## Budget account model

A dedicated budget-account collection owns LiteLLM credentials and synchronization state. It is separate from candidate subscriptions and from existing action-count usage records.

Each record contains:

- `ownerType`: initially `candidate`, with `employer` reserved for JOB-103;
- `ownerId`;
- LiteLLM key identifier/alias;
- encrypted virtual-key secret;
- applied tier, limit, and duration;
- last successful synchronization time and status metadata;
- timestamps.

`(ownerType, ownerId)` is unique. This prevents a dual-role account from accidentally sharing candidate and employer pools. Plaintext keys are never returned from APIs, logged, serialized into tests, or stored unencrypted.

The service reuses the existing secret codec pattern from the employer runtime rather than introducing another encryption scheme. The reusable key client talks only to LiteLLM's management API; application code never reads or writes LiteLLM's database directly.

## Provisioning and synchronization

The reusable AI-budget service accepts an owner identity and tier policy.

1. Look up the budget account by owner type and owner ID.
2. If absent, create one virtual key through LiteLLM's management API with the configured `max_budget` and `budget_duration`.
3. Encrypt and persist the returned key once.
4. If the tier, limit, or duration changed, update the existing LiteLLM key before authorizing work.
5. Fetch the latest authoritative spend and reset information.
6. Return a normalized budget status.

Account lifecycle operations can revoke or rotate the key. A test/local reset must revoke the exact remote key before replacing its local account record. There is no master-key execution fallback when provisioning, refresh, decryption, or the management API fails.

## Budget response

`GET /api/resume-harness/budget` returns the signed-in candidate's normalized state:

- `unit: "USD"`;
- `limit`, `spent`, and `remaining`;
- period start, period end, and next reset;
- `status`: `healthy`, `low`, `exhausted`, or `unavailable`;
- applied tier;
- last refreshed time.

Amounts are normalized consistently for the resume and billing surfaces. Secrets, master keys, LiteLLM database details, and raw management responses are excluded.

`GET /api/resume-harness/options` adds estimate metadata to each offered alias without duplicating model price logic in the controller or frontend.

## Enforcement and request flow

Budget enforcement occurs immediately before every operation that can invoke a model:

- the initial model-running resume turn;
- ordinary follow-up turns;
- streaming follow-up turns;
- model-running template changes;
- model-running vibe changes;
- repair attempts inside the same logical turn.

Starting a session may provision a sandbox but must not permit a model call unless preflight succeeded. Prefer preflight before provisioning so exhausted users do not consume sandbox capacity.

For an allowed operation:

1. Resolve the candidate's latest tier and policy.
2. Provision/update and refresh the one candidate key.
3. Refuse when exhausted or unavailable.
4. Pass the candidate virtual key, never the proxy master key, to the sandbox/harness environment.
5. Attach stable tags for owner type, owner ID, service, harness, alias, model, effort, session, and logical run.
6. Execute the existing harness flow without switching models because budget is low.
7. Refresh spend after success or model-side failure and expose the updated status to the caller/UI.

All three harnesses use the same candidate key. Switching harnesses or starting another resume session does not create a new pool.

## Failure behavior

Budget errors are typed and consistent:

- `AI_BUDGET_EXHAUSTED`: no remaining spend; HTTP response blocks before sandbox execution.
- `AI_BUDGET_UNAVAILABLE`: the management API, key state, decryption, or authoritative spend refresh is unavailable; fail closed.
- `AI_BUDGET_CONFIGURATION_INVALID`: policy or alias pricing configuration is invalid.

Ordinary requests return the typed error in the normal API error body. Streaming requests emit one final blocked/error event with the same code and message, then close cleanly. They do not drop the connection without explanation and do not start the harness.

Concurrency must not permit two simultaneous preflights to overspend indefinitely. JOB-100 reuses the existing one-live-session constraint and serializes model-running operations for a candidate budget account. LiteLLM remains the final budget enforcer if concurrent requests cross between refresh and execution.

## Candidate billing and database reconciliation

The current destructive plan seed is replaced with an idempotent reconciliation:

- upsert Free and Paid by stable internal type;
- write USD 0/0 and USD 10/100 plan prices;
- store the verified monthly/yearly Stripe price IDs on Paid;
- upsert the intended entitlements for each active plan;
- mark obsolete candidate plan records inactive;
- remove stale entitlements only within affected plan-reference scope;
- never delete users, resumes, applications, subscription history, invoices, employer records, or unrelated usage data.

Running the reconciliation twice must produce the same two active plans and no duplicate entitlements. Existing local reference data is inspected before reconciliation. Cleanup is limited to candidate plan/entitlement/alias/budget reference state required for this ticket.

The old `ai_credits_per_month` action-count entitlement remains only for unrelated legacy/non-resume product features that still use `LLMQuotaService`; it must not be displayed as, added to, or deducted from the LiteLLM resume budget. UI wording must distinguish these systems wherever both appear.

## Frontend behavior

### Resume workspace

`/app/resume` shows:

- current AI budget remaining beside plan/model/effort;
- configured estimate range or `usage based` before a model-running action;
- reset time and healthy/low/exhausted/unavailable status;
- an upgrade action when Free is low or exhausted;
- a retry/status action when unavailable.

It refreshes budget after completed, failed, or blocked operations. An exhausted state disables model-running actions while leaving document viewing, history, archive, restore, download, and non-model operations available.

### Billing

`/app/billing` becomes the canonical candidate billing display. It loads active plans, current subscription, invoices, and the same budget endpoint used by the resume page. It removes the hardcoded USD 29/USD 59 cards and renders only Free and Paid, with Paid offering USD 10 monthly and USD 100 yearly checkout.

Any remaining `/app/subscription` presentation must consume the same APIs or route to the canonical billing page. It cannot maintain a second plan list, price table, or budget calculation. No new sidebar route is added.

## Docker and local runtime

Detailed verification requires the Docker-backed services to be operational:

- MongoDB for application/reference data;
- PostgreSQL for LiteLLM virtual keys and spend logs;
- LiteLLM with `database_url` enabled;
- sandbox/runtime dependencies used by the resume harness;
- backend and frontend development servers.

The implementation starts only processes needed by this ticket and stops only processes it started. Backend watch and build are never run concurrently because both rewrite `backend/dist`.

## Test strategy

Tests are written before the corresponding implementation.

### Backend unit and integration tests

- YAML parsing rejects missing tiers, duplicate services, invalid amounts, inactive aliases, and exact-charge claims.
- Free resolves to USD 0.50 per month; Paid resolves to USD 4.00 per month for monthly and yearly subscriptions.
- One candidate key is lazily created and reused across Claude Code, Codex, and OpenCode.
- Tier changes update the existing key rather than creating another pool.
- Secrets are encrypted at rest and omitted from responses/log messages.
- Management operations use LiteLLM APIs and never raw SQL.
- Exhausted and unavailable states prevent sandbox/harness execution.
- Ordinary and SSE paths expose the same typed failure.
- Every metered request carries service/harness/model/effort/session/run attribution.
- Reported spend after a turn comes from LiteLLM and harness switching does not reset it.
- Look/template/vibe operations that invoke a model are enforced; non-model operations are not charged.
- AI-content heuristic service is explicitly unmetered.
- Plan reconciliation is idempotent and produces exactly Free and Paid with the verified Stripe price IDs.
- Existing candidate ATS/session lifecycle and employer assessment tests continue to pass.

### Frontend tests

The focused candidate Playwright flow covers:

- Free and Paid cards with monthly/yearly prices;
- one budget response rendered consistently on billing and resume pages;
- estimate before an action;
- remaining amount refreshed after a completed turn;
- exhausted actions blocked with upgrade guidance;
- unavailable state differentiated from exhaustion;
- document/history actions remaining usable when exhausted.

### Runtime verification

1. Start Docker and required services.
2. Confirm LiteLLM health, PostgreSQL persistence, and management API availability.
3. Run the catalogue reconciliation twice and inspect MongoDB for exactly two active candidate plans and non-duplicated entitlements.
4. Run focused backend tests, the affected regression suites, frontend Playwright, and production builds.
5. Use the production OpenCode adapter probe where UI behavior is not required.
6. Perform a real multi-prompt resume run for Claude Code, Codex, and OpenCode using one candidate account.
7. Record that all three use the same virtual-key identifier and that LiteLLM spend increases in the same pool.
8. Verify the resume and billing pages show the authoritative post-run amount.

## Scope boundaries

JOB-100 includes the reusable owner-aware core, candidate key/budget behavior, candidate billing reconciliation, and candidate UI.

JOB-100 does not:

- replace or merge existing non-resume `LLMQuotaService` action counters;
- activate candidate or employer ATS charging before JOB-103;
- alter the employer heuristic result or charge for it;
- implement employer billing UI changes reserved for JOB-103;
- implement automatic hidden model routing reserved for JOB-111;
- add top-ups, purchased credit packs, invoice-ledger copies, or balance transfers;
- add migrations, data backfills, or dual-read compatibility layers;
- modify mobile, browser extension, Catalyst, or packages outside `backend/` and `frontend/` except the existing LiteLLM infrastructure configuration and this design documentation.

## Completion criteria

JOB-100 is complete only when:

- one persistent candidate LiteLLM key and USD pool is enforced across all three harnesses;
- Free and Paid receive the approved monthly limits;
- monthly and yearly Paid subscriptions reset monthly;
- exhausted/unavailable requests fail before model execution;
- actual spend is visible and agrees on resume and billing pages;
- the candidate catalogue and Stripe mappings expose only the correct two tiers and prices;
- reference-data reconciliation is repeatable and safe for the current local database;
- focused tests, affected regressions, builds, Docker checks, and the real shared-pool harness run pass;
- Graphify is updated after code changes;
- no JOB-103, JOB-111, or unrelated surface is implemented early.
