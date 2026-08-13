# Mock Interview: Real AI Feedback Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/app/mock-interview`'s hardcoded question bank and discarded answers with the real, already-built LLM session backend (`job-tracker/interview-prep.service.ts`), add real per-category rubric scoring at session end, and redesign the page in the approved "Performance Console" visual direction.

**Architecture:** The backend already exposes a working LLM-backed session API (`POST/GET job-tracker/interview-sessions...`); the frontend simply never calls it. This plan adds Zod response validation to the existing per-answer scoring call, upgrades two stub methods (`generateRubricScores`, `generateFeedbackSummary`) to real LLM calls following the identical pattern already used elsewhere in this service, and fully rewires + restyles the frontend page against the real API.

**Tech Stack:** NestJS + Mongoose (backend), Next.js pages router + inline-styled React (frontend), Zod contracts shared via `@jobocate/contracts` (tsup-built workspace package), Jest (backend unit tests), Playwright (E2E, `e2e/` workspace package).

**Spec:** `docs/superpowers/specs/2026-08-12-mock-interview-ai-feedback-design.md`

## Global Constraints

- No silent fallback to fake/templated data on any LLM error — every failure path throws and the caller surfaces a real error state. This is the exact anti-pattern this project removes; do not reintroduce it anywhere in this plan.
- Follow the existing per-feature LLM call pattern exactly: `quotaService.enforceQuota(userId, feature)` → `routingService.getProviderForFeature(feature)` / `getFeatureConfig(feature)` → `provider.chat({...})` with a system prompt demanding "Return ONLY valid JSON: ..." → parse with the JSON-fence-tolerant fallback already used in this file → validate with a Zod schema from `@jobocate/contracts` → `quotaService.recordUsageAndIncrement(...)`.
- Frontend styling: this codebase's candidate pages use hand-rolled inline styles + `styled-jsx` (confirmed by reading `mock-interview.jsx` and its siblings), not Tailwind/Catalyst. Follow that established convention for this page — introducing a different styling system on one page would break consistency with every sibling page in `frontend/src/pages/app/`.
- After editing `packages/contracts/src/schemas/llm/index.ts`, the package must be rebuilt (`pnpm --filter @jobocate/contracts build`) before the backend can import the new exports — the backend's `tsconfig.json` maps `@jobocate/contracts` to `packages/contracts/dist`, not `src`.
- This environment has a hosted LiteLLM gateway available, so manual/E2E verification will hit real (non-mock) model output, not the deterministic `MockProvider` fallback — expect real but non-deterministic question/feedback text during manual testing.

---

### Task 1: Add Zod contracts for interview answer feedback, rubric scores, and session summary

**Files:**
- Modify: `packages/contracts/src/schemas/llm/index.ts` (append after the existing `RecruiterScorecardResponse` types at the end of the file)

**Interfaces:**
- Produces: `InterviewAnswerFeedbackSchema` / `InterviewAnswerFeedback` — `{score: number, feedback: string}`, used by Task 2.
- Produces: `InterviewRubricScoreSchema` / `InterviewRubricScore` — `{category: string, score: number, feedback: string}`, and `InterviewRubricResponseSchema` / `InterviewRubricResponse` — `{rubricScores: InterviewRubricScore[]}`, used by Task 3.
- Produces: `InterviewSummaryResponseSchema` / `InterviewSummaryResponse` — `{summary: string}`, used by Task 3.

- [ ] **Step 1: Append the new schemas**

Add to the end of `packages/contracts/src/schemas/llm/index.ts`:

```ts
/**
 * Mock Interview Schemas (job-tracker interview-prep feature)
 *
 * Validate the raw LLM output for the candidate mock-interview practice loop:
 * per-answer scoring, end-of-session rubric breakdown, and end-of-session
 * summary. Mirror the `CoverLetterResponseSchema` convention above — these
 * validate the model's own JSON, not the enriched Mongoose document shape.
 */
export const InterviewAnswerFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
});

export type InterviewAnswerFeedback = z.infer<typeof InterviewAnswerFeedbackSchema>;

export const InterviewRubricScoreSchema = z.object({
  category: z.string(),
  score: z.number().min(0).max(100),
  feedback: z.string(),
});

export const InterviewRubricResponseSchema = z.object({
  rubricScores: z.array(InterviewRubricScoreSchema).min(1),
});

export type InterviewRubricScore = z.infer<typeof InterviewRubricScoreSchema>;
export type InterviewRubricResponse = z.infer<typeof InterviewRubricResponseSchema>;

export const InterviewSummaryResponseSchema = z.object({
  summary: z.string(),
});

export type InterviewSummaryResponse = z.infer<typeof InterviewSummaryResponseSchema>;
```

- [ ] **Step 2: Typecheck the package**

Run: `pnpm --filter @jobocate/contracts typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Build the package**

Run: `pnpm --filter @jobocate/contracts build`
Expected: exits 0; `packages/contracts/dist/index.js`, `.mjs`, and `.d.ts` are regenerated (check `dist/index.d.ts` now contains `InterviewAnswerFeedbackSchema`).

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/src/schemas/llm/index.ts packages/contracts/dist
git commit -m "feat(contracts): add mock-interview feedback/rubric/summary schemas"
```

---

### Task 2: Validate `submitAnswer`'s LLM response with the new Zod schema

**Files:**
- Modify: `backend/src/job-tracker/interview-prep.service.ts:1-15` (imports), `:179-222` (`submitAnswer`'s parse block and catch)
- Create: `backend/src/job-tracker/interview-prep.service.spec.ts`

**Interfaces:**
- Consumes: `InterviewAnswerFeedbackSchema` from Task 1 (`@jobocate/contracts`).
- Produces: `submitAnswer(sessionId: string, userId: string, question: string, answer: string): Promise<{score: number; feedback: string}>` — return shape unchanged, now backed by real validation. Task 4 (frontend) consumes this via `submitInterviewAnswer(id, {question, answer})`.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/job-tracker/interview-prep.service.spec.ts`:

```ts
import { InterviewPrepService } from './interview-prep.service';
import { LLMFeature } from '../llm/llm-routing.service';
import { MockInterviewStatus } from '../schemas/mock-interview-session.schema';

/**
 * The mock-interview page previously discarded the candidate's answer
 * without scoring it at all. These tests pin the real scoring contract: the
 * LLM's JSON response is validated, not trusted blind, and a malformed
 * response fails loudly instead of silently returning undefined score/feedback.
 */
describe('InterviewPrepService', () => {
  const buildService = (chatResponse: any) => {
    const chat = jest.fn().mockResolvedValue(chatResponse);
    const provider = { getName: () => 'mock', chat };
    const routingService: any = {
      getProviderForFeature: jest.fn().mockReturnValue(provider),
      getFeatureConfig: jest.fn().mockReturnValue({
        model: 'test-model',
        temperature: 0.3,
        maxTokens: 500,
      }),
    };
    const quotaService: any = {
      enforceQuota: jest.fn(),
      recordUsageAndIncrement: jest.fn(),
    };

    const session: any = {
      _id: 'session-1',
      userId: 'user-1',
      jobId: undefined,
      status: MockInterviewStatus.IN_PROGRESS,
      questions: [],
      overallScore: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };

    const interviewSessionModel: any = {
      findOne: jest.fn().mockResolvedValue(session),
    };
    const storyBankModel: any = {};
    const jobModel: any = { findById: jest.fn().mockResolvedValue(null) };

    const service = new InterviewPrepService(
      interviewSessionModel,
      storyBankModel,
      jobModel,
      routingService,
      quotaService,
    );

    return { service, chat, routingService, quotaService, session };
  };

  describe('submitAnswer', () => {
    it('routes to the MOCK_INTERVIEW feature and returns the validated score/feedback', async () => {
      const { service, routingService } = buildService({
        content: JSON.stringify({ score: 82, feedback: 'Strong structure, clear outcome.' }),
        usage: {},
      });

      const result = await service.submitAnswer('session-1', 'user-1', 'Q?', 'A.');

      expect(routingService.getProviderForFeature).toHaveBeenCalledWith(LLMFeature.MOCK_INTERVIEW);
      expect(result).toEqual({ score: 82, feedback: 'Strong structure, clear outcome.' });
    });

    it('persists the validated score/feedback onto the session and saves it', async () => {
      const { service, session } = buildService({
        content: JSON.stringify({ score: 60, feedback: 'Could be more concise.' }),
        usage: {},
      });

      await service.submitAnswer('session-1', 'user-1', 'Q?', 'A.');

      expect(session.questions).toHaveLength(1);
      expect(session.questions[0]).toMatchObject({
        question: 'Q?',
        answer: 'A.',
        score: 60,
        feedback: 'Could be more concise.',
      });
      expect(session.save).toHaveBeenCalled();
    });

    it('recovers JSON wrapped in a markdown code fence', async () => {
      const { service } = buildService({
        content: '```json\n' + JSON.stringify({ score: 75, feedback: 'Good.' }) + '\n```',
        usage: {},
      });

      const result = await service.submitAnswer('session-1', 'user-1', 'Q?', 'A.');

      expect(result).toEqual({ score: 75, feedback: 'Good.' });
    });

    it('rejects a response missing a required field rather than returning it half-formed', async () => {
      const { service } = buildService({
        content: JSON.stringify({ feedback: 'Only feedback, no score.' }),
        usage: {},
      });

      await expect(
        service.submitAnswer('session-1', 'user-1', 'Q?', 'A.'),
      ).rejects.toThrow(/Invalid feedback response format/);
    });

    it('meters usage against MOCK_INTERVIEW with the session id', async () => {
      const { service, quotaService } = buildService({
        content: JSON.stringify({ score: 82, feedback: 'Good.' }),
        usage: { promptTokens: 5, completionTokens: 10 },
      });

      await service.submitAnswer('session-1', 'user-1', 'Q?', 'A.');

      expect(quotaService.recordUsageAndIncrement).toHaveBeenCalledWith(
        'user-1',
        LLMFeature.MOCK_INTERVIEW,
        'mock',
        'test-model',
        { promptTokens: 5, completionTokens: 10 },
        { sessionId: 'session-1' },
      );
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/job-tracker/interview-prep.service.spec.ts -t "rejects a response missing a required field" -v`
Expected: FAIL — `submitAnswer` currently returns `{score: undefined, feedback: 'Only feedback, no score.'}` instead of throwing, so this assertion fails. (The other tests in the file should currently PASS unchanged since `submitAnswer`'s happy path already works — only the validation-failure test is new behavior.)

- [ ] **Step 3: Add the Zod validation to `submitAnswer`**

In `backend/src/job-tracker/interview-prep.service.ts`, add these imports after the existing `LLMQuotaService` import (around line 14):

```ts
import { z } from 'zod';
import { InterviewAnswerFeedbackSchema } from '@jobocate/contracts';
```

Replace the body of `submitAnswer`'s try block (the section from `let parsed: any;` through the end of the method, i.e. lines ~179-222) with:

```ts
      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (error) {
        const jsonMatch =
          response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      const validated = InterviewAnswerFeedbackSchema.parse(parsed);

      // Add question and answer to session
      const interviewQuestion: InterviewQuestion = {
        question,
        answer,
        score: validated.score,
        feedback: validated.feedback,
        timestamp: new Date(),
      };

      session.questions.push(interviewQuestion);
      await session.save();

      // Record usage
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.MOCK_INTERVIEW,
        provider.getName(),
        config.model,
        response.usage,
        { sessionId },
      );

      return {
        score: validated.score,
        feedback: validated.feedback,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.logger.error('Zod validation error evaluating answer:', error.errors);
        throw new Error(
          `Invalid feedback response format from LLM: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.logger.error('Error evaluating answer:', error);
      throw error;
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/job-tracker/interview-prep.service.spec.ts -v`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Run the full backend suite to confirm no regressions**

Run: `cd backend && npx jest -v`
Expected: PASS, same or higher total than the prior 839 tests (no failures introduced).

- [ ] **Step 6: Commit**

```bash
git add backend/src/job-tracker/interview-prep.service.ts backend/src/job-tracker/interview-prep.service.spec.ts
git commit -m "feat(job-tracker): validate mock-interview answer scoring against a Zod schema"
```

---

### Task 3: Real LLM-generated rubric scores and session summary

**Files:**
- Modify: `backend/src/job-tracker/interview-prep.service.ts` (imports; new `RUBRIC_CATEGORIES` constant; `completeInterviewSession`; replace `generateRubricScores` and `generateFeedbackSummary`; add `buildRubricPrompt` and `buildSummaryPrompt`)
- Modify: `backend/src/job-tracker/interview-prep.service.spec.ts` (append new `describe` blocks)

**Interfaces:**
- Consumes: `InterviewRubricResponseSchema`, `InterviewSummaryResponseSchema` from Task 1.
- Produces: `completeInterviewSession(sessionId: string, userId: string): Promise<MockInterviewSessionDocument>` — same signature as before, now returns a document whose `rubricScores` and `feedbackSummary` are real. Task 4 (frontend) consumes this via `completeInterviewSession(id)` and reads `overallScore`, `rubricScores: [{category, score, feedback}]`, `feedbackSummary` off the result.

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/job-tracker/interview-prep.service.spec.ts` (inside the existing top-level `describe('InterviewPrepService', ...)` block, after the `submitAnswer` describe block, before its closing `});`):

```ts
  /**
   * generateRubricScores and generateFeedbackSummary now run concurrently
   * inside completeInterviewSession (Promise.all), so their two chat() calls
   * are not guaranteed to happen in a fixed order — the mock branches on the
   * system prompt's content instead of relying on call order.
   */
  const mockChatByPromptContent = (chat, responses) => {
    chat.mockImplementation((options) => {
      const systemContent = options.messages[0].content;
      for (const [marker, response] of responses) {
        if (systemContent.includes(marker)) return Promise.resolve(response);
      }
      return Promise.resolve({ content: '{}', usage: {} });
    });
  };

  describe('generateRubricScores (via completeInterviewSession)', () => {
    it('calls the LLM and returns validated per-category scores for an answered session', async () => {
      const rubricScores = [
        { category: 'Clarity', score: 80, feedback: 'Clear structure throughout.' },
        { category: 'STAR Structure', score: 70, feedback: 'Missing a concrete result once.' },
        { category: 'Job Fit', score: 90, feedback: 'Directly relevant experience.' },
        { category: 'Conciseness', score: 60, feedback: 'Two answers ran long.' },
      ];
      const { service, session, chat } = buildService({
        content: JSON.stringify({ score: 82, feedback: 'Good.' }),
        usage: {},
      });
      session.questions = [
        { question: 'Q1', answer: 'A1', score: 82, feedback: 'Good.', timestamp: new Date() },
      ];
      mockChatByPromptContent(chat, [
        ['rubricScores', { content: JSON.stringify({ rubricScores }), usage: {} }],
        ['"summary"', { content: JSON.stringify({ summary: 'Solid overall performance.' }), usage: {} }],
      ]);

      const completed = await service.completeInterviewSession('session-1', 'user-1');

      expect(completed.rubricScores).toEqual(rubricScores);
    });

    it('skips the LLM call and returns zero scores when no questions were answered', async () => {
      const { service, session, chat } = buildService({ content: '{}', usage: {} });
      session.questions = [];

      const completed = await service.completeInterviewSession('session-1', 'user-1');

      expect(completed.rubricScores).toEqual([
        { category: 'Clarity', score: 0, feedback: 'No questions answered yet.' },
        { category: 'STAR Structure', score: 0, feedback: 'No questions answered yet.' },
        { category: 'Job Fit', score: 0, feedback: 'No questions answered yet.' },
        { category: 'Conciseness', score: 0, feedback: 'No questions answered yet.' },
      ]);
      expect(chat).not.toHaveBeenCalled();
    });

    it('rejects a malformed rubric response rather than returning an empty breakdown', async () => {
      const { service, session, chat } = buildService({ content: '{}', usage: {} });
      session.questions = [
        { question: 'Q1', answer: 'A1', score: 82, feedback: 'Good.', timestamp: new Date() },
      ];
      // Summary gets a valid response so only the rubric call is the reason
      // completeInterviewSession rejects — isolates which call failed.
      mockChatByPromptContent(chat, [
        ['rubricScores', { content: JSON.stringify({ notRubricScores: [] }), usage: {} }],
        ['"summary"', { content: JSON.stringify({ summary: 'Fine.' }), usage: {} }],
      ]);

      await expect(
        service.completeInterviewSession('session-1', 'user-1'),
      ).rejects.toThrow(/Invalid rubric response format/);
    });
  });

  describe('generateFeedbackSummary (via completeInterviewSession)', () => {
    it('calls the LLM and returns a validated written summary for an answered session', async () => {
      const rubricScores = [{ category: 'Clarity', score: 80, feedback: 'Good.' }];
      const { service, session, chat } = buildService({ content: '{}', usage: {} });
      session.questions = [
        { question: 'Q1', answer: 'A1', score: 82, feedback: 'Good.', timestamp: new Date() },
      ];
      mockChatByPromptContent(chat, [
        ['rubricScores', { content: JSON.stringify({ rubricScores }), usage: {} }],
        ['"summary"', { content: JSON.stringify({ summary: 'Consistently structured, tighten conciseness.' }), usage: {} }],
      ]);

      const completed = await service.completeInterviewSession('session-1', 'user-1');

      expect(completed.feedbackSummary).toBe('Consistently structured, tighten conciseness.');
    });

    it('skips the LLM call and returns a static message when no questions were answered', async () => {
      const { service, session, chat } = buildService({ content: '{}', usage: {} });
      session.questions = [];

      const completed = await service.completeInterviewSession('session-1', 'user-1');

      expect(completed.feedbackSummary).toBe('No questions answered yet.');
      expect(chat).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && npx jest src/job-tracker/interview-prep.service.spec.ts -v`
Expected: the new `generateRubricScores`/`generateFeedbackSummary` tests FAIL (current stub returns 4 categories all copying `overallScore`, and a templated summary string — neither matches the mocked LLM responses above, and the malformed-response test doesn't throw since the stub never calls the LLM at all).

- [ ] **Step 3: Implement the real rubric/summary generation**

In `backend/src/job-tracker/interview-prep.service.ts`, add this constant after the imports (before the `@Injectable()` class):

```ts
const RUBRIC_CATEGORIES = ['Clarity', 'STAR Structure', 'Job Fit', 'Conciseness'];
```

Add these imports alongside the ones from Task 2 (same import line, extend it):

```ts
import {
  InterviewAnswerFeedbackSchema,
  InterviewRubricResponseSchema,
  InterviewSummaryResponseSchema,
} from '@jobocate/contracts';
```

Replace `completeInterviewSession`'s two sequential calls (the `// Generate rubric scores` / `// Generate feedback summary` block, ~lines 250-254) with:

```ts
    // Generate rubric scores and feedback summary concurrently — independent
    // LLM calls with no ordering dependency between them.
    const [rubricScores, feedbackSummary] = await Promise.all([
      this.generateRubricScores(session, userId),
      this.generateFeedbackSummary(session, userId),
    ]);
```

Replace the entire `generateRubricScores` method body (~lines 274-293) with:

```ts
  /**
   * Generate rubric scores
   */
  private async generateRubricScores(
    session: MockInterviewSessionDocument,
    userId: string,
  ): Promise<RubricScore[]> {
    if (session.questions.length === 0) {
      return RUBRIC_CATEGORIES.map((category) => ({
        category,
        score: 0,
        feedback: 'No questions answered yet.',
      }));
    }

    await this.quotaService.enforceQuota(userId, LLMFeature.MOCK_INTERVIEW);

    const provider = this.llmRoutingService.getProviderForFeature(LLMFeature.MOCK_INTERVIEW);
    const config = this.llmRoutingService.getFeatureConfig(LLMFeature.MOCK_INTERVIEW);

    let job: JobDocument | null = null;
    if (session.jobId) {
      job = await this.jobModel.findById(session.jobId);
    }

    const prompt = this.buildRubricPrompt(session, job);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are an experienced interviewer scoring a completed mock interview session. Return ONLY valid JSON: {"rubricScores": [{"category": "...", "score": 0-100, "feedback": "..."}]}. Include exactly these categories, in this order: ${RUBRIC_CATEGORIES.join(', ')}.`,
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (error) {
        const jsonMatch =
          response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      const validated = InterviewRubricResponseSchema.parse(parsed);

      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.MOCK_INTERVIEW,
        provider.getName(),
        config.model,
        response.usage,
        { sessionId: (session._id as any).toString() },
      );

      return validated.rubricScores;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.logger.error('Zod validation error scoring rubric:', error.errors);
        throw new Error(
          `Invalid rubric response format from LLM: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.logger.error('Error generating rubric scores:', error);
      throw error;
    }
  }
```

Replace the entire `generateFeedbackSummary` method body (~lines 298-326) with:

```ts
  /**
   * Generate feedback summary
   */
  private async generateFeedbackSummary(
    session: MockInterviewSessionDocument,
    userId: string,
  ): Promise<string> {
    if (session.questions.length === 0) {
      return 'No questions answered yet.';
    }

    await this.quotaService.enforceQuota(userId, LLMFeature.MOCK_INTERVIEW);

    const provider = this.llmRoutingService.getProviderForFeature(LLMFeature.MOCK_INTERVIEW);
    const config = this.llmRoutingService.getFeatureConfig(LLMFeature.MOCK_INTERVIEW);

    let job: JobDocument | null = null;
    if (session.jobId) {
      job = await this.jobModel.findById(session.jobId);
    }

    const prompt = this.buildSummaryPrompt(session, job);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are an experienced interviewer writing a closing summary for a mock interview session. Return ONLY valid JSON: {"summary": "..."}',
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (error) {
        const jsonMatch =
          response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      const validated = InterviewSummaryResponseSchema.parse(parsed);

      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.MOCK_INTERVIEW,
        provider.getName(),
        config.model,
        response.usage,
        { sessionId: (session._id as any).toString() },
      );

      return validated.summary;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.logger.error('Zod validation error summarizing session:', error.errors);
        throw new Error(
          `Invalid summary response format from LLM: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.logger.error('Error generating feedback summary:', error);
      throw error;
    }
  }
```

Add these two new private methods directly after `buildFeedbackPrompt` (after ~line 374, before `getInterviewSessions`):

```ts
  /**
   * Build rubric-scoring prompt
   */
  private buildRubricPrompt(
    session: MockInterviewSessionDocument,
    job: JobDocument | null,
  ): string {
    let prompt = `Review this full mock interview session and score the candidate against exactly these ${RUBRIC_CATEGORIES.length} categories: ${RUBRIC_CATEGORIES.join(', ')}.\n\n`;

    if (job) {
      prompt += `Position: ${job.title} at ${job.companyName}\n\n`;
    }

    prompt += `Questions and answers:\n`;
    session.questions.forEach((q, i) => {
      prompt += `${i + 1}. Q: ${q.question}\n   A: ${q.answer || '(no answer given)'}\n   Per-answer score: ${q.score ?? 'n/a'}/100\n`;
    });

    prompt += `\nFor each of the ${RUBRIC_CATEGORIES.length} categories, give a 0-100 score and one sentence of specific feedback grounded in the answers above.`;

    return prompt;
  }

  /**
   * Build session-summary prompt
   */
  private buildSummaryPrompt(
    session: MockInterviewSessionDocument,
    job: JobDocument | null,
  ): string {
    let prompt = `Write a 2-3 sentence performance summary for this mock interview session.\n\n`;

    if (job) {
      prompt += `Position: ${job.title} at ${job.companyName}\n\n`;
    }

    prompt += `Questions and answers:\n`;
    session.questions.forEach((q, i) => {
      prompt += `${i + 1}. Q: ${q.question}\n   A: ${q.answer || '(no answer given)'}\n   Score: ${q.score ?? 'n/a'}/100\n   Feedback given: ${q.feedback || 'n/a'}\n`;
    });

    prompt += `\nSummarize overall strengths and the single most important area to improve. Be specific and reference the actual answers, not generic advice.`;

    return prompt;
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && npx jest src/job-tracker/interview-prep.service.spec.ts -v`
Expected: PASS, all tests green (Task 2's 5 + Task 3's 5 = 10 tests).

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && npx jest -v`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add backend/src/job-tracker/interview-prep.service.ts backend/src/job-tracker/interview-prep.service.spec.ts
git commit -m "feat(job-tracker): generate real LLM rubric scores and session summary at completion"
```

---

### Task 4: Rewire the mock-interview page to the real session API and Performance Console redesign

**Files:**
- Modify: `frontend/src/pages/app/mock-interview.jsx` (full rewrite)

**Interfaces:**
- Consumes: `getInterviewApplications()`, `createInterviewSession({jobId, applicationId, title})`, `generateInterviewQuestion(sessionId)`, `submitInterviewAnswer(sessionId, {question, answer})`, `completeInterviewSession(sessionId)` from `frontend/src/services/interviewApi.js` (all pre-existing, unmodified).
- `generateInterviewQuestion(id)` resolves to a plain string (the backend controller returns `Promise<string>` directly — not `{question: ...}`).
- `submitInterviewAnswer(id, {question, answer})` resolves to `{score: number, feedback: string}` (Task 2).
- `completeInterviewSession(id)` resolves to the full session document: `{overallScore: number, rubricScores: [{category, score, feedback}], feedbackSummary: string, ...}` (Task 3).

**Note — deviation from the approved mockup:** the mockup's per-question "live coaching" panel showed two meters (Clarity, STAR Fit). The real `submitInterviewAnswer` response only carries a single `{score, feedback}` pair per answer — the 4-category breakdown only exists at session completion. Showing two meters from one real number would mean fabricating a split that isn't real, which is exactly the anti-pattern this project removes. This task renders **one** real score meter per answer instead; the full 4-category breakdown appears on the results screen exactly as mocked, where the real data supports it.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `frontend/src/pages/app/mock-interview.jsx` with:

```jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import {
  getInterviewApplications,
  createInterviewSession,
  generateInterviewQuestion,
  submitInterviewAnswer,
  completeInterviewSession,
} from '@/services/interviewApi';

const QUESTION_CAP = 6;

const fmtTime = (elapsed) => {
  const mm = Math.floor(elapsed / 60);
  const ss = elapsed % 60;
  return `${mm}:${ss < 10 ? '0' + ss : ss}`;
};

const scoreColor = (score) => {
  if (score >= 75) return '#4EE6A8';
  if (score >= 50) return '#E6C94E';
  return '#E08A4E';
};

function ScoreMeter({ label, score }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--jb-font-mono)',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#4F6B62',
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span>{score}</span>
      </div>
      <div style={{ height: 5, background: '#1C2B26', borderRadius: 3 }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            height: '100%',
            background: scoreColor(score),
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

function LoadingPanel({ label }) {
  return (
    <div
      style={{
        background: '#0F1614',
        border: '1px solid #1C2B26',
        borderRadius: 10,
        padding: 40,
        textAlign: 'center',
        color: '#7A978C',
        fontSize: 13.5,
      }}
    >
      {label}
    </div>
  );
}

function ErrorPanel({ message, onRetry, retryLabel }) {
  return (
    <div
      style={{
        background: '#1A0F0F',
        border: '1px solid #3D2020',
        borderRadius: 10,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 13.5, color: '#E0A89E', marginBottom: 14 }}>{message}</div>
      <button
        onClick={onRetry}
        style={{
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 700,
          color: '#0A0E0D',
          background: '#4EE6A8',
          border: 'none',
          borderRadius: 5,
          padding: '9px 16px',
          cursor: 'pointer',
        }}
      >
        {retryLabel}
      </button>
    </div>
  );
}

export default function AppMockInterview() {
  const { user } = useAuth();

  const [role, setRole] = useState({ title: '', company: '', jobId: undefined, applicationId: undefined });
  const [phase, setPhase] = useState('loading'); // loading | answering | submitting | feedback-ready | loading-question | completing | complete | error | complete-error
  const [errorMessage, setErrorMessage] = useState('');

  const [session, setSession] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [draft, setDraft] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const ivRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    ivRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(ivRef.current);
  }, []);

  useEffect(() => {
    if (phase === 'complete' || phase === 'error') clearInterval(ivRef.current);
  }, [phase]);

  const startSession = async (roleContext) => {
    setPhase('loading');
    setErrorMessage('');
    setSession(null);
    setResults(null);
    setLastFeedback(null);
    setDraft('');
    setQuestionNumber(0);

    const jobId = roleContext?.jobId;
    const applicationId = roleContext?.applicationId;
    const title = roleContext?.title ? `Mock Interview: ${roleContext.title}` : undefined;

    try {
      const newSession = await createInterviewSession({ jobId, applicationId, title });
      const nextQuestion = await generateInterviewQuestion(newSession._id);
      setSession(newSession);
      setCurrentQuestion(nextQuestion);
      setQuestionNumber(1);
      setPhase('answering');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not start the practice session.');
      setPhase('error');
    }
  };

  useEffect(() => {
    if (!user || startedRef.current) return undefined;
    startedRef.current = true;
    let cancelled = false;

    (async () => {
      let detectedRole = role;
      try {
        const data = await getInterviewApplications();
        const apps = data?.applications || [];
        const first = apps[0];
        if (first) {
          detectedRole = { title: first.jobTitle || '', company: first.companyName || '', jobId: first.jobId, applicationId: first.id };
          if (!cancelled) setRole(detectedRole);
        }
      } catch {
        /* no application context available — practice generically */
      }
      if (!cancelled) await startSession(detectedRole);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submitAnswer = async () => {
    if (!draft.trim() || !session) return;
    setPhase('submitting');
    setErrorMessage('');
    try {
      const feedback = await submitInterviewAnswer(session._id, {
        question: currentQuestion,
        answer: draft,
      });
      setLastFeedback(feedback);
      setPhase('feedback-ready');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not score that answer.');
      setPhase('feedback-error');
    }
  };

  const finishSession = async () => {
    if (!session) return;
    setPhase('completing');
    setErrorMessage('');
    try {
      const completed = await completeInterviewSession(session._id);
      setResults(completed);
      setPhase('complete');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not finish the session.');
      setPhase('complete-error');
    }
  };

  const nextQuestion = async () => {
    if (!session) return;
    if (questionNumber >= QUESTION_CAP) {
      await finishSession();
      return;
    }
    setDraft('');
    setLastFeedback(null);
    setPhase('loading-question');
    setErrorMessage('');
    try {
      const q = await generateInterviewQuestion(session._id);
      setCurrentQuestion(q);
      setQuestionNumber((n) => n + 1);
      setPhase('answering');
    } catch (err) {
      setErrorMessage(err?.message || 'Could not load the next question.');
      setPhase('error');
    }
  };

  const practiceAgain = () => {
    clearInterval(ivRef.current);
    setElapsed(0);
    ivRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    startSession(role);
  };

  const timer = fmtTime(elapsed);
  const progress = `${(questionNumber / QUESTION_CAP) * 100}%`;
  const answering = phase === 'answering' || phase === 'submitting' || phase === 'feedback-ready' || phase === 'feedback-error';
  const canSubmit = phase === 'answering' && draft.trim().length > 0;

  return (
    <>
      <Head>
        <title>
          Mock interview{role.title ? ` · ${role.title}` : ''}
          {role.company ? ` at ${role.company}` : ''} — Jobocate
        </title>
      </Head>

      <style jsx global>{`
        #jbapp-mock ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp-mock ::-webkit-scrollbar-thumb {
          background: #1c2b26;
          border-radius: 8px;
        }
        #jbapp-mock textarea:focus {
          outline: none;
          border-color: #4ee6a8;
          box-shadow: 0 0 0 3px rgba(78, 230, 168, 0.15);
        }
      `}</style>

      <div id="jbapp-mock" style={{ display: 'flex', minHeight: '100vh', background: '#0A0E0D', fontFamily: 'var(--jb-font-sans)', color: '#D8F5E8' }}>
        <AppSidebar active="interview" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 24px',
              background: 'rgba(10,14,13,0.92)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #16201C',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 12,
                color: '#4F6B62',
              }}
            >
              MOCK_INTERVIEW
              {role.title ? ` · ${role.title}` : ''}
              {role.company ? ` @ ${role.company}` : ''}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: '#4EE6A8' }}>{timer}</span>
            <button
              onClick={finishSession}
              disabled={!session || phase === 'completing'}
              style={{
                fontFamily: 'var(--jb-font-mono)',
                fontSize: 11,
                background: 'transparent',
                border: '1px solid #2A3D36',
                color: '#9ECBB9',
                padding: '6px 12px',
                borderRadius: 4,
                cursor: session ? 'pointer' : 'default',
                opacity: session ? 1 : 0.5,
              }}
            >
              END SESSION
            </button>
          </header>

          {(phase === 'loading' || answering || phase === 'loading-question' || phase === 'completing') && (
            <div style={{ padding: '24px 24px 56px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
              {phase === 'loading' && <LoadingPanel label="Starting your practice session…" />}

              {(answering || phase === 'loading-question' || phase === 'completing') && session && (
                <>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                    {Array.from({ length: QUESTION_CAP }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: i < questionNumber ? '#4EE6A8' : '#1C2B26',
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--jb-font-mono)',
                      fontSize: 11,
                      color: '#4F6B62',
                      marginBottom: 14,
                    }}
                  >
                    <span>
                      Q{String(questionNumber).padStart(2, '0')} / {String(QUESTION_CAP).padStart(2, '0')}
                    </span>
                  </div>

                  {phase === 'loading-question' ? (
                    <LoadingPanel label="Generating your next question…" />
                  ) : (
                    <div style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 600, marginBottom: 18 }}>{currentQuestion}</div>
                  )}

                  {phase !== 'loading-question' && (
                    <>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={phase === 'submitting' || phase === 'feedback-ready'}
                        placeholder="Type your answer — aim for Situation → Task → Action → Result…"
                        style={{
                          width: '100%',
                          minHeight: 110,
                          fontFamily: 'inherit',
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          color: '#D8F5E8',
                          background: '#0F1614',
                          border: '1px solid #1C2B26',
                          borderRadius: 6,
                          padding: 16,
                          resize: 'vertical',
                          marginBottom: 16,
                        }}
                      />

                      {phase !== 'feedback-ready' && phase !== 'feedback-error' && (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                          <button
                            onClick={submitAnswer}
                            disabled={!canSubmit}
                            style={{
                              flex: 1,
                              background: canSubmit ? '#4EE6A8' : '#1C2B26',
                              color: canSubmit ? '#0A0E0D' : '#4F6B62',
                              border: 'none',
                              fontWeight: 700,
                              padding: 10,
                              borderRadius: 5,
                              fontSize: 13,
                              cursor: canSubmit ? 'pointer' : 'default',
                            }}
                          >
                            {phase === 'submitting' ? 'SCORING…' : 'SUBMIT ANSWER'}
                          </button>
                          <button
                            onClick={nextQuestion}
                            style={{
                              background: 'transparent',
                              border: '1px solid #2A3D36',
                              color: '#7A978C',
                              padding: '10px 16px',
                              borderRadius: 5,
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            SKIP
                          </button>
                        </div>
                      )}

                      {phase === 'feedback-error' && (
                        <ErrorPanel message={errorMessage} onRetry={submitAnswer} retryLabel="Retry scoring" />
                      )}

                      {phase === 'feedback-ready' && lastFeedback && (
                        <div style={{ background: '#0F1614', border: '1px solid #1C2B26', borderRadius: 6, padding: 16, marginBottom: 16 }}>
                          <div style={{ marginBottom: 10 }}>
                            <ScoreMeter label="Score" score={lastFeedback.score} />
                          </div>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: '#9ECBB9', marginBottom: 4 }}>
                            Score: {lastFeedback.score}/100
                          </div>
                          <div style={{ fontSize: 12.5, color: '#C3D9CF', lineHeight: 1.5 }}>{lastFeedback.feedback}</div>
                          <button
                            onClick={nextQuestion}
                            style={{
                              marginTop: 14,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              fontFamily: 'inherit',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#0A0E0D',
                              background: '#4EE6A8',
                              border: 'none',
                              borderRadius: 999,
                              padding: '10px 20px',
                              cursor: 'pointer',
                            }}
                          >
                            {questionNumber >= QUESTION_CAP ? 'Finish session →' : 'Next question →'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {phase === 'completing' && <LoadingPanel label="Scoring your session…" />}
            </div>
          )}

          {phase === 'error' && (
            <div style={{ padding: '24px 24px 56px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
              <ErrorPanel message={errorMessage} onRetry={() => startSession(role)} retryLabel="Try again" />
            </div>
          )}

          {(phase === 'complete' || phase === 'complete-error') && (
            <div style={{ padding: '36px 24px 64px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
              {phase === 'complete-error' && <ErrorPanel message={errorMessage} onRetry={finishSession} retryLabel="Retry" />}

              {phase === 'complete' && results && (
                <div style={{ background: '#0F1614', border: '1px solid #1C2B26', borderRadius: 10, padding: 24 }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#4F6B62', marginBottom: 6 }}>
                    SESSION COMPLETE · {results.questions?.length ?? 0} QUESTIONS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: scoreColor(results.overallScore || 0), fontFamily: 'var(--jb-font-mono)' }}>
                      {Math.round(results.overallScore || 0)}
                    </div>
                    <div style={{ fontSize: 13, color: '#7A978C' }}>overall score</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                    {(results.rubricScores || []).map((r) => (
                      <ScoreMeter key={r.category} label={r.category} score={r.score} />
                    ))}
                  </div>

                  <div style={{ background: '#0A0E0D', border: '1px solid #1C2B26', borderRadius: 6, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 10, color: '#4F6B62', marginBottom: 6 }}>SUMMARY</div>
                    <div style={{ fontSize: 12.5, color: '#C3D9CF', lineHeight: 1.6 }}>{results.feedbackSummary}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={practiceAgain}
                      style={{
                        flex: 1,
                        background: '#4EE6A8',
                        color: '#0A0E0D',
                        border: 'none',
                        fontWeight: 700,
                        padding: 10,
                        borderRadius: 5,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      PRACTICE AGAIN
                    </button>
                    <Link
                      href={appRoute('App Interview.dc.html')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: '1px solid #2A3D36',
                        color: '#9ECBB9',
                        padding: '10px 16px',
                        borderRadius: 5,
                        fontSize: 13,
                        textDecoration: 'none',
                      }}
                    >
                      BACK TO HUB
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Lint**

Run: `cd frontend && npx eslint src/pages/app/mock-interview.jsx`
Expected: no errors (the `react-hooks/exhaustive-deps` warning on the mount effect is expected and suppressed inline, matching the original file's pattern for the same effect).

- [ ] **Step 3: Build**

Run: `cd frontend && pnpm build`
Expected: exits 0, no type/compile errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/app/mock-interview.jsx
git commit -m "feat(mock-interview): wire the real session API and redesign as Performance Console"
```

---

### Task 5: E2E test proving the real feedback loop end-to-end

**Files:**
- Create: `e2e/specs/candidate/mock-interview.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect`, `storage`, `expectNoHorizontalOverflow`, `expectPageRendered` from `e2e/fixtures/test.ts` (all pre-existing).

- [ ] **Step 1: Write the E2E spec**

Create `e2e/specs/candidate/mock-interview.spec.ts`:

```ts
import { test, expect, storage, expectNoHorizontalOverflow, expectPageRendered } from '../../fixtures/test';

/**
 * Mock interview previously ran on a hardcoded static question bank and threw
 * away the candidate's answer without ever scoring it — the UI merely looked
 * like AI feedback. This spec proves the real session-based, LLM-scored flow:
 * a freshly generated question, a real per-answer score, and a real
 * per-category result at session end.
 */
test.use({ storageState: storage.candidate });
test.describe.configure({ mode: 'serial' });

test.describe('mock interview — real AI feedback loop', () => {
  test('starting a session shows a real, freshly generated question', async ({ page }) => {
    await page.goto('/app/mock-interview', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expectPageRendered(page, 'mock interview');
    await expectNoHorizontalOverflow(page, 'mock interview');

    // The old static bank's first question — if this is ever visible again,
    // the page regressed to hardcoded content instead of a generated one.
    await expect(
      page.getByText('Tell me about yourself and what drew you to product design.'),
      'the page is showing the old static question bank, not a generated question',
    ).toHaveCount(0);

    const answerBox = page.getByPlaceholder(/type your answer/i);
    await expect(answerBox, 'no answer input rendered once a question loaded').toBeVisible({
      timeout: 20_000,
    });
  });

  test('submitting an answer returns a real score and feedback', async ({ page }) => {
    await page.goto('/app/mock-interview', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const answerBox = page.getByPlaceholder(/type your answer/i);
    await expect(answerBox).toBeVisible({ timeout: 20_000 });
    await answerBox.fill(
      'At my last company, a teammate and I disagreed on the checkout redesign. I ran a quick usability test with five users, found the new flow confused two of them, and used that evidence to convince the team to keep the original layout for that step. Conversions held steady.',
    );

    await page.getByRole('button', { name: /submit answer/i }).click();

    // "Score: NN/100" only renders after submit-answer resolves with a real
    // validated {score, feedback} pair — the old page never rendered this at all.
    await expect(
      page.getByText(/Score:\s*\d{1,3}\/100/),
      'no real score rendered after submitting an answer',
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole('button', { name: /next question|finish session/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('ending the session shows a real, per-category results screen', async ({ page }) => {
    await page.goto('/app/mock-interview', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const answerBox = page.getByPlaceholder(/type your answer/i);
    await expect(answerBox).toBeVisible({ timeout: 20_000 });
    await answerBox.fill('A concise, structured answer using the STAR method for this practice question.');
    await page.getByRole('button', { name: /submit answer/i }).click();
    await expect(page.getByText(/Score:\s*\d{1,3}\/100/)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /end session/i }).click();

    await expect(
      page.getByText(/overall score/i),
      'session end did not produce a results screen',
    ).toBeVisible({ timeout: 30_000 });

    // The four fixed rubric categories from the real LLM-scored breakdown —
    // proves the rubric call actually ran, not just the per-question one.
    for (const category of ['Clarity', 'STAR Structure', 'Job Fit', 'Conciseness']) {
      await expect(page.getByText(category)).toBeVisible();
    }

    await expect(page.getByRole('button', { name: /practice again/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run it against the live stack**

Ensure Mongo, the backend, and the frontend are running (per the existing E2E harness's global setup — `e2e/support/global-setup.ts` provisions the `candidate`/`employer` storage states this spec consumes).

Run: `cd e2e && npx playwright test specs/candidate/mock-interview.spec.ts --reporter=list`
Expected: PASS, 3/3 tests green. Because this environment has a hosted LiteLLM gateway, the question/score/feedback text will be real (non-deterministic) model output, not the fixed `MockProvider` strings — the assertions above only check shape/presence, not exact text, so this is expected and fine.

- [ ] **Step 3: Commit**

```bash
git add e2e/specs/candidate/mock-interview.spec.ts
git commit -m "test(e2e): prove the mock-interview real AI feedback loop end-to-end"
```
