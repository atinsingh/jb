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

      // Add question and answer to session
      const interviewQuestion: InterviewQuestion = {
        question,
        answer,
        score: parsed.score,
        feedback: parsed.feedback,
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
        score: parsed.score,
        feedback: parsed.feedback,
      };
    } catch (error: any) {
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

    // Calculate overall score
    const scores = session.questions
      .map((q) => q.score)
      .filter((s) => s !== undefined && s !== null) as number[];
    const overallScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    // Generate rubric scores
    const rubricScores = await this.generateRubricScores(session, userId);

    // Generate feedback summary
    const feedbackSummary = await this.generateFeedbackSummary(session, userId);

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
    // Simple implementation - can be enhanced with LLM
    const categories = ['Technical Skills', 'Communication', 'Problem Solving', 'Cultural Fit'];
    const scores: RubricScore[] = [];

    for (const category of categories) {
      // Use average of question scores as category score
      const categoryScore = session.overallScore || 0;
      scores.push({
        category,
        score: categoryScore,
        feedback: `Average performance in ${category.toLowerCase()}`,
      });
    }

    return scores;
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

    const questionCount = session.questions.length;
    const avgScore = session.overallScore || 0;
    const strengths = session.questions
      .filter((q) => (q.score || 0) >= 80)
      .map((q) => q.question)
      .slice(0, 3);
    const improvements = session.questions
      .filter((q) => (q.score || 0) < 60)
      .map((q) => q.question)
      .slice(0, 3);

    return `You answered ${questionCount} questions with an average score of ${avgScore.toFixed(1)}/100. ${
      strengths.length > 0
        ? `Strengths: ${strengths.join(', ')}. `
        : ''
    }${
      improvements.length > 0
        ? `Areas for improvement: ${improvements.join(', ')}.`
        : ''
    }`;
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

