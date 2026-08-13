# Mock Interview: Real AI Feedback Loop — Design

## Context

This is sub-project 1 of a 4-part candidate-flow initiative (competing with aiapply.co / finalroundai.com). A prior audit found the candidate app is mostly real (`/app/apply`, `/app/auto-apply`, `/app/live-interview` all do genuine backend work), but `/app/mock-interview` is not: it runs entirely on a hardcoded 8-question `QUESTION_BANK`, the "AI follow-up" text is static, and the candidate's typed answer is discarded on `goNext()` without ever being sent anywhere. This directly contradicts the product's own copy elsewhere ("Run an AI mock tailored to your target role — get specific feedback, instantly") and is the most direct feature overlap with finalroundai.com's core "practice with AI" loop, making it the highest-priority fix.

Follow-on sub-projects (apply/matches visual pass, messages backend, help/support) are out of scope here and will get their own specs.

## Key discovery

The backend already has a fully-built, LLM-backed mock interview system that the frontend simply never calls:

- `backend/src/job-tracker/interview-prep.service.ts` + `MockInterviewSession` schema (`backend/src/schemas/mock-interview-session.schema.ts`) — session creation, LLM question generation (avoids repeating prior questions), LLM answer scoring (`{score, feedback}` per answer, JSON-validated, persisted to the session).
- `backend/src/job-tracker/job-tracker.controller.ts` exposes it: `POST /job-tracker/interview-sessions`, `GET .../interview-sessions[/:id]`, `POST .../interview-sessions/:id/generate-question`, `POST .../interview-sessions/:id/submit-answer`, `POST .../interview-sessions/:id/complete` — all behind `JwtAuthGuard`, scoped by `req.user._id`.
- `frontend/src/services/interviewApi.js:73-111` already exports the client functions (`createInterviewSession`, `generateInterviewQuestion`, `submitInterviewAnswer`, `completeInterviewSession`, etc.) — `mock-interview.jsx` imports none of them.
- The one real gap: `InterviewPrepService.generateRubricScores()` and `.generateFeedbackSummary()` (lines ~274-326) are non-LLM stubs — they copy the overall score into 4 fixed categories and template a summary sentence, rather than asking the LLM to actually analyze the session.

This means the bulk of this project is **frontend rewiring**, not new backend surface area. The LLM call pattern to follow for the two stub upgrades is the one already used by `submitAnswer()` and by `cover-letter-generator.service.ts`: `routingService.getProviderForFeature(...)` → `provider.chat({...})` with a system prompt demanding "ONLY valid JSON" → parse with the existing ```json-fence-tolerant fallback → validate against a Zod schema → persist → record LLM usage via the quota service. No silent fallback to fake/templated data on error — the existing convention throws and lets the caller surface a real error state, which we must preserve (faking a fallback here would recreate the exact problem this project fixes).

## Scope

1. **Rewire `mock-interview.jsx`** to a real session-based state machine (create session → generate question → submit answer → show real score/feedback → next or complete → show real results).
2. **Upgrade `generateRubricScores()` / `generateFeedbackSummary()`** in `interview-prep.service.ts` to real LLM calls, following the `submitAnswer()` pattern.
3. **Add a Zod contract** in `@jobocate/contracts` for the per-answer feedback response (`{score, feedback}`) and the session-completion response (`{overallScore, rubricScores[], feedbackSummary}`), matching the existing `CoverLetterResponseSchema` convention, used for both backend validation and frontend types.
4. **New "session results" screen state** — doesn't exist today; the old flow silently reset on completion with no summary shown at all.
5. **Full visual rebuild** of both screens in a new "Performance Console" direction (approved via mockup): dark background, monospace/data-forward typography, live score meters, sharp green/amber/gold accent palette — deliberately distinct from the dashboard's dark+cream/Instrument Serif system, since this is a focused practice-session moment, not a dashboard view.

Out of scope for this pass: voice/audio answer input (stays text-only, existing textarea), a searchable/reusable cross-session question bank (questions remain ephemeral per-session, matching current backend design), the interview *hub* page (`/app/interview`) beyond linking into this flow.

## Architecture

### Frontend state machine (`mock-interview.jsx`)

Replace the current local-only `q`/`draft`/`goNext()` logic with a session-backed flow:

```
SETUP → (optional job/application picker, reusing existing getInterviewApplications())
  → createInterviewSession(jobId?, applicationId?, title?) → sessionId
LOOP:
  → generateInterviewQuestion(sessionId) → display question, loading state while awaiting
  → candidate types answer into existing textarea (draft state, unchanged)
  → on Submit: submitInterviewAnswer(sessionId, {question, answer: draft})
      → loading state on the "live coaching" panel while awaiting
      → on success: render real {score, feedback} in the live-coaching panel; enable "Next"
      → on error: show retryable error state in that panel, do not advance, do not fabricate feedback
  → on Next: clear draft, loop back to generate-question (unless question count hits session cap or candidate ends early)
COMPLETE:
  → completeInterviewSession(sessionId) → loading state
  → on success: transition to new Results view — overall score, 4-category rubric bars, written summary, "Practice again" / "Back to hub" actions
  → on error: retryable error state, session data is not lost (still persisted server-side, candidate can retry completion)
```

Question count per session: cap at 6 (matches the mockup's "Q03/06"), configurable via a constant, not hardcoded per-question like the old `QUESTION_BANK` — candidate can also end early via "End session," which calls `completeInterviewSession` on whatever was answered so far.

### Backend changes (`interview-prep.service.ts`)

- `buildRubricPrompt(session)`: new prompt builder, takes the full `session.questions[]` (each with question/answer/score/feedback already recorded from `submitAnswer` calls) and asks the LLM to return category-level scores. System prompt: `Return ONLY valid JSON: {"rubricScores": [{"category": "...", "score": 0-100, "feedback": "..."}]}` with 4 fixed categories (Clarity, STAR Structure, Job Fit, Conciseness — matching the mockup) sent as part of the prompt so the LLM scores consistently against the same rubric every time rather than inventing categories per session.
- `buildSummaryPrompt(session)`: new prompt builder, asks for a 2-3 sentence written summary of overall performance across the session. System prompt: `Return ONLY valid JSON: {"summary": "..."}`.
- Both follow `submitAnswer()`'s existing call shape: `getProviderForFeature(LLMFeature.INTERVIEW_SCORING)` (enum value already exists per the routing service, currently unused for this) → `provider.chat(...)` → JSON-fence-tolerant parse → Zod validation → on parse/validation error, log and rethrow (no silent fallback) → on success, persist to `session.rubricScores` / `session.feedbackSummary` and save.
- `completeInterviewSession()` calls both in sequence (or in parallel via `Promise.all` — no ordering dependency between rubric scores and summary) instead of calling the stub functions.
- Quota: same `quotaService.enforceQuota()` / `recordUsageAndIncrement()` calls as every other LLM feature in this service — two additional LLM calls per completed session (rubric + summary), on top of the N calls already made for question generation and answer scoring.

### Contracts

New Zod schemas in `@jobocate/contracts` (co-located with `CoverLetterResponseSchema`):
- `InterviewAnswerFeedbackSchema`: `{score: number (0-100), feedback: string}` — used by the existing `submitAnswer()` (currently unvalidated by a shared schema; this brings it in line with the cover-letter convention) and by the frontend response type.
- `InterviewRubricScoreSchema`: `{category: string, score: number (0-100), feedback: string}`, and `InterviewSessionCompletionSchema`: `{overallScore: number, rubricScores: InterviewRubricScoreSchema[], feedbackSummary: string}`.

### Visual design — "Performance Console"

Approved via mockup (see session's `.superpowers/brainstorm/` artifacts). Key elements:
- Palette: near-black background (`#0a0e0d`), muted green-gray secondary text (`#4f6b62`/`#7a978c`), bright green primary accent (`#4ee6a8`) for positive scores/primary actions, amber (`#e6c94e`) and orange (`#e08a4e`) for mid/low scores — a traffic-light gradient across the score range rather than a single accent color everywhere.
- Typography: monospace (`SF Mono`/`Consolas`) for metadata, timers, labels, and scores; system sans-serif for question text and body copy — the mix signals "instrument readout" for data, "conversation" for content.
- Practice screen: top bar (session title + End Session), segmented progress bar, question card, answer textarea, primary Submit + secondary Skip actions, live coaching panel with per-answer score meters (Clarity / STAR Fit) and written feedback below the meters.
- Results screen (new): large overall score number, four horizontal rubric bars color-coded by score band, written summary panel, "Practice Again" / "Back to Hub" actions.
- This direction is deliberately distinct from the dashboard's cream/serif system — a "focused instrument" feel rather than a "warm dashboard" feel, since practicing under a timer is a different emotional register than reviewing job matches.

## Error handling

- Every LLM-backed step (generate-question, submit-answer, rubric+summary at completion) can fail (quota exceeded, provider error, malformed JSON). Each has its own loading and retryable-error UI state — no step silently substitutes fake/templated content on failure, which is the exact anti-pattern this project removes.
- Network/session errors (e.g., session not found, ownership mismatch) surface as a clear error state directing the candidate back to the interview hub, not a blank screen.
- Quota-exceeded specifically should surface a distinct, actionable message (matches existing quota UX elsewhere in the app) rather than a generic error.

## Testing

- Backend: unit tests for `buildRubricPrompt`/`buildSummaryPrompt` + the upgraded `generateRubricScores`/`generateFeedbackSummary` using the existing `mock.provider.ts` test double (valid JSON case, malformed-JSON-with-fence case, provider-error case). Verify quota enforcement and Zod validation are exercised.
- Frontend: component-level tests for the new state machine (loading/error/success transitions per step) and a Playwright E2E extending the existing harness: start a session → answer a question → verify real score/feedback renders → complete → verify results screen renders real rubric data — asserting against actual (mocked-provider) backend responses, not frontend fixtures, so the test would fail if wiring regresses back to fake data.

## Non-goals

- Voice input, cross-session question reuse/search, changes to `/app/interview` hub navigation, changes to `/app/live-interview` (separate, already-real feature) — all explicitly out of scope for this pass.
