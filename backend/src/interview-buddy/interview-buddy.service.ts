import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { InterviewChatService } from '../llm/features/interview-chat.service';
import { SessionContextBuilderService } from './services/session-context-builder.service';
import { LLMChatMessage } from '../llm/interfaces/llm-provider.interface';
import {
  InterviewSession,
  InterviewSessionDocument,
} from '../schemas/interview-session.schema';
import {
  InterviewTurn,
  InterviewTurnDocument,
  TranscriptSegment,
  TurnType,
} from '../schemas/interview-turn.schema';

@Injectable()
export class InterviewBuddyService {
  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Resume.name)
    private resumeModel: Model<ResumeDocument>,
    @InjectModel(Job.name)
    private jobModel: Model<JobDocument>,
    @InjectModel(InterviewSession.name)
    private interviewSessionModel: Model<InterviewSessionDocument>,
    @InjectModel(InterviewTurn.name)
    private interviewTurnModel: Model<InterviewTurnDocument>,
    private interviewChatService: InterviewChatService,
    private readonly contextBuilder: SessionContextBuilderService,
  ) {}

  /**
   * Create a session and build its context pack.
   *
   * The pack is built ONCE here rather than per question: it is the expensive
   * part (résumé + JD + role), and rebuilding it mid-interview would spend the
   * latency budget the copilot exists to protect.
   */
  async createSession(
    userId: string,
    dto: {
      mode: 'PRACTICE' | 'CONSENT' | 'LIVE_NOTES';
      roleTitle: string;
      companyName?: string;
      resumeVersionId?: string;
      roleFamily?: any;
      seniority?: any;
      interviewType?: any;
    },
  ) {
    const session = await this.interviewSessionModel.create({
      userId: new Types.ObjectId(userId),
      mode: dto.mode,
      roleTitle: dto.roleTitle,
      companyName: dto.companyName,
      resumeVersionId: dto.resumeVersionId ? new Types.ObjectId(dto.resumeVersionId) : undefined,
      status: 'CREATED',
      // Audio only ever comes from a shared browser tab. There is deliberately
      // no captureMode meaning "stored audio" — none is ever kept.
      captureMode: dto.mode === 'LIVE_NOTES' ? 'none' : 'tab_audio',
      retainTranscript: false,
    });

    const contextPack = await this.contextBuilder.buildContextPack(
      userId,
      String(session._id),
      dto.mode,
      dto.roleTitle,
      dto.resumeVersionId,
      undefined,
      dto.companyName,
      dto.roleFamily,
      dto.seniority,
      dto.interviewType,
    );

    session.contextPack = contextPack as any;
    await session.save();

    return { session };
  }

  /**
   * Record the candidate's consent acknowledgement, and their retention choice.
   *
   * Until this is set, `LiveSessionService.start` refuses to open a microphone.
   */
  async acknowledgeConsent(
    sessionId: string,
    userId: string,
    params: { acknowledged: boolean; retainTranscript?: boolean },
  ) {
    const found = await this.getSession(sessionId, userId);
    if (!found) throw new NotFoundException('Interview session not found');

    if (!params.acknowledged) {
      throw new BadRequestException('Capture cannot start without your acknowledgement.');
    }

    await this.interviewSessionModel
      .updateOne(
        { _id: sessionId },
        {
          $set: {
            consentAcknowledgedAt: new Date(),
            retainTranscript: !!params.retainTranscript,
          },
        },
      )
      .exec();

    return {
      sessionId,
      consentAcknowledged: true,
      retainTranscript: !!params.retainTranscript,
    };
  }

  /** Move a session to IN_PROGRESS. */
  async startSession(sessionId: string, userId: string) {
    const found = await this.getSession(sessionId, userId);
    if (!found) throw new NotFoundException('Interview session not found');

    await this.interviewSessionModel
      .updateOne({ _id: sessionId }, { $set: { status: 'IN_PROGRESS', startedAt: new Date() } })
      .exec();

    return { sessionId, status: 'IN_PROGRESS' };
  }

  /**
   * End a session.
   *
   * When the candidate did not opt into retention, the turns are deleted here.
   * Raw audio never existed to delete — it is transcribed in flight and dropped —
   * but the transcript is written as turns during the session, so this is where
   * "not retained" is actually honoured.
   */
  async completeSession(sessionId: string, userId: string) {
    const found = await this.getSession(sessionId, userId);
    if (!found) throw new NotFoundException('Interview session not found');

    const retain = !!(found.session as any).retainTranscript;
    let discardedTurns = 0;

    if (!retain) {
      const result = await this.interviewTurnModel
        .deleteMany({ sessionId: new Types.ObjectId(sessionId) })
        .exec();
      discardedTurns = result?.deletedCount ?? 0;
    }

    await this.interviewSessionModel
      .updateOne({ _id: sessionId }, { $set: { status: 'COMPLETED', endedAt: new Date() } })
      .exec();

    return { sessionId, status: 'COMPLETED', transcriptRetained: retain, discardedTurns };
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.interviewSessionModel
      .findOne({
        _id: sessionId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!session) {
      return null;
    }

    return { session };
  }

  async addTurn(
    sessionId: string,
    userId: string,
    type: TurnType,
    text: string,
    segments: Array<Partial<TranscriptSegment>> = [],
    sttConfidence?: number,
  ) {
    const session = await this.interviewSessionModel
      .findOne({
        _id: sessionId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }

    return this.interviewTurnModel.create({
      sessionId: new Types.ObjectId(sessionId),
      type,
      text,
      segments: segments.map((segment) => ({
        startMs: segment.startMs ?? 0,
        endMs: segment.endMs ?? 0,
        text: segment.text || '',
        confidence: segment.confidence,
        speaker: segment.speaker || 'UNKNOWN',
      })),
      sttConfidence,
      startTs: Date.now(),
      endTs: Date.now(),
    });
  }

  async getApplicationsForUser(userId: string) {
    const applications = await this.applicationModel
      .find({ candidateId: new Types.ObjectId(userId) })
      .populate('jobId', 'title companyName location description')
      .sort({ appliedAt: -1 })
      .exec();

    return applications.map((app) => ({
      id: app._id.toString(),
      jobId: app.jobId?._id?.toString(),
      jobTitle: (app.jobId as any)?.title || 'Unknown Job',
      companyName: (app.jobId as any)?.companyName || 'Unknown Company',
      status: app.status,
      appliedAt: app.appliedAt,
    }));
  }

  async getResumesForUser(userId: string) {
    const resumes = await this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();

    return resumes.map((resume) => ({
      id: resume._id.toString(),
      _id: resume._id.toString(),
      name: resume.name,
      template: resume.template,
      fullName: resume.fullName,
      email: resume.email,
      summary: resume.summary,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
      createdAt: resume.createdAt,
    }));
  }

  async getApplicationDetails(applicationId: string, userId: string) {
    const application = await this.applicationModel
      .findOne({
        _id: applicationId,
        candidateId: new Types.ObjectId(userId),
      })
      .populate('jobId')
      .exec();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return {
      id: application._id.toString(),
      job: application.jobId,
      status: application.status,
      coverLetter: application.coverLetter,
      matchScore: application.matchScore,
    };
  }

  async getResumeDetails(resumeId: string, userId: string) {
    const resume = await this.resumeModel
      .findOne({
        _id: resumeId,
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return {
      id: resume._id.toString(),
      name: resume.name,
      template: resume.template,
      fullName: resume.fullName,
      email: resume.email,
      phone: resume.phone,
      summary: resume.summary,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
    };
  }

  async chat(
    userId: string,
    message: string,
    applicationId?: string,
    resumeId?: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): Promise<string> {
    if (!message.trim()) {
      throw new BadRequestException('Message cannot be empty');
    }

    let context = '';
    let jobInfo = '';
    let resumeInfo = '';

    // Get application context if provided
    if (applicationId) {
      const application = await this.applicationModel
        .findOne({
          _id: applicationId,
          candidateId: new Types.ObjectId(userId),
        })
        .populate('jobId')
        .exec();

      if (application && application.jobId) {
        const job = application.jobId as any;
        jobInfo = `
Job Information:
- Title: ${job.title || 'N/A'}
- Company: ${job.companyName || 'N/A'}
- Location: ${job.location || 'N/A'}
- Description: ${job.description || 'N/A'}
- Application Status: ${application.status || 'N/A'}
- Match Score: ${application.matchScore || 'N/A'}%
`;
        if (application.coverLetter) {
          context += `\nCover Letter:\n${application.coverLetter}\n`;
        }
      }
    }

    // Get resume context if provided
    if (resumeId) {
      const resume = await this.resumeModel
        .findOne({
          _id: resumeId,
          userId: new Types.ObjectId(userId),
        })
        .exec();

      if (resume) {
        resumeInfo = `
Resume Information:
- Name: ${resume.fullName || resume.name || 'N/A'}
- Email: ${resume.email || 'N/A'}
- Phone: ${resume.phone || 'N/A'}
- Summary: ${resume.summary || 'N/A'}
- Skills: ${Array.isArray(resume.skills) ? resume.skills.join(', ') : 'N/A'}
- Experience: ${resume.experience && Array.isArray(resume.experience) ? JSON.stringify(resume.experience) : 'N/A'}
- Education: ${resume.education && Array.isArray(resume.education) ? JSON.stringify(resume.education) : 'N/A'}
`;
      }
    }

    // Build system prompt
    const systemPrompt = `You are an AI Interview Buddy, a helpful assistant that helps candidates prepare for job interviews. 

${jobInfo ? `Context about the job application:\n${jobInfo}\n` : ''}
${resumeInfo ? `Candidate's Resume:\n${resumeInfo}\n` : ''}
${context ? `Additional context:\n${context}\n` : ''}

Your role:
- Help the candidate prepare for interviews by providing thoughtful answers to their questions
- Provide feedback on their responses
- Suggest improvements to their answers
- Help them understand what interviewers might be looking for
- Be encouraging and supportive

Keep your responses concise, practical, and actionable. Focus on helping them succeed in their interview.`;

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    try {
      // Use the modern llm/ interview-chat service to generate a response.
      const response = await this.interviewChatService.chat(
        userId,
        messages as LLMChatMessage[],
      );
      return response;
    } catch (error: any) {
      // Graceful degradation: the AI provider may be unavailable (e.g. quota
      // exhausted). Return a helpful, non-blocking message rather than a 400
      // so the chat UI stays usable.
      // eslint-disable-next-line no-console
      console.warn(`[interview-buddy] AI chat unavailable: ${error?.message || error}`);
      return (
        "I'm temporarily unable to reach the AI service, so here's some general guidance while it recovers:\n\n" +
        '• Structure behavioral answers with STAR — Situation, Task, Action, Result.\n' +
        '• Lead with the outcome and quantify impact where you can.\n' +
        '• Tie each answer back to the specific role and company.\n' +
        '• Keep it to 60–90 seconds and end on what you learned.\n\n' +
        'Please try again in a moment for a tailored response.'
      );
    }
  }
}
