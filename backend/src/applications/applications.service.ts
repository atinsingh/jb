import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { ApplicationEventsService } from './application-events.service';
import { EmployerPipelineService } from '../employer-pipeline/employer-pipeline.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutopilotRulesService } from '../ai-recruiter/autopilot-rules.service';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Resume.name) private resumeModel: Model<ResumeDocument>,
    private readonly applicationEventsService: ApplicationEventsService,
    private readonly employerPipelineService: EmployerPipelineService,
    private readonly notificationsService: NotificationsService,
    private readonly autopilotRulesService: AutopilotRulesService,
  ) { }

  async createApplication(
    candidateId: string,
    jobId: string,
    coverLetter?: string,
    matchScore?: number,
    autoApplied: boolean = false,
  ): Promise<ApplicationDocument> {
    // Check if application already exists
    const existing = await this.applicationModel.findOne({
      candidateId,
      jobId,
    });

    if (existing) {
      throw new BadRequestException('Application already exists for this job');
    }

    const application = new this.applicationModel({
      candidateId,
      jobId,
      matchScore: matchScore || 0,
      coverLetter: coverLetter || '',
      status: 'pending',
      appliedAt: new Date(),
      autoApplied,
    });

    const saved = await application.save();
    await this.applicationEventsService.recordEvent({
      applicationId: saved._id as any,
      userId: saved.candidateId,
      type: 'queued',
      message: 'Application queued',
    });
    await this.bridgeApplicationToPipeline(saved);
    return saved;
  }

  async getApplicationById(applicationId: string): Promise<ApplicationDocument> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('candidateId', '-password')
      .populate('jobId')
      .exec();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async getUserApplications(
    userId: string,
    status?: string,
  ): Promise<ApplicationDocument[]> {
    const query: any = { candidateId: userId };
    if (status) {
      query.status = status;
    }

    return this.applicationModel
      .find(query)
      .populate('jobId')
      .sort({ appliedAt: -1 })
      .exec();
  }

  async updateApplicationStatus(
    applicationId: string,
    status: string,
    failReason?: string,
  ): Promise<ApplicationDocument> {
    const application = await this.applicationModel.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const validStatuses = [
      'pending',
      'submitted',
      'reviewing',
      'interviewed',
      'rejected',
      'accepted',
      // Auto-apply terminal outcomes (2c ATS runner):
      'failed', // submission attempt errored (retryable)
      'needs_human', // blocked — needs manual completion
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    application.status = status;
    if (status === 'submitted' && !application.submittedAt) {
      application.submittedAt = new Date();
    }
    // Stamp the reason on the two auto-apply failure outcomes so the runner /
    // support surface can explain why a submission stopped.
    if (status === 'failed' || status === 'needs_human') {
      application.failReason =
        failReason ||
        (status === 'needs_human'
          ? 'Automatic apply was blocked and needs manual completion'
          : 'Automatic apply failed');
    }

    const saved = await application.save();

    // Producer: notify the candidate their application status changed.
    // Notification policy for the auto-apply outcomes:
    //   - `failed`     -> retryable/internal, NOT a "good" update. Stay silent;
    //                     the runner will retry, so we don't alarm the candidate.
    //   - `needs_human`-> the candidate must act, so we DO notify them (neutral
    //                     "needs your attention" wording, not a success message).
    //   - everything else keeps the existing generic status notification.
    try {
      if (saved.candidateId) {
        if (status === 'failed') {
          // intentionally silent
        } else if (status === 'needs_human') {
          await this.notificationsService.create({
            audience: 'candidate',
            userId: String(saved.candidateId),
            type: 'applications',
            text: 'An application needs your attention to finish applying',
            href: '/app/applications',
          });
        } else {
          await this.notificationsService.create({
            audience: 'candidate',
            userId: String(saved.candidateId),
            type: 'applications',
            text: `Your application status is now "${status}"`,
            href: '/app/applications',
          });
        }
      }
    } catch {
      /* notifications must never break the status update */
    }

    return saved;
  }

  async deleteApplication(applicationId: string): Promise<void> {
    const result = await this.applicationModel.findByIdAndDelete(applicationId);
    if (!result) {
      throw new NotFoundException('Application not found');
    }
  }

  async getApplicationStats(userId: string): Promise<{
    total: number;
    pending: number;
    submitted: number;
    reviewing: number;
    interviewed: number;
    rejected: number;
    accepted: number;
    averageMatchScore: number;
  }> {
    const applications = await this.applicationModel.find({ candidateId: userId });

    const stats = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      submitted: applications.filter((a) => a.status === 'submitted').length,
      reviewing: applications.filter((a) => a.status === 'reviewing').length,
      interviewed: applications.filter((a) => a.status === 'interviewed').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
      averageMatchScore: 0,
    };

    if (applications.length > 0) {
      const totalScore = applications.reduce(
        (sum, a) => sum + (a.matchScore || 0),
        0,
      );
      stats.averageMatchScore = Math.round(totalScore / applications.length);
    }

    return stats;
  }

  /* ------------------------------------------------------------------ bridge */

  /**
   * Cross-surface bridge fired after an application is created (manual queue OR
   * auto-apply). Always notifies the candidate that their application went out,
   * and — when the underlying Job was posted directly by an employer on Jobocate
   * — mirrors it into that employer's applicant pipeline and notifies the owner.
   *
   * Purely-scraped jobs have no employer surface, so only the candidate
   * notification fires. Fully defensive: a failure here must never break the
   * application save that triggered it.
   */
  async bridgeApplicationToPipeline(application: ApplicationDocument): Promise<void> {
    try {
      const candidateId = application.candidateId
        ? String(application.candidateId)
        : '';
      const job: any = application.jobId
        ? await this.jobModel.findById(application.jobId).lean()
        : null;

      // Candidate-side notification always fires on a new application.
      if (candidateId) {
        await this.notificationsService.create({
          audience: 'candidate',
          userId: candidateId,
          type: 'applications',
          text: job?.title
            ? `Application submitted for ${job.title}`
            : 'Application submitted',
          href: '/app/applications',
        });
      }

      // Resolve the employer only for first-party Jobocate jobs.
      if (!job) return;
      const isEmployerPosted =
        job.isExternal === false &&
        (String(job.externalId || '').startsWith('jobocate:') ||
          job.source === 'Jobocate');
      if (!isEmployerPosted) return;

      const ownerId = job.addedBy ? String(job.addedBy) : '';
      const employerJobId = job.sourceJobKey ? String(job.sourceJobKey) : '';
      if (!employerJobId || !candidateId) return;

      const candidateFields = await this.resolveCandidateFields(candidateId);

      const applicant = await this.employerPipelineService.upsertApplicant({
        ownerId: ownerId || undefined,
        jobId: employerJobId,
        candidateId,
        aiScore: application.matchScore || 0,
        source: 'jobocate_apply',
        stage: 'applied',
        ...candidateFields,
      });

      // Newly-created applicants only — compare createdAt/updatedAt rather than
      // adding a return-shape change to a shared method other callers rely on.
      // A re-apply/update to an existing applicant should not re-trigger
      // autopilot evaluation.
      const isNewlyCreated =
        applicant.createdAt &&
        applicant.updatedAt &&
        applicant.createdAt.getTime() === applicant.updatedAt.getTime();

      if (isNewlyCreated) {
        try {
          await this.autopilotRulesService.evaluateApplicant(ownerId, applicant);
        } catch {
          // Autopilot evaluation must never break the application-save path
          // that triggered it — already defensive inside evaluateApplicant
          // itself, but belt-and-suspenders here too.
        }
      }

      // Employer-side notification (only when we resolved an owner).
      if (ownerId) {
        await this.notificationsService.create({
          audience: 'employer',
          userId: ownerId,
          type: 'applicants',
          text: `${candidateFields.candidateName || 'A candidate'} applied to ${job.title}`,
          href: '/employer/pipeline',
        });
      }
    } catch (err) {
      this.logger.warn(
        `bridgeApplicationToPipeline failed for application ${String(
          application?._id,
        )}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /**
   * Build the applicant's snapshot from the candidate's User row + primary
   * résumé (mirrors EligibleJobsService.scoreProfile: résumés sorted
   * isPrimary desc then updatedAt desc; skills unioned; first headline wins).
   */
  private async resolveCandidateFields(userId: string): Promise<{
    candidateName: string;
    candidateEmail: string;
    candidateLocation: string;
    candidateHeadline: string;
    skills: string[];
    yearsExperience: number;
  }> {
    const user: any = await this.userModel.findById(userId).lean();
    const resumes: any[] = await this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ isPrimary: -1, updatedAt: -1 })
      .limit(5)
      .lean();

    const skillSet = new Set<string>();
    let headline = '';
    let experience: any[] = [];
    for (const r of resumes) {
      (r.skills || []).forEach((s: string) => skillSet.add(s));
      if (!headline) {
        headline =
          r.headline || (r.experience && r.experience[0] && r.experience[0].title) || '';
      }
      if (!experience.length && Array.isArray(r.experience)) {
        experience = r.experience;
      }
    }

    return {
      candidateName: user?.name || '',
      candidateEmail: user?.email || '',
      candidateLocation: user?.location || '',
      candidateHeadline: headline,
      skills: [...skillSet],
      yearsExperience: this.deriveYearsExperience(experience),
    };
  }

  /** Rough total years of experience summed from résumé experience date ranges. */
  private deriveYearsExperience(experience: any[]): number {
    if (!Array.isArray(experience) || !experience.length) return 0;
    const nowYear = new Date().getFullYear();
    let total = 0;
    for (const e of experience) {
      const start = this.yearOf(e?.startDate);
      if (!start) continue;
      const end = e?.current ? nowYear : this.yearOf(e?.endDate) || start;
      total += Math.max(0, end - start);
    }
    return total;
  }

  private yearOf(value: any): number {
    if (!value) return 0;
    const m = String(value).match(/(19|20)\d{2}/);
    return m ? parseInt(m[0], 10) : 0;
  }
}
