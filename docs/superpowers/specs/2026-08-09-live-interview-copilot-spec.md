# Live interview copilot

**Date:** 2026-08-09 · **Status:** approved design, not yet built
**Related:** [ATS compatibility checker](2026-08-09-ats-compatibility-checker-spec.md) · [résumé generator](2026-08-09-resume-generator-spec.md)

---

## Title

Real-time interview coaching: hear the interviewer's question and put grounded talking points in front of the candidate before they start answering.

## User Story

As a **candidate in a live interview**,
I want to **see relevant talking points from my own experience the moment a question is asked**,
so that **I answer with the strongest evidence I actually have, instead of remembering it afterwards.**

## Business Context

`/app/live-interview.jsx` is 1,156 lines and has **no microphone capture, no WebSocket client, and no streaming transcription.** Its "Live transcript" is a `useMemo` over turns fetched by REST — a replay view of a finished session, presented as a live one.

The pieces to build it are largely present and unused:

| Asset | State |
|---|---|
| `interview-buddy/gateways/interview-audio.gateway.ts` | Exists; no client connects to it |
| `socket.io-client` in `frontend/package.json` | Declared; imported nowhere |
| `interview-buddy/services/coaching.service.ts` | Exists, genuinely LLM-backed |
| `session-context-builder.service.ts` | Builds context packs from résumé + JD + role |
| `providers/openai-whisper.provider.ts` | Streaming is an explicit placeholder that falls back to batch |
| `interview-buddy.controller.ts` | Exposes 3 routes (`applications`, `resumes`, `chat`) — its own README documents session endpoints that were never added |

There are also **two competing interview engines**: `job-tracker/interview-sessions` (simpler, LLM-backed, what the frontend actually uses for practice) and `interview-buddy` (richer — context packs, rubric scoring, prompt versioning, the audio gateway — but nearly unrouted). This spec consolidates the live path onto `interview-buddy`, because that is where the coaching engine and audio transport already live.

Competitively, this is the category Final Round AI won. Their differentiator is a *Stealth Mode* explicitly designed to be invisible during screen share. **Jobocate is not building that.** It is irreconcilable with the "candidate-in-control, transparent, no fabrication" position in `docs/product/parity-gaps-spec.md`, and it is what interview platforms are building detection against. This product competes on preparation quality, not on concealment.

## Acceptance Criteria

1. **Given** a candidate starts a live session and shares their meeting tab,
   **When** the interviewer speaks,
   **Then** a partial transcript of the interviewer's speech appears within **400ms** of the words being spoken.

2. **Given** the interviewer finishes asking a question,
   **When** question detection fires,
   **Then** the first coaching token is rendered within **1.5 seconds** of the question ending.

3. **Given** a session is running,
   **When** the candidate looks at the screen,
   **Then** a visible recording-active indicator is present for the entire duration and cannot be dismissed while capture is live.

4. **Given** a session ends, crashes, or the tab is closed,
   **When** the server-side session is torn down,
   **Then** no raw audio exists in any store — audio is transcribed in flight and its buffers dropped.

5. **Given** a candidate has not completed the consent acknowledgement,
   **When** they attempt to start a live session,
   **Then** capture does not begin and they are shown the consent step.

6. **Given** the candidate has not opted into transcript retention,
   **When** the session ends,
   **Then** the transcript is discarded and only session metadata (duration, question count) is retained.

7. **Given** coaching output for a question,
   **When** the candidate reads it,
   **Then** every claim about their background is traceable to their résumé or profile — the copilot does not invent experience for them to claim.

8. **Given** the candidate's own microphone is also connected,
   **When** both parties speak,
   **Then** turns are attributed correctly (tab audio = interviewer, mic = candidate) without relying on speaker diarisation.

9. **Given** the STT vendor connection drops mid-session,
   **When** the failure occurs,
   **Then** the candidate is told transcription has stopped, and the session continues in a degraded manual-notes mode rather than silently appearing to work.

10. **Given** a candidate in a two-party-consent jurisdiction,
    **When** they reach the consent step,
    **Then** they are shown the jurisdiction notice and a disclosure script they can read to the interviewer.

## Business Rules

- **Raw audio is never persisted.** Transcription happens in flight; buffers are dropped immediately. This is architectural, not a retention policy — there is no store to leak from.
- **Transcripts persist only on explicit opt-in**, default off, per session.
- A live session requires `CONSENT` mode: an explicit pre-session acknowledgement plus a visible indicator for the whole session. The mode already exists in the data model; this makes it mandatory for live capture.
- **No stealth.** Nothing is built to evade screen-share visibility, meeting-platform detection, or proctoring. Any request to add it is out of scope by design, not by omission.
- Coaching is **grounded**: it surfaces the candidate's own experience and the role's requirements. It never fabricates experience, employers, or metrics — the same rule the answer engine and the résumé generator hold.
- The copilot **suggests, never scripts**. Output is talking points and evidence, not sentences to read aloud.
- Latency is a correctness property, not a nice-to-have. Coaching arriving after the candidate has begun answering is worse than none, because it competes for attention mid-sentence.
- The candidate can pause or stop capture at any moment, and stopping is immediate.

## Technical Notes

**API / service impacted**
- **Client** (`/app/live-interview.jsx`, rewritten): `navigator.mediaDevices.getDisplayMedia({ audio: true })` for the meeting tab; optional `getUserMedia` for the candidate's mic. An `AudioWorklet` downsamples to 16kHz mono PCM frames (~100ms), streamed over `socket.io-client` — the dependency that is already installed and unused.
- **Gateway** (`interview-audio.gateway.ts`): accepts PCM frames per session, relays to the STT vendor socket, emits `transcript.partial` / `transcript.final` back. Fix the event-name mismatch noted in the production roadmap (`audio_chunk` vs `audio-chunk`) — the gateway and any client must agree.
- **New `StreamingSttProvider`** implementing the existing `STTProvider` interface against a streaming vendor. The existing `OpenAIWhisperBatchProvider` remains for non-live batch use; it is not on this path.
- **New `TurnDetectorService`**: end-of-question detection from final segments plus a silence threshold, with an interrogative-form check.
- **`CoachingService`** (exists) is invoked per detected question with the session context pack; responses stream to the client token by token.
- **`interview-buddy.controller.ts`**: add the session lifecycle routes its README already documents (`POST /`, `POST /:id/start`, `POST /:id/live-notes`, `POST /:id/complete`).

**Database changes**
- `InterviewSession`: add `consentAcknowledgedAt`, `retainTranscript` (default `false`), `captureMode`.
- `InterviewTurn` already models QUESTION / ANSWER / COACHING turns — reuse it; write turns only when `retainTranscript` is set.
- No audio table. Deliberately.

**External systems**
- A streaming STT vendor (Deepgram or AssemblyAI) over WebSocket. New account, new key, new line item: roughly $0.005–0.01/min, about $0.50 for a one-hour interview.
- LLM provider via the existing `llm/` stack for coaching.
- Meeting platforms are **not** integrated with. Audio arrives via the browser's own tab-share; nothing hooks Zoom/Meet/Teams APIs or clients.

**Security considerations**
- Second-party audio makes this the most legally sensitive feature in the product. In two-party-consent jurisdictions (California, Illinois, Washington, Pennsylvania, Florida among them), recording without both parties' consent is unlawful. Not persisting audio materially reduces exposure but does not eliminate it; the consent step, the jurisdiction notice and the disclosure script are part of the feature, not the marketing.
- The audio socket must be authenticated per session and authorised to the owning candidate — an unauthenticated socket accepting frames would be an open transcription relay.
- Transcripts are highly sensitive personal data. Encrypt at rest when retained, and honour deletion.
- Send the STT vendor audio only; never résumé content or PII.
- Rate-limit session creation: each one opens a paid vendor socket.

**Performance considerations**
- Budget, end to end: audio frame → partial transcript **≤400ms**; question detected **≤300ms** after speech ends; first coaching token **≤1.5s**. Total under two seconds or the feature does not work as designed.
- Coaching must stream. Waiting for a complete response spends the entire budget before the first word.
- Cap concurrent live sessions per instance; each holds two sockets plus an LLM stream.
- The context pack is built once at session start, not per question.
- Frames are ~100ms to balance transport overhead against latency.

## Dependencies

- Streaming STT vendor account and key (**blocking** — nothing works without it).
- A funded LLM key. `ANTHROPIC_API_KEY` is currently empty and `LLM_DEFAULT_MODEL` is a free OpenRouter model; coaching quality and latency both depend on fixing that.
- `interview-buddy` session endpoints (in this spec).
- Legal review of the consent copy and jurisdiction notice before launch.
- HTTPS with valid certificates — `getDisplayMedia` requires a secure context.

## Out of Scope

- **Stealth mode, screen-share evasion, or proctoring avoidance of any kind.**
- Native desktop capture (Zoom/Teams desktop clients) — tab audio only for v1.
- Speaker diarisation — turn attribution comes from separate tracks instead.
- Real-time coaching in languages other than English.
- Automatic answer delivery, TTS, or anything that speaks for the candidate.
- Retiring `job-tracker/interview-sessions` — practice mode continues to run there; only the live path consolidates onto `interview-buddy`.
- Interviewer-side or employer-side features.

## Definition of Done

- Code completed and reviewed
- Unit/integration tests completed
- Acceptance criteria validated
- Security checks completed
- Documentation updated
- Deployed to required environment
