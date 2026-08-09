import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { AnswerType } from '../schemas/answer-bank.schema';
import { AnswerSource, WorkAuthStatus } from '../schemas/answer-profile.schema';
import { AnswerResolverService } from '../answers/answer-resolver.service';
import { AnswerProfileService } from '../answers/answer-profile.service';
import { ApplicationEventsService } from '../applications/application-events.service';

/**
 * The candidate-facing approval queue.
 *
 * Everything the prepare pass produced sits here until a human looks at it.
 * Three rules this service exists to hold:
 *
 *   - An application with unanswered blockers cannot be approved.
 *   - An expired preparation cannot be approved — it must be re-prepared.
 *   - Approval is recorded explicitly (`approvalId`), and nothing downstream
 *     may submit without it.
 */
@Injectable()
export class ApprovalQueueService {
  private readonly logger = new Logger(ApprovalQueueService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
    private readonly answers: AnswerResolverService,
    private readonly profiles: AnswerProfileService,
    private readonly events: ApplicationEventsService,
  ) {}

  /** Everything filled and waiting on this candidate, newest first. */
  async list(candidateId: string) {
    const apps: any[] = await this.applicationModel
      .find({ candidateId: new Types.ObjectId(candidateId), status: 'awaiting_approval' })
      .sort({ 'prepared.preparedAt': -1 })
      .lean();

    const jobIds = apps.map((a) => a.jobId).filter(Boolean);
    const jobs: any[] = await this.jobModel
      .find({ _id: { $in: jobIds } })
      .select('title companyName companyLogo location country workplaceType externalUrl')
      .lean();
    const jobById = new Map(jobs.map((j) => [String(j._id), j]));

    const now = Date.now();

    return apps.map((a) => {
      const job = jobById.get(String(a.jobId)) || {};
      const prepared = a.prepared || {};
      const blockers = prepared.blockers || [];
      const expiresAt = prepared.expiresAt ? new Date(prepared.expiresAt) : null;

      return {
        id: String(a._id),
        status: a.status,
        matchScore: a.matchScore || 0,
        atsType: a.atsType || null,
        job: {
          id: String(a.jobId),
          title: job.title || 'Role',
          company: job.companyName || 'Company',
          logo: job.companyLogo || null,
          location: job.location || null,
          country: job.country || null,
          url: job.externalUrl || null,
        },
        // What will be submitted, and where each answer came from.
        answers: prepared.answers || [],
        blockers,
        unknownQuestions: prepared.unknownQuestions || [],
        screenshotUrl: a.artifacts?.screenshotUrl || null,
        fillCoverage: prepared.fillCoverage ?? null,
        preparedAt: prepared.preparedAt || null,
        expiresAt,
        isExpired: !!expiresAt && expiresAt.getTime() < now,
        // A card is bulk-approvable when nothing is waiting on the human.
        // AI-drafted prose does NOT block: it is rendered inline to be read.
        isClean: blockers.length === 0 && !(expiresAt && expiresAt.getTime() < now),
        aiDraftCount: (prepared.answers || []).filter((x: any) => x.source === 'ai_draft').length,
      };
    });
  }

  /** Fetch one, enforcing ownership. */
  private async own(candidateId: string, applicationId: string): Promise<ApplicationDocument> {
    const app = await this.applicationModel
      .findOne({ _id: applicationId, candidateId: new Types.ObjectId(candidateId) })
      .exec();
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  /**
   * Answer one blocker.
   *
   * The answer is written to the answer bank — and, for attestations, through to
   * the profile — so the same question resolves automatically on every future
   * application. That write-through is the whole reason the queue shrinks over
   * time instead of asking forever.
   */
  async answerBlocker(
    candidateId: string,
    applicationId: string,
    params: { questionKey: string; value: any; profileField?: string; country?: string | null },
  ) {
    const app = await this.own(candidateId, applicationId);
    const prepared: any = app.prepared || {};
    const blockers: any[] = prepared.blockers || [];

    const blocker = blockers.find((b) => b.questionKey === params.questionKey);
    if (!blocker) throw new NotFoundException('No such question on this application');

    if (params.value === undefined || params.value === null || params.value === '') {
      throw new BadRequestException('An answer is required');
    }

    // 1) Remember it for next time.
    await this.answers.learnFromCandidate({
      userId: candidateId,
      questionKey: params.questionKey,
      value: params.value,
      answerType: blocker.answerType as AnswerType,
      rawSample: blocker.label,
    });

    // 2) Attestations additionally write through to the profile — the only
    //    place they are permitted to originate.
    const profileField = params.profileField || blocker.profileField;
    if (profileField === 'workAuthorization' && params.country) {
      await this.profiles.setWorkAuthorization(
        candidateId,
        params.country,
        params.value as WorkAuthStatus,
      );
    } else if (profileField) {
      await this.profiles.update(
        candidateId,
        { [profileField]: params.value } as any,
        AnswerSource.CANDIDATE,
      );
    }

    // 3) Move it from blockers to answers on this application.
    const remaining = blockers.filter((b) => b.questionKey !== params.questionKey);
    const answers = [
      ...(prepared.answers || []),
      {
        fieldName: blocker.fieldName,
        questionKey: params.questionKey,
        questionClass: blocker.questionClass,
        label: blocker.label,
        value: params.value,
        source: 'candidate',
        confidence: 1,
      },
    ];

    await this.applicationModel
      .updateOne(
        { _id: applicationId },
        { $set: { 'prepared.blockers': remaining, 'prepared.answers': answers } },
      )
      .exec();

    return { id: applicationId, remainingBlockers: remaining.length };
  }

  /**
   * Approve one application for submission.
   *
   * Records `approvalId` — the token the commit pass requires. Approving does
   * not itself submit: with `AUTO_APPLICATION_ENABLED` off the application
   * stays parked and says so, rather than implying it went out.
   */
  async approve(candidateId: string, applicationId: string) {
    const app = await this.own(candidateId, applicationId);
    const prepared: any = app.prepared || {};

    if (app.status !== 'awaiting_approval') {
      throw new BadRequestException(`This application is ${app.status}, not awaiting approval`);
    }
    if ((prepared.blockers || []).length) {
      throw new BadRequestException(
        `${prepared.blockers.length} question(s) still need your answer`,
      );
    }
    if (prepared.expiresAt && new Date(prepared.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('This preparation has expired — it needs preparing again');
    }

    const approvalId = randomUUID();
    await this.applicationModel
      .updateOne(
        { _id: applicationId },
        { $set: { 'prepared.approvalId': approvalId, 'prepared.approvedAt': new Date() } },
      )
      .exec();

    await this.events.recordEvent({
      applicationId: app._id as any,
      userId: app.candidateId,
      type: 'ats_approved',
      message: 'You approved this application for submission',
      meta: { approvalId },
    });

    const submissionEnabled = process.env.AUTO_APPLICATION_ENABLED === 'true';
    return {
      id: applicationId,
      approved: true,
      approvalId,
      submitted: false,
      message: submissionEnabled
        ? 'Approved — queued for submission.'
        : 'Approved. Automatic submission is not switched on yet, so this is held ready for you.',
    };
  }

  /** Approve every card with no outstanding blockers. */
  async approveClean(candidateId: string) {
    const queue = await this.list(candidateId);
    const clean = queue.filter((q) => q.isClean);

    const results = [];
    for (const item of clean) {
      try {
        results.push(await this.approve(candidateId, item.id));
      } catch (err) {
        this.logger.warn(
          `Bulk approve skipped ${item.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return { approved: results.length, total: clean.length, results };
  }

  /** The candidate chose not to send this one. */
  async decline(candidateId: string, applicationId: string, reason?: string) {
    const app = await this.own(candidateId, applicationId);

    await this.applicationModel
      .updateOne(
        { _id: applicationId },
        { $set: { status: 'declined', failReason: reason || 'Declined by candidate' } },
      )
      .exec();

    await this.events.recordEvent({
      applicationId: app._id as any,
      userId: app.candidateId,
      type: 'ats_declined',
      message: reason ? `You skipped this role — ${reason}` : 'You skipped this role',
    });

    return { id: applicationId, status: 'declined' };
  }
}
