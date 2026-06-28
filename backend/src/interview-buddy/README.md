# Interview Buddy Module

## Overview

The Interview Buddy module provides practice interview sessions with three modes:
- **Practice Mode**: Mock interviews with mic capture + STT + coaching
- **Consent Mode**: Same as practice but requires explicit permission confirmation and shows visible on-screen indicator
- **Live Notes Mode**: No audio capture; user manually types interviewer questions

## Architecture

### Data Models

- **InterviewSession**: Session metadata, mode, status, context pack
- **InterviewTurn**: Individual turns (QUESTION, ANSWER, COACHING, SYSTEM)
- **InterviewScore**: Scoring results with rubric-based evaluation
- **PromptVersion**: Versioned prompt templates for coaching and scoring

### Services

1. **SessionContextBuilderService**: Builds immutable context packs from resume + JD + role
2. **CoachingService**: Generates structured coaching output with evidence anchoring
3. **ScoringService**: Scores answers using rubric-based evaluation
4. **InterviewBuddyService**: Main service orchestrating session lifecycle

### Providers

1. **STTProvider Interface**: Speech-to-text abstraction
   - **MockSTTProvider**: Mock implementation for development
   - **OpenAIWhisperBatchProvider**: OpenAI Whisper integration

2. **LLMProvider**: Uses existing LLM routing service
   - Configured via `LLM_INTERVIEW_COACHING_*` and `LLM_INTERVIEW_SCORING_*` env vars

## API Endpoints

### POST /api/interview-sessions
Create a new interview session.

**Body:**
```json
{
  "mode": "PRACTICE" | "CONSENT" | "LIVE_NOTES",
  "resumeVersionId": "uuid",
  "jobDescriptionIds": ["uuid1", "uuid2"],
  "roleTitle": "Software Engineer",
  "companyName": "Acme Corp",
  "roleFamily": "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA",
  "seniority": "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER",
  "interviewType": "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED",
  "skipRequirements": false
}
```

### POST /api/interview-sessions/:id/start
Start an interview session (changes status from CREATED to IN_PROGRESS).

### POST /api/interview-sessions/:id/live-notes
Add a live note (question) in Live Notes mode. Returns coaching output.

**Body:**
```json
{
  "questionText": "Tell me about yourself"
}
```

### POST /api/interview-sessions/:id/turns/:turnId/score
Score an answer turn using the rubric.

### GET /api/interview-sessions/:id
Get full session timeline (session + turns + scores).

### POST /api/interview-sessions/:id/end
End an interview session (changes status to COMPLETED).

### DELETE /api/interview-sessions/:id
Hard delete user-owned session data.

## Environment Variables

```env
# STT Provider
STT_PROVIDER=mock  # or "openai"
OPENAI_API_KEY=your_key  # Required for OpenAI Whisper

# LLM Configuration
LLM_DEFAULT_PROVIDER=openai
LLM_DEFAULT_MODEL=gpt-4o-mini

# Interview Coaching
LLM_INTERVIEW_COACHING_PROVIDER=openai
LLM_INTERVIEW_COACHING_MODEL=gpt-4o-mini
LLM_INTERVIEW_COACHING_TEMP=0.7
LLM_INTERVIEW_COACHING_MAX_TOKENS=2000

# Interview Scoring
LLM_INTERVIEW_SCORING_PROVIDER=openai
LLM_INTERVIEW_SCORING_MODEL=gpt-4o-mini
LLM_INTERVIEW_SCORING_TEMP=0.3
LLM_INTERVIEW_SCORING_MAX_TOKENS=2000
```

## Prompt Templates

Prompt templates are stored in the `PromptVersion` collection with keys:
- `INTERVIEW_COACHING_V1`: Coaching prompt template
- `INTERVIEW_SCORE_V1`: Scoring prompt template

If templates are not found in the database, default templates are used.

## Evidence Anchoring

The system prevents invented claims by:
1. Requiring `resumeAnchorsUsed[].evidence[]` in coaching output
2. Emitting `factCheck.items[]` with `NEEDS_USER_CONFIRMATION` when uncertain
3. Blocking if `hasBlockingIssues=true` when plan depends on unsupported claims

## Zod Validation

All LLM outputs are validated using Zod schemas from `@jobocate/contracts`:
- `CoachingOutputSchema`
- `ScoringOutputSchema`
- `SessionContextPackSchema`

## WebSocket Support (TODO)

WebSocket support for real-time audio streaming is not yet implemented. To add:
1. Install `@nestjs/websockets` and `socket.io`
2. Create a WebSocket gateway for `/interview-sessions/:id/audio-stream`
3. Handle audio chunks and stream to STT provider
4. Stream transcript segments back to client

## Quota Enforcement (TODO)

Quota enforcement for interview features should be added:
1. Check user's plan entitlements before creating session
2. Track usage per session (LLM calls, STT calls)
3. Enforce limits based on subscription plan

## Testing

Unit tests should cover:
- Quota enforcement
- Mode restrictions (no audio endpoints in Live Notes)
- Zod validation failures
- Basic e2e API tests for session lifecycle

