import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MockInterviewSession,
  MockInterviewSessionDocument,
  MockInterviewStatus,
  InterviewQuestion,
  RubricScore,
} from '../schemas/mock-interview-session.schema';
import { StoryBank, StoryBankDocument, STAREntry } from '../schemas/story-bank.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { LLMRoutingService, LLMFeature } from '../llm/llm-routing.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { z } from 'zod';
import {
  InterviewAnswerFeedbackSchema,
  InterviewRubricResponseSchema,
  InterviewSummaryResponseSchema,
} from '@jobocate/contracts';

const RUBRIC_CATEGORIES = ['Clarity', 'STAR Structure', 'Job Fit', 'Conciseness'];

@Injectable()
export class InterviewPrepService {
  private readonly logger = new Logger(InterviewPrepService.name);

  constructor(
    @InjectModel(MockInterviewSession.name)
    private interviewSessionModel: Model<MockInterviewSessionDocument>,
    @InjectModel(StoryBank.name)
    private storyBankModel: Model<StoryBankDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private readonly llmRoutingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
  ) {}

  /**
   * Create a new mock interview session
   */
  async createInterviewSession(
    userId: string,
    jobId?: string,
    applicationId?: string,
    title?: string,
  ): Promise<MockInterviewSessionDocument> {
    let job: JobDocument | null = null;
    if (jobId) {
      job = await this.jobModel.findById(jobId);
    }

    const session = new this.interviewSessionModel({
      userId,
      jobId,
      applicationId,
      title: title || (job ? `Mock Interview: ${job.title} at ${job.companyName}` : 'Mock Interview'),
      description: job ? `Practice interview for ${job.title} position` : undefined,
      status: MockInterviewStatus.IN_PROGRESS,
      questions: [],
      rubricScores: [],
      startedAt: new Date(),
    });

    return session.save();
  }

  /**
   * Generate next interview question
   */
  async generateNextQuestion(
    sessionId: string,
    userId: string,
  ): Promise<string> {
    const session = await this.interviewSessionModel.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      throw new Error('Interview session not found');
    }

    if (session.status !== MockInterviewStatus.IN_PROGRESS) {
      throw new Error('Interview session is not in progress');
    }

    // Check quota
    await this.quotaService.enforceQuota(userId, LLMFeature.MOCK_INTERVIEW);

    let job: JobDocument | null = null;
    if (session.jobId) {
      job = await this.jobModel.findById(session.jobId);
    }

    // Get previous questions to avoid repetition
    const previousQuestions = session.questions.map((q) => q.question);

    const provider = this.llmRoutingService.getProviderForFeature(
      LLMFeature.MOCK_INTERVIEW,
    );
    const config = this.llmRoutingService.getFeatureConfig(LLMFeature.MOCK_INTERVIEW);

    const prompt = this.buildQuestionPrompt(job, previousQuestions);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are an experienced interviewer. Generate relevant, challenging interview questions based on the job description. Return only the question text, no additional formatting.',
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const question = response.content.trim();

      // Record usage
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.MOCK_INTERVIEW,
        provider.getName(),
        config.model,
        response.usage,
        { sessionId },
      );

      return question;
    } catch (error: any) {
      this.logger.error('Error generating interview question:', error);
      throw error;
    }
  }

  /**
   * Submit answer and get feedback
   */
  async submitAnswer(
    sessionId: string,
    userId: string,
    question: string,
    answer: string,
  ): Promise<{ score: number; feedback: string }> {
    const session = await this.interviewSessionModel.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      throw new Error('Interview session not found');
    }

    // Check quota
    await this.quotaService.enforceQuota(userId, LLMFeature.MOCK_INTERVIEW);

    const provider = this.llmRoutingService.getProviderForFeature(
      LLMFeature.MOCK_INTERVIEW,
    );
    const config = this.llmRoutingService.getFeatureConfig(LLMFeature.MOCK_INTERVIEW);

    let job: JobDocument | null = null;
    if (session.jobId) {
      job = await this.jobModel.findById(session.jobId);
    }

    const prompt = this.buildFeedbackPrompt(question, answer, job);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are an experienced interviewer providing feedback. Evaluate the answer and provide constructive feedback. Return ONLY valid JSON: {"score": 0-100, "feedback": "detailed feedback"}',
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
  }

  /**
   * Complete interview session and generate summary
   */
  async completeInterviewSession(
    sessionId: string,
    userId: string,
  ): Promise<MockInterviewSessionDocument> {
    const session = await this.interviewSessionModel.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      throw new Error('Interview session not found');
    }

    if (session.status === MockInterviewStatus.COMPLETED) {
      return session;
    }

    // Calculate overall score
    const scores = session.questions
      .map((q) => q.score)
      .filter((s) => s !== undefined && s !== null) as number[];
    const overallScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    // Generate rubric scores and feedback summary concurrently — independent
    // LLM calls with no ordering dependency between them.
    const [rubricScores, feedbackSummary] = await Promise.all([
      this.generateRubricScores(session, userId),
      this.generateFeedbackSummary(session, userId),
    ]);

    const completedAt = new Date();
    const duration = session.startedAt
      ? Math.round((completedAt.getTime() - session.startedAt.getTime()) / 60000)
      : 0;

    session.status = MockInterviewStatus.COMPLETED;
    session.overallScore = overallScore;
    session.rubricScores = rubricScores;
    session.feedbackSummary = feedbackSummary;
    session.completedAt = completedAt;
    session.duration = duration;

    return session.save();
  }

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
        temperature: 0.3,
        maxTokens: 2000,
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
        temperature: 0.3,
        maxTokens: 2000,
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

  /**
   * Build question prompt
   */
  private buildQuestionPrompt(
    job: JobDocument | null,
    previousQuestions: string[],
  ): string {
    let prompt = 'Generate a relevant interview question';

    if (job) {
      prompt += ` for the position: ${job.title} at ${job.companyName}\n`;
      prompt += `Job Description: ${job.description || ''}\n`;
      prompt += `Requirements: ${(job.requirements || []).join(', ')}\n`;
    }

    if (previousQuestions.length > 0) {
      prompt += `\nPrevious questions asked:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`;
      prompt += 'Generate a different question that has not been asked yet.';
    }

    return prompt;
  }

  /**
   * Build feedback prompt
   */
  private buildFeedbackPrompt(
    question: string,
    answer: string,
    job: JobDocument | null,
  ): string {
    let prompt = `Evaluate this interview answer:\n\n`;
    prompt += `Question: ${question}\n`;
    prompt += `Answer: ${answer}\n`;

    if (job) {
      prompt += `\nContext: This is for a ${job.title} position at ${job.companyName}`;
    }

    prompt += `\n\nProvide a score (0-100) and detailed feedback. Consider:\n`;
    prompt += `- Relevance to the question\n`;
    prompt += `- Clarity and structure\n`;
    prompt += `- Use of examples (STAR method)\n`;
    prompt += `- Alignment with job requirements`;

    return prompt;
  }

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

  /**
   * Get interview sessions for user
   */
  async getInterviewSessions(
    userId: string,
    status?: MockInterviewStatus,
  ): Promise<MockInterviewSessionDocument[]> {
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    return this.interviewSessionModel
      .find(query)
      .populate('jobId')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get interview session by ID
   */
  async getInterviewSession(
    sessionId: string,
    userId: string,
  ): Promise<MockInterviewSessionDocument | null> {
    return this.interviewSessionModel
      .findOne({ _id: sessionId, userId })
      .populate('jobId')
      .exec();
  }
}

