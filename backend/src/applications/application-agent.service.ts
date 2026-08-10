import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import { QUEUE_AUTO_APPLY, JOB_AUTO_APPLY } from '../queue/queue.constants';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { MatchingService } from '../matching/matching.service';
import { UserPreferencesService } from '../users/user-preferences.service';
import { ApplicationEventsService } from './application-events.service';
import { ApplicationsService } from './applications.service';

@Injectable()
export class ApplicationAgentService {
  private autoApplicationEnabled: boolean;
  private minMatchScore: number;
  private maxApplicationsPerDay: number;

  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private matchingService: MatchingService,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly applicationEventsService: ApplicationEventsService,
    private readonly applicationsService: ApplicationsService,
    // Background auto-apply queue. `@Optional()` → undefined when QUEUE_ENABLED !== 'true'
    // (dev/test default), so the producer transparently falls back to inline work.
    @Optional() @InjectQueue(QUEUE_AUTO_APPLY) private readonly autoApplyQueue?: Queue,
  ) {
    this.autoApplicationEnabled = process.env.AUTO_APPLICATION_ENABLED === 'true';
    this.minMatchScore = parseInt(process.env.MIN_MATCH_SCORE_FOR_AUTO_APPLY || '75', 10);
    this.maxApplicationsPerDay = parseInt(process.env.MAX_APPLICATIONS_PER_DAY || '20', 10);
  }

  /**
   * Producer for `POST /applications/auto-apply`.
   * - Queue registered (QUEUE_ENABLED=true) → enqueue ONE batch job `{ userId, jobIds }`
   *   and return `{ queued: true, jobId }` (202-style) so the slow per-job loop
   *   (match calc + LLM cover-letter + pipeline bridge) runs off the request path.
   * - No queue (@Optional undefined, dev/test default) → run inline, identical shape
   *   to before: `{ message, applications, count }`.
   *
   * One job per batch (not per jobId) on purpose: `autoApply` shares per-user state
   * across the batch — a single user lookup and the daily-application-limit counter
   * (`maxApplicationsPerDay`). Fanning out per jobId would fragment that accounting
   * and race the daily cap. Empty-`jobIds` validation stays in the controller so it
   * 400s before either path.
   */
  async requestAutoApply(
    userId: string,
    jobIds: string[],
  ): Promise<{
    queued: boolean;
    jobId?: string | number;
    message: string;
    applications?: ApplicationDocument[];
    count?: number;
  }> {
    if (this.autoApplyQueue) {
      const job = await this.autoApplyQueue.add(JOB_AUTO_APPLY, { userId, jobIds });
      return { queued: true, jobId: job.id, message: 'Auto-application queued' };
    }
    const applications = await this.autoApply(userId, jobIds);
    return {
      queued: false,
      message: 'Auto-application completed',
      applications,
      count: applications.length,
    };
  }

  async autoApply(userId: string, jobIds: string[]): Promise<ApplicationDocument[]> {
    if (!this.autoApplicationEnabled) {
      throw new BadRequestException('Auto-application is disabled');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const applications: ApplicationDocument[] = [];
    let applicationsToday = 0;

    // Count applications made today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayApplications = await this.applicationModel.countDocuments({
      candidateId: userId,
      appliedAt: { $gte: today },
    });
    applicationsToday = todayApplications;

    console.log(`🤖 Starting auto-apply for candidate: ${user.email}`);

    for (const jobId of jobIds) {
      if (applicationsToday >= this.maxApplicationsPerDay) {
        console.log('⚠️ Daily application limit reached');
        break;
      }

      try {
        const job = await this.jobModel.findById(jobId);
        if (!job) {
          console.log(`⚠️ Job ${jobId} not found, skipping`);
          continue;
        }

        // Check if application already exists
        const existingApplication = await this.applicationModel.findOne({
          candidateId: userId,
          jobId: jobId,
        });

        if (existingApplication) {
          console.log(`⚠️ Application already exists for job ${job.title}, skipping`);
          continue;
        }

        // Preferences guardrails
        const prefs = await this.userPreferencesService.getOrCreate(userId);
        if (this.isBlockedByPreferences(job, prefs)) {
          await this.applicationEventsService.recordEvent({
            applicationId: undefined as any,
            userId: user._id,
            type: 'skipped_preferences',
            message: `Skipped ${job.title} due to preferences`,
            meta: { jobId },
          });
          continue;
        }

        // Calculate match
        const match = await this.matchingService.calculateMatch(userId, jobId);

        if (match.matchScore < this.minMatchScore) {
          console.log(
            `❌ Skipping ${job.title} - match score too low (${match.matchScore})`,
          );
          continue;
        }

        // Generate cover letter
        const coverLetter = await this.matchingService.generateCoverLetter(userId, jobId);

        // Create application
        const application = new this.applicationModel({
          candidateId: userId,
          jobId: jobId,
          matchScore: match.matchScore,
          coverLetter,
          status: 'pending',
          appliedAt: new Date(),
          autoApplied: true,
        });

        const saved = await application.save();
        await this.applicationEventsService.recordEvent({
          applicationId: saved._id as any,
          userId: saved.candidateId,
          type: 'queued',
          message: `Queued ${job.title} at ${job.companyName}`,
          meta: { jobId },
        });
        // Cross-surface bridge: mirror into the employer pipeline + notify.
        await this.applicationsService.bridgeApplicationToPipeline(saved);
        applications.push(application);
        applicationsToday++;

        console.log(
          `✅ Applied to: ${job.title} at ${job.companyName} (${match.matchScore}% match)`,
        );
      } catch (error) {
        console.error(`Error applying to job ${jobId}:`, error);
      }
    }

    console.log(`🎉 Auto-applied to ${applications.length} jobs`);
    return applications;
  }

  async shouldAutoApply(userId: string, jobId: string): Promise<{
    shouldApply: boolean;
    matchScore: number;
    reasoning: string;
  }> {
    try {
      const match = await this.matchingService.calculateMatch(userId, jobId);
      return {
        shouldApply: match.matchScore >= this.minMatchScore,
        matchScore: match.matchScore,
        reasoning: match.reasoning || 'Match calculated',
      };
    } catch (error) {
      console.error('Auto-apply check error:', error);
      return {
        shouldApply: false,
        matchScore: 0,
        reasoning: 'Error calculating match',
      };
    }
  }

  getApplicationStats(applications: ApplicationDocument[]): {
    total: number;
    pending: number;
    submitted: number;
    rejected: number;
    averageMatchScore: number;
  } {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === 'pending').length;
    const submitted = applications.filter((a) => a.status === 'submitted').length;
    const rejected = applications.filter((a) => a.status === 'rejected').length;
    const avgMatchScore =
      total > 0
        ? applications.reduce((sum, a) => sum + (a.matchScore || 0), 0) / total
        : 0;

    return {
      total,
      pending,
      submitted,
      rejected,
      averageMatchScore: Math.round(avgMatchScore),
    };
  }

  async submitApplication(applicationId: string): Promise<ApplicationDocument> {
    const application = await this.applicationModel.findById(applicationId);
    if (!application) {
      throw new BadRequestException('Application not found');
    }

    console.log(`📤 Submitting application ${applicationId} to job ${application.jobId}`);

    application.status = 'submitted';
    application.submittedAt = new Date();
    await application.save();

    return application;
  }

  async getApplicationsToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.applicationModel.countDocuments({
      candidateId: userId,
      appliedAt: { $gte: today },
    });
  }

  async canApplyMore(userId: string): Promise<{ canApply: boolean; remaining: number }> {
    const applicationsToday = await this.getApplicationsToday(userId);
    const remaining = Math.max(0, this.maxApplicationsPerDay - applicationsToday);
    return {
      canApply: remaining > 0,
      remaining,
    };
  }

  private isBlockedByPreferences(job: JobDocument, prefs: any): boolean {
    if (!prefs) return false;
    if (prefs.remoteOnly && job.location && !/remote/i.test(job.location)) {
      return true;
    }
    if (prefs.visaSponsorshipNeeded && job.tags && Array.isArray(job.tags)) {
      const mentionsVisa = job.tags.some((t) => /visa/i.test(t));
      if (!mentionsVisa) return true;
    }
    if (prefs.companyBlocklist && prefs.companyBlocklist.length) {
      const company = (job.companyName || '').toLowerCase();
      const blocked = prefs.companyBlocklist.some((c) => company.includes(c.toLowerCase()));
      if (blocked) return true;
    }
    if (prefs.salaryMin && job.salary) {
      const salaryNum = Number(String(job.salary).replace(/[^0-9]/g, ''));
      if (salaryNum && salaryNum < prefs.salaryMin) return true;
    }
    return false;
  }
}
