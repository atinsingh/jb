# Auto-apply: real ATS submission — design

**Date:** 2026-08-09 · **Status:** approved design, not yet planned
**Branch context:** `feat/employer-backend`
**Supersedes:** the "auto-apply strategy" decision parked in [`production-roadmap.md` §4](../../product/production-roadmap.md) (P2.2)

---

## 1. Why

Jobocate promises seven candidate-facing capabilities. An audit of the live code on 2026-08-09 found three of them real (matching, interview practice, application tracking), one half-real (tailoring — cover letters work; the résumé generator calls two endpoints that don't exist), and three that are UI shells over absent engines (auto-apply, ATS compatibility check, real-time interview coaching).

This spec covers **auto-apply**, the headline promise.

### What exists today

The server-side runner is architecturally sound and worth keeping. `apply-runner.service.ts` already has:

- a hard gate on `AUTO_APPLICATION_ENABLED` (currently `false`)
- an **atomic claim** (`atsMetadata.claimedAt`) so an application can never be submitted twice
- before/after proof screenshots persisted through `StorageService`
- CAPTCHA → `needs_human`, never bypassed
- submit-clicked-but-unconfirmed → `needs_human`, deliberately *not* retried

### What is actually missing

1. **The adapter can only fill a toy form.** `greenhouse.adapter.ts` handles six identity fields, a résumé upload, and a cover-letter textarea. It has no handling for `select`, `radio`, `checkbox`, or any custom question. Real Greenhouse postings carry required custom questions (work authorization, sponsorship, years of experience, "why us") plus an EEO block. On a live posting the current adapter fills six fields, clicks submit, fails client-side validation, sees no confirmation marker, and returns `needs_human`. **Turning the flag on today produces near-misses, not submissions.**

2. **Nothing connects the answering engine to the runner.** `assisted-apply.service.ts` already builds an `AnswersPack` (LLM-generated, prompt-versioned, audit-logged, candidate-editable) and `story-bank.service.ts` holds competency-tagged stories. The adapter reads neither.

3. **`AnswersPack` LLM-generates `workAuthorization`.** A model inventing a legal attestation, submitted under the candidate's name, is the single largest liability in this feature.

4. **Geography can't express intent** (see §2).

5. **The apply UI is a mockup.** `/app/apply.jsx` has zero service imports and a hardcoded cover letter. `/jobs/apply/[id].jsx` reads static `data/jobs`.

### Decisions taken

| Question | Decision |
|---|---|
| Submission posture | **Prepare + one-click approve** — server fills everything, candidate approves, server submits |
| Answer sourcing | **Facts from candidate, prose from AI** — attestations never inferred |
| ATS scope | **Greenhouse, Lever, Ashby, Workday** (Workday via consent handoff, see §6) |
| Trigger | **Auto from match rules**, reviewed in a batch queue |
| Target geography | **Per `JobProfile`** |
| Review layout | **Stacked queue** with inline blocker answering |

---

## 2. Prerequisite: the geography gate

### The hole

`user-preferences.schema.ts` models three geographic concepts — `country` (where the candidate *is*), `workAuthCountries[]` (where they *may* work), and `willingToRelocate` / `internationalRelocation` (booleans with no destination). There is **no field for the countries they are targeting**.

`eligible-jobs.service.ts` keys its entire Stage-1a pre-filter off `cand.country`. A candidate in India looking for work in Canada therefore sees Indian jobs and global-remote roles. To see Canadian on-site roles at all they must set both relocation booleans, which then opens on-site jobs in *every* country at once. "Canada" is unsayable.

`remoteScope: 'selected_countries'` is a dangling enum value — no array backs it.

### The fix

Add `targetCountries: string[]` (ISO2) to **`JobProfile`**, not to global preferences. "Senior Backend — Canada only" and "Staff SWE — remote global" are different searches for the same person, with different thresholds and different résumés. `JobProfile` already has full CRUD, per-profile `minMatchScore` (default 75), activate/deactivate, and per-profile résumé attach; `Application.profileId` already records which profile drove an application.

Three concepts stay strictly separate:

| Concept | Field | Role |
|---|---|---|
| Where I **want** to work | `JobProfile.targetCountries[]` *(new)* | Filters the pool |
| Where I **may** work | `workAuthCountries[]`, `visaSponsorshipNeeded` | Drives sponsorship reasoning |
| Where I **am** | `preferences.country` | Relocation / timezone context only |

Targeting Canada without Canadian work authorization must **not** hide the job. It surfaces as `CONDITIONALLY_ELIGIBLE` with a soft "requires sponsorship" reason. `eligibility.service.ts` already models hard vs soft severities; it is simply never asked.

### Consequent changes

1. **Stage-1a keys off the target set.** A job passes if it is in any target country, is globally remote, or is remote-scoped to a target. Empty `targetCountries` backfills to `[preferences.country]`, so existing users see no change until they opt in.
2. **`autoApplySafe` gains a geo condition.** `eligibility.service.ts:147` already computes `autoApplySafe = status === ELIGIBLE && confidence >= 0.7`. Auto-apply additionally requires the job's country ∈ `targetCountries`. A conditionally-eligible job may be *shown* but never enters the approval queue unattended.
3. **Remove the ungated fallback.** `matches.jsx` runs `getMyMatches` → `getEligibleJobs` → `searchScrapedJobs`. That last call is the raw ungated search, so a thin or failed eligible result silently leaks jobs from every country. Replace it with an honest empty state driven by `previewImpact()`, which already returns `poolSize`, `excludedByGeography`, `excludedByPreference`, `belowMinMatch` and `autoApplyEligible`.
4. **`selected_countries` reads `targetCountries`**, so the setting finally means something.

---

## 3. Data model

### Extend `Application`

Two new statuses threaded into the existing enum:

```
pending → preparing → awaiting_approval → submitted
                            ↓
                    needs_human | failed | expired
```

**Do not reuse `reviewing`** — it already means *the employer* is reviewing a submitted application. Reusing it would corrupt tracker semantics.

The large payload rides on fields that already exist but are unused (`artifacts.formJsonUrl`, `artifacts.screenshotUrl`): the extracted form schema goes to storage (these get large — 50+ fields with option lists), the filled-form proof to storage. Only the small state stays inline:

```ts
prepared?: {
  fingerprint: string;         // hash of the form's field structure
  answers: ResolvedAnswer[];   // { questionKey, value, source, confidence }
  blockers: string[];          // required fields we could not satisfy
  unknownQuestions: string[];  // asked once at review, then learned
  preparedAt: Date;
  expiresAt: Date;
  approvalId?: string;         // set only by an explicit candidate approval
  approvedAt?: Date;
}
```

### `AnswerProfile` (new — one per candidate)

The facts. Work authorization as a **per-country map** (`{ CA: 'requires_sponsorship' }`, not a sentence), notice period, earliest start date, salary expectation, relocation willingness, links, and an EEO block whose every field defaults to *decline to answer*.

Every field carries provenance, and **the write path physically rejects a non-candidate source.** This is what makes "AI never fabricates an attestation" an architectural guarantee rather than a prompt instruction.

### `AnswerBank` (new — one row per candidate × normalized question key)

`{ questionKey, rawSamples[], value, answerType, source, timesUsed, lastUsedAt, lastConfirmedAt }`.

This is what makes application #2 onward nearly free.

### `QuestionCatalog` (new — global, no candidate data)

Normalized question pattern → the `AnswerProfile` field that satisfies it, seeded with the ~40 questions that cover most ATS forms. Without it every candidate hand-answers "Are you legally authorized to work in X?" from scratch. It holds question patterns only, so it is shared safely across accounts.

---

## 4. Lifecycle: prepare → review → commit

Prepare and approval are separated by hours or days, and a headless Chromium session cannot be held open across that gap. The design answers that directly: **prepare does everything except click submit; commit re-drives the form and verifies nothing changed.**

### Trigger

An hourly job scans each candidate's **active** `JobProfile`s and picks up matches where `matchScore >= profile.minMatchScore`, `decision.autoApplySafe === true`, and the job's country ∈ `profile.targetCountries`. It runs through the existing Bull queue with the inline fallback used when `QUEUE_ENABLED=false`.

**Two ceilings, not one.** `MAX_APPLICATIONS_PER_DAY` caps *submissions*. A separate queue-depth ceiling — `MAX_UNREVIEWED_PREPARES`, default **10** — caps *unreviewed prepares* — otherwise a candidate who ignores the app for a week returns to 140 stale prepared applications, every one of them wasted browser time against a form that may have changed. Preparation slows down when the candidate stops approving.

### Prepare pass

Reuses the existing atomic-claim pattern verbatim: claim → resolve answers offline → launch browser → `introspect()` the form into a normalized schema → `fill()` → screenshot → fingerprint → close. Blockers and unknown questions are **recorded, never guessed**. The application lands in `awaiting_approval`.

### Commit pass

Re-drives the same URL, refills from the stored answers, and **recomputes the fingerprint before touching submit**. A mismatch means the form changed underneath the approval: it never submits, it re-prepares and tells the candidate. That single check is what makes approving yesterday's screenshot honest.

From there the existing gates apply unchanged — CAPTCHA → `needs_human`, no submit button → `failed`, clicked-but-unconfirmed → `needs_human` and never retried.

### Expiry

Prepared applications carry a 7-day TTL. A job going inactive expires them immediately. Expired means re-prepare, never submit-anyway.

### Edits feed the loop

A correction made at review writes back to `AnswerBank` *before* commit runs — so the fix applies to this application and every future one.

---

## 5. The answer engine

### Resolution order (the order *is* the safety model)

1. `AnswerProfile` — candidate-stated facts
2. `AnswerBank` — what this candidate answered before
3. `QuestionCatalog` — global question-pattern → profile-field mapping
4. AI draft — **prose only**, grounded in story bank, résumé, JD
5. Unknown → recorded as a blocker, asked once at review, learned forever

### Question classes decide what may answer them

| Class | Example | Resolver |
|---|---|---|
| Attestation | work auth, sponsorship, age, criminal history | **Profile only.** Never AI. Missing → blocker. |
| Preference | salary, notice period, start date | Profile |
| Demographic | EEO race / gender / veteran / disability | Profile, defaults to decline |
| Prose | "why do you want to work here" | AI draft, flagged as draft |
| File | résumé, cover letter | Existing builders |

**An attestation with no profile answer blocks the prepare.** It never falls through to a model.

### Option mapping is the hard part, not free text

Knowing a candidate requires sponsorship in Canada is useless if one form offers `["Yes","No"]` and the next offers `["I am legally authorized to work in Canada without sponsorship", "I will require sponsorship now or in the future", "Prefer not to say"]`. The fact must be mapped onto *that form's actual option list*.

So `introspect()` captures every option verbatim, and mapping a known fact onto them is a **constrained choice** — a legitimate LLM use, since it selects from a fixed list rather than inventing content. It carries a confidence score; below threshold it becomes a review question instead of a guess. Starting threshold: **0.85 for attestation-class questions, 0.7 for everything else** — deliberately strict on attestations, and to be re-tuned once a production-grade model is configured (see §11).

> A model may choose among the employer's words. It may never author the fact behind the choice.

### Normalization

Deterministic first — lowercase, strip punctuation and the company name, collapse whitespace — then a catalog pattern match, and only then a model classification for genuinely novel questions. Cheap and stable for the ~40 questions covering most forms.

Every resolved answer carries `{ source, confidence }`, which the review UI renders differently.

---

## 6. Adapter contract and the four platforms

Split the single `submit()` along the lifecycle, and add a capability declaration so one runner can drive four genuinely different platforms without pretending they are the same:

```ts
interface AtsAdapter {
  atsType: AtsType;
  capabilities: { headlessPrepare: boolean; headlessSubmit: boolean;
                  requiresAccount: boolean; multiPage: boolean };
  matches(url): boolean;
  introspect(page, url): Promise<FormSchema>;   // every field + verbatim options
  fill(page, answers): Promise<FillReport>;     // what filled, what did not
  submit(page): Promise<SubmitResult>;          // existing gates, unchanged
}
```

| ATS | Shape | v1 tier |
|---|---|---|
| **Greenhouse** | single page, public, no account | Full headless — extend the existing adapter to selects / radios / checkboxes |
| **Lever** | single page, public; selectors already in the extension | Full headless |
| **Ashby** | public but React-heavy, dynamic custom fields | Full headless, heavier introspection |
| **Workday** | multi-page wizard, per-tenant **account required** | **Consent handoff** |

**Workday is deliberately not headless in v1.** It requires a per-employer account with credentials, then walks 5–8 stateful pages. Storing candidate credentials per tenant is a security liability well beyond the rest of this feature. It prepares fully — every answer resolved and reviewed — then hands off to the extension or a copy-ready panel. The candidate gets the work done; they click through it themselves. All four platforms ship without betting the release on the hardest one.

**One selector source for both runners.** [`parity-gaps-spec.md`](../../product/parity-gaps-spec.md) already proposes serving a versioned selector map from the backend (`GET /api/extension/selectors`) so DOM changes are patched without shipping a new extension build. Point the headless adapters at that same map: a Greenhouse redesign becomes one document update, not a redeploy plus a Chrome Web Store review.

---

## 7. The approval queue

**Stacked cards**, ranked by match score. Each card shows role, company, match %, the geo badge proving the country gate ran, the ATS, and provenance counts (`12 from profile` / `2 AI drafts` / `1 needs you`).

**Bulk approve is gated on blockers, not on AI.** "Approve 7 clean" covers every application with no unanswered blocker. AI-drafted prose does not disqualify a card; it renders **inline**, truncated with an expand. Requiring a separate view to "read" a draft would kill the bulk path, since nearly every form asks "why us." Inline rendering makes reading the default rather than a detour.

**Blockers are answered in the card.** "Do you require sponsorship in Canada?" gets Yes/No in place, writes straight to `AnswerProfile`, and the card flips to clean. Microcopy states *"saved for every future application"* — the candidate should feel the queue getting shorter as they answer.

Skips record a reason, with an optional "never this company" feeding the exclusion filter. The empty state uses `previewImpact()` to explain itself: *"412 jobs in the pool, 0 in your target countries."*

This replaces the `/app/apply.jsx` mockup.

---

## 8. Failure handling, invariants, and the bar for the flag

### Invariants — enforced in code, asserted in tests

1. Nothing submits without a recorded candidate approval (`approvalId` + `approvedAt`)
2. No AI-authored attestation is ever submitted
3. Nothing submits when the fingerprint differs from what was approved
4. An unconfirmed submission is never retried
5. Nothing is prepared for a job outside the profile's `targetCountries`

### Routing

| Stage | Condition | Outcome |
|---|---|---|
| Prepare | unsupported ATS / no apply URL | `needs_human` |
| Prepare | CAPTCHA | `needs_human` — never reaches the queue |
| Prepare | missing attestation | **blocker** (a normal queue state, not a failure) |
| Prepare | job closed | `expired` |
| Commit | fingerprint mismatch | re-prepare + notify "the form changed" |
| Commit | no submit button | `failed` (retryable) |
| Commit | clicked, unconfirmed | `needs_human`, never retried |
| Commit | browser crash / timeout | `failed`, retryable with backoff |

### Observability

Per-ATS **fill coverage** is the alarm that matters most. When Greenhouse redesigns a form, selectors break, coverage drops, and everything quietly degrades to `needs_human`. A coverage drop must page an operator — the failure mode of this feature is not a crash, it is silence.

Also track the prepare → approve → submit funnel and a histogram of `needs_human` reasons.

### Testing

- **Golden-file tests** — `introspect()` against saved real form HTML per ATS
- **Unit** — resolution order, plus an explicit test that an attestation with no profile value never reaches a model
- **Integration** — full prepare → approve → commit against a local fixture server
- **E2E** — lifecycle added to the existing `backend/test/` suite
- **Live dry-run script** — prepares against real postings and reports fill coverage, **never submitting**

### Definition of done for `AUTO_APPLICATION_ENABLED=true`

The flag stays off until the live dry-run clears **≥95% of required fields filled across 20 real postings per headless ATS** (Greenhouse, Lever, Ashby). This converts the runbook's vague "needs live-form selector validation" into a number.

---

## 9. Build order

This is a large spec, and it should not be built as one undifferentiated push. Three slices, each independently shippable and each leaving the product honest if the next never lands:

**Slice 1 — Geography and truth.** `targetCountries` on `JobProfile`, the Stage-1a rewrite, the `autoApplySafe` geo condition, and removing the `searchScrapedJobs` fallback. Ships alone as a matching-quality fix: candidates stop seeing jobs in countries they aren't targeting. No auto-apply required.

**Slice 2 — The answer engine and the queue.** `AnswerProfile`, `AnswerBank`, `QuestionCatalog`, `introspect()` for Greenhouse, the prepare pass, and the approval queue. The flag stays **off**, so this ships as "we prepare your applications and show you exactly what would be submitted" — already better than the current mockup, and it accumulates the answer bank before anything is at stake.

**Slice 3 — Commit and the remaining adapters.** The commit pass with fingerprint verification, Lever and Ashby, the Workday consent handoff, the coverage alarm, and the live dry-run that earns the flag.

Slice 2 is the bulk of the work. Slice 1 is small and independently valuable, so it should go first regardless of what happens to the rest.

## 10. Out of scope

- CAPTCHA solving or any anti-bot evasion
- Storing per-tenant ATS credentials (this is what keeps Workday on consent handoff)
- Fully autonomous submission with no human approval
- Scraping behind logins
- The ATS compatibility checker, the résumé-generator 404s, and real-time interview coaching — each needs its own spec

## 11. Known risks

- **Selector rot** is permanent, not a one-time cost. The versioned selector map and the coverage alarm are the mitigations; neither eliminates it.
- **Ashby introspection is unproven** — it is the least understood of the three headless adapters and should be spiked before it is estimated.
- **`ANTHROPIC_API_KEY` is empty and `LLM_DEFAULT_MODEL` is a free OpenRouter model** (`nvidia/nemotron-3-super-120b-a12b:free`). Prose drafting and option mapping both inherit that quality ceiling. Option mapping is the riskier of the two, since a wrong constrained choice on a work-authorization dropdown is a wrong attestation even though no fact was fabricated — the confidence threshold must be tuned against a real model, not the free one.
- **No SMTP is configured**, so "your applications are ready to review" notifications cannot send today.
