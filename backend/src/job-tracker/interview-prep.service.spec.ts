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
