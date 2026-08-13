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
      save: jest.fn(),
    };
    // Mongoose's Document#save resolves with the document itself.
    session.save.mockResolvedValue(session);

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
});
