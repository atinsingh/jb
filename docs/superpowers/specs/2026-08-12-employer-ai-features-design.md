# Employer AI features: Copilot, Sourcing, Autopilot — design

## 1. Why

### What exists today

All three pages (`/employer/copilot`, `/employer/sourcing`, `/employer/autopilot`) are real,
not mockups — they fetch from a working backend module, `ai-recruiter`
(`backend/src/ai-recruiter/`), which is deterministic-first with optional Claude
augmentation. Every LLM call is wrapped: compute a heuristic result first, try
to improve it with the LLM, fall back silently to the heuristic on any
failure (quota denial, missing key, bad JSON, Zod validation failure). Nothing
is hardcoded or simulated.

- **Copilot** (`AiRecruiterService.copilot()`): single-turn chat. Only the
  reply text comes from the LLM — the "actions" shown alongside it come from a
  regex-based intent matcher, not the model, and are never executed. The
  frontend's action chips just resend the label as a new chat message.
- **Sourcing** (`AiRecruiterService.sourcing()`): ranks the employer's own
  `EmployerApplicant` records against a brief. It never searches the separate
  `EmployerTalentCandidate` "talent pool" collection, and there is no external
  candidate search of any kind. "Shortlist" is a client-only star toggle that
  resets on reload.
- **Autopilot** (`AiRecruiterService.getAutopilot()` /
  `toggleAutopilot()`): the master toggle is a pure in-memory echo — it is
  never persisted, so a page refresh silently resets it. The review queue is
  built from the same deterministic scoring used by Sourcing/Screen, but it is
  read-only: there is no approve/execute path, so nothing Autopilot proposes
  ever actually happens.

### What is actually missing

Not "build three features from scratch" — three specific, bounded gaps:

1. Copilot has no multi-turn memory and no real tool execution.
2. Sourcing's candidate pool is one collection too narrow.
3. Autopilot doesn't persist its own on/off state and has no way to act on
   what it proposes.

### Decisions taken

- **Approval model: always propose, human always approves.** Every action
  from Copilot or Autopilot — reject, advance stage, schedule interview, send
  a message — creates a pending proposal. Nothing touches a candidate's
  record without an explicit employer confirmation. No per-action-type
  autonomy tier in this iteration; that can be layered on later if the
  always-approve model proves too slow in practice.
- **Sourcing pool: talent pool + all of the employer's past applicants**, not
  just the current job's. Real data that already exists; no external
  integration (LinkedIn-style search, data licensing, scraping) is in scope —
  that is a materially larger project on its own.
- **Autopilot trigger: event-driven + manual.** Evaluates a new applicant the
  moment they apply; a "Run now" button re-sweeps the existing pool on demand.
  No cron/scheduler infrastructure needed for this iteration.

## 2. One execution path for two features

Copilot and Autopilot both want to do the same four things to a real
candidate record — advance, reject, schedule, message. Building two proposal
systems (one per feature) would mean two places the "did this actually
happen correctly" bug could hide. Instead:

- **`AiProposedAction`** (new schema) is a single-decision proposal, not a
  multi-step chain. It is deliberately a *different* model from the existing
  `EmployerApproval` (which represents multi-step human approval chains —
  Hiring Manager → Finance → VP — for things like offer or budget requests).
  Reusing `EmployerApproval` would mean encoding structured, executable
  action data into its generic `fields: [{label, value}]` shape and parsing
  it back out to execute, which is fragile and loses type safety for no
  benefit — the two things aren't the same kind of approval.
- **`EmployerAiActionsService`** is the one place that executes an approved
  proposal, by calling the existing real services
  (`EmployerPipelineService` for stage/reject, `EmployerInterviewsService`
  for scheduling, `EmployerMessagesService` for outreach). It never
  duplicates their logic.

Both Copilot's tool calls and Autopilot's rule matches create rows in this
one table and are decided/executed through this one service.

## 3. Data model

### `AiProposedAction` (new)

```
{
  ownerId: ObjectId (ref User, indexed),
  source: 'copilot' | 'autopilot',
  actionType: 'advance_stage' | 'reject' | 'schedule_interview' | 'send_message',
  applicantId: ObjectId (ref EmployerApplicant),
  jobId: ObjectId (ref EmployerJob),
  payload: Mixed,        // typed per actionType, see below
  rationale: string,     // why the AI proposed this — shown to the employer
  status: 'pending' | 'approved' | 'rejected' | 'failed',
  failureReason: string, // set only when status = 'failed'
  decidedAt: Date,
  decidedBy: ObjectId (ref User),
  createdAt, updatedAt (timestamps),
}
```

`payload` shape per `actionType`:
- `advance_stage`: `{ targetStage: EmployerApplicant['stage'] }`
- `reject`: `{}` (rationale carries the reason)
- `schedule_interview`: `{ type, proposedAt, durationMins }`
- `send_message`: `{ conversationId?, draftText }`

Index: `{ ownerId, status, createdAt: -1 }` (queue listing) and
`{ applicantId, actionType, source, status }` (idempotency lookups, §5).

### `EmployerAutopilotConfig` (new, one doc per employer)

```
{
  ownerId: ObjectId (ref User, unique, indexed),
  enabled: boolean,
  rules: [
    { type: 'auto_propose_reject',  scoreThreshold: number, enabled: boolean },
    { type: 'auto_propose_advance', scoreThreshold: number, enabled: boolean },
  ],
}
```

Defaults on first read (no doc yet): `enabled: false`, reject threshold 40,
advance threshold 80 — matching the existing deterministic scorer's implicit
bands so turning Autopilot on for the first time doesn't surprise anyone.

### No new collection for the activity log

Today's read-only activity log becomes a query, not a write path: decided
`AiProposedAction` rows (`source: 'autopilot'`, `status != 'pending'`) sorted
by `decidedAt`. Avoids a second place that could drift from what actually
happened.

## 4. Copilot

### Session/quota model

Each employer message is its own `AgentRuntimeService.run()` call — its own
persisted `AgentRun`, its own quota charge against `EMPLOYER_AI_ENTITLEMENT`
via `LLMFeature.RECRUITER_COPILOT`. This matches how `AgentRuntimeService`
already enforces quota (once per `run()` call) rather than inventing an
open-ended "free after message one" session that would be inconsistent with
existing infra and easy to abuse. Conversation continuity comes from seeding
each new run's prompt with the last few turns from prior runs in the same
conversation — the employer experiences one continuous chat; the system
meters it fairly per turn.

### Tools (new `AgentDefinition`, `agentType: 'recruiterCopilot'`)

| Tool | Kind | Effect |
|---|---|---|
| `search_applicants` | read | Query `EmployerApplicant` by job/stage/score/skill filters |
| `get_applicant_detail` | read | One applicant's full record + stage history |
| `get_job_stats` | read | Funnel counts for a job |
| `propose_advance_stage` | action | Creates `AiProposedAction` |
| `propose_reject` | action | Creates `AiProposedAction` |
| `propose_schedule_interview` | action | Creates `AiProposedAction` + a `pending`-equivalent draft; the real `EmployerInterview` is created on approval, not before |
| `propose_send_message` | action | Drafts text via the model; the approval shows the exact text before anything can send |

System prompt requires `search_applicants` or `get_applicant_detail` to
ground any *named* candidate to a real `_id` before proposing an action on
them — the model is never allowed to guess an ID, the same "never invent a
fact" discipline used by the job-description generator shipped earlier this
branch (see `job-description-generator.service.ts`).

### Frontend

Existing chat UI is retained. Action chips change from "resend label as text"
to "show pending in Approvals," since the action already exists server-side
as a proposal by the time the reply renders — no new page.

## 5. Sourcing Agent

`sourcing()`'s candidate pool becomes the union of:

1. `EmployerTalentCandidate` for this employer (all segments)
2. `EmployerApplicant` across **all** of the employer's jobs (was: current
   job only)

Same cap as today (200 records) applied per source, so worst case ~600
candidates considered per run — bounds LLM cost without a behavior change to
the existing budget. Dedup by `candidateId` (falling back to email) where a
person appears in both sources, keeping the richer `EmployerApplicant`
record when there's a conflict.

New field per result: `sourcePool: 'talent_pool' | 'past_applicant' |
'current_job'` — surfaces *why* someone showed up, which today's
single-source UI has no way to express.

"Shortlist" becomes a real write: `POST /employer/talent-pool` (existing
endpoint) when the candidate's source isn't already the talent pool. This is
how a sourced candidate *enters* the talent pool — a loop that doesn't exist
today.

## 6. Autopilot

### Persistence

`GET /employer/ai/autopilot` reads (and lazily creates with defaults)
`EmployerAutopilotConfig`. `POST /employer/ai/autopilot/toggle` writes
`enabled` to it instead of echoing the request body back unpersisted.

### Trigger

- **Event-driven:** `EmployerPipelineService`'s applicant-creation path
  evaluates the new applicant against the employer's active rules
  immediately after scoring.
- **Manual:** a "Run now" endpoint/button sweeps the current applicant pool
  on demand (rule changes, catching anyone missed).

### Idempotency

Before creating a proposal, check for an existing `AiProposedAction` with the
same `(applicantId, actionType, source: 'autopilot')` regardless of status.
If one exists — pending *or already decided* — skip. An applicant is never
proposed twice for the same thing: "Run now" re-sweeping doesn't spam the
queue, and a proposal the employer already rejected doesn't resurface on the
next sweep.

### Review queue

Today's read-only queue gets real Approve/Dismiss actions, wired to the same
decide-and-execute path Copilot's proposals use (§2).

## 7. Guardrails and failure handling

- All LLM calls in every tool/rule path go through the *existing* quota gate
  (`enforceQuota` / `recordUsageAndIncrement` against
  `EMPLOYER_AI_ENTITLEMENT`) — no new quota key. A denied quota check
  degrades to the deterministic heuristic, exactly as today; it never breaks
  the calling flow.
- **Execution can still fail after approval** — e.g. a proposed interview
  time is double-booked by the time it's approved. `EmployerAiActionsService`
  catches this, sets the proposal to `status: 'failed'` with a
  `failureReason`, and surfaces the real error in the approvals UI. It is
  never silently marked `approved` with nothing having happened.
- Every action tool's proposal carries a human-readable `rationale` — the
  employer approves a *reason*, not a bare action type.

## 8. Testing

- Unit: each new tool handler — read tools return the right shape; action
  tools create the right `AiProposedAction` payload and never execute
  directly.
- Unit: `EmployerAiActionsService`'s decide → execute path, including the
  post-approval failure case (§7).
- Unit: Autopilot's idempotency guard — same applicant + rule does not
  double-propose across repeated "Run now" sweeps.
- Unit: Sourcing's pool merge + dedup logic (talent pool ∩ applicant history
  overlap keeps the applicant record; no duplicate result for one person).
- E2E (extends `e2e/` suite from earlier this branch): employer posts a job →
  candidate applies → Autopilot proposes an action → employer approves it in
  the browser → the applicant record actually changes. Same "prove it against
  the real running stack, not just unit tests" discipline as the
  employer→candidate matching-bridge regression spec already in this suite —
  every serious defect on this project so far lived on a layer boundary that
  unit tests structurally cannot see.

## 9. Build order

1. `AiProposedAction` schema + `EmployerAiActionsService` (decide/execute,
   including the failure path) — the shared foundation everything else needs.
2. Autopilot: `EmployerAutopilotConfig` persistence, event-driven +
   manual triggers, idempotency guard, real queue actions, activity-log query.
3. Copilot: new `AgentDefinition` + 7 tools on `agent-runtime`, frontend chip
   wiring.
4. Sourcing: pool merge/dedup, `sourcePool` field, real shortlist→talent-pool
   write.
5. E2E regression spec.

Ordered so Autopilot (which most directly needs the shared execution path)
proves it out before Copilot's more complex multi-tool agent loop is built on
top of it.

## 10. Out of scope

- Configurable per-action-type autonomy (auto-execute some action types
  without approval) — deferred; always-approve is the whole model for this
  iteration.
- External/third-party candidate search (LinkedIn-style sourcing, data
  licensing, enrichment APIs) — a materially larger project with real data
  and cost implications, not attempted here.
- Scheduled/cron-based Autopilot sweeps — event-driven + manual covers the
  approved trigger model; a scheduler can be added later without changing
  the data model.
- A unified inbox merging `AiProposedAction` with the pre-existing
  `EmployerApproval` chain system — they represent genuinely different kinds
  of approval (§2) and forcing one UI over both is a separate design
  question, not a prerequisite for this work.
- Real-time/streaming Copilot responses — request/response per turn, same as
  today; no websocket work.

## 11. Known risks

- **Idempotency guard correctness is load-bearing.** If it has a gap, an
  employer sees the same rejected candidate re-proposed for rejection every
  sweep — annoying, not dangerous (nothing executes without approval), but
  worth the dedicated unit tests in §8 rather than incidental coverage.
- **Per-message quota charging on Copilot** could feel expensive for a long,
  exploratory conversation (many read-only tool calls still cost one quota
  unit per message under the model in §4). Acceptable for this iteration;
  revisit if usage data shows it's a real friction point.
- **Talent-pool/applicant dedup by email** will under-merge if a candidate
  used two different emails across the two sources — accepted as a minor,
  visible-not-silent gap (worst case: the same person appears twice in
  Sourcing results, not a data-integrity issue).
