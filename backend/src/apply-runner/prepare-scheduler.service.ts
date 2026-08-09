import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { JobProfile, JobProfileDocument } from '../schemas/job-profile.schema';
import { EligibleJobsService } from '../matching/eligible-jobs.service';
import { ApplyRunnerService } from './apply-runner.service';

/** Daily submission cap, shared with the legacy auto-apply path. */
const MAX_APPLICATIONS_PER_DAY = Number(process.env.MAX_APPLICATIONS_PER_DAY || 20);

/**
 * Decides WHICH applications get prepared, and when to stop.
 *
 * Runs hourly over every active job profile that has auto-apply switched on.
 * Four gates, all of which must pass before a single browser is launched:
 *
 *   1. The profile is active and `autoApply` is on.
 *   2. The match scores at or above the profile's own `minMatchScore`.
 *   3. `eligibility.autoApplySafe` — which already folds in the geography gate,
 *      so nothing outside the profile's target countries is ever prepared.
 *   4. The candidate has room under `MAX_UNREVIEWED_PREPARES`.
 *
 * Gate 4 is the one people forget. Without it, a candidate who ignores the app
 * for a week returns to a hundred stale applications filled against forms that
 * have since changed. Preparation runs at the speed the human reviews.
 */
@Injectable()
export class PrepareSchedulerService {
  private readonly logger = new Logger(PrepareSchedulerService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(JobProfile.name)
    private readonly profileModel: Model<JobProfileDocument>,
    private readonly eligibleJobs: EligibleJobsService,
    private readonly runner: ApplyRunnerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'auto-prepare' })
  async handleCron(): Promise<void> {
    if (process.env.AUTO_PREPARE_ENABLED === 'false') {
      this.logger.log('AUTO_PREPARE_ENABLED=false — skipping.');
      return;
    }
    await this.runSweep();
  }

  /**
   * The actual work, extracted so the cron handler and any queued path do
   * exactly the same thing (the pattern used by the other schedulers here).
   */
  async runSweep(): Promise<{ profiles: number; prepared: number }> {
    const profiles = await this.profileModel
      .find({ active: true, autoApply: true })
      .lean();

    let prepared = 0;
    for (const profile of profiles as any[]) {
      try {
        prepared += await this.prepareForProfile(profile);
      } catch (err) {
        this.logger.error(
          `Auto-prepare failed for profile ${profile._id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    if (prepared) this.logger.log(`Auto-prepare: ${prepared} application(s) prepared.`);
    return { profiles: profiles.length, prepared };
  }

  /** Prepare up to the remaining capacity for one profile. */
  private async prepareForProfile(profile: any): Promise<number> {
    const candidateId = String(profile.userId);

    // Gate 4 first — it is the cheapest and stops all browser work.
    if (!(await this.runner.hasPrepareCapacity(candidateId))) {
      this.logger.debug(`Candidate ${candidateId} is at the unreviewed-prepare ceiling.`);
      return 0;
    }

    if (await this.atDailyCap(candidateId)) {
      this.logger.debug(`Candidate ${candidateId} has hit the daily application cap.`);
      return 0;
    }

    const threshold = Number(profile.minMatchScore ?? 75);
    const { jobs } = await this.eligibleJobs.getEligibleJobs(candidateId, {
      profileId: String(profile._id),
      limit: 60,
    });

    // Gates 2 and 3. `autoApplySafe` already requires ELIGIBLE status, high
    // geographic confidence, AND the job sitting inside the profile's targets.
    const candidates = (jobs || []).filter(
      (j: any) => j.eligibility?.autoApplySafe && (j.matchScore || 0) >= threshold,
    );

    let count = 0;
    for (const job of candidates) {
      if (!(await this.runner.hasPrepareCapacity(candidateId))) break;
      if (await this.atDailyCap(candidateId)) break;

      const application = await this.createIfAbsent(candidateId, job, profile);
      if (!application) continue;

      const result = await this.runner.prepareOne(String(application._id));
      if (result.status === 'awaiting_approval') count += 1;
    }

    return count;
  }

  /**
   * Create the application row a prepare can claim, unless the candidate has
   * already applied to this job. Returns null when one already exists.
   */
  private async createIfAbsent(
    candidateId: string,
    job: any,
    profile: any,
  ): Promise<ApplicationDocument | null> {
    const existing = await this.applicationModel
      .findOne({ candidateId: new Types.ObjectId(candidateId), jobId: job.id })
      .exec();
    if (existing) return null;

    return this.applicationModel.create({
      candidateId: new Types.ObjectId(candidateId),
      jobId: job.id,
      profileId: profile._id,
      matchScore: job.matchScore || 0,
      autoApplied: true,
      appliedBy: 'ai',
      status: 'pending',
      source: job.source || '',
    });
  }

  /** Submissions per calendar day, counted the same way the legacy path does. */
  private async atDailyCap(candidateId: string): Promise<boolean> {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const today = await this.applicationModel
      .countDocuments({
        candidateId: new Types.ObjectId(candidateId),
        appliedAt: { $gte: midnight },
      })
      .exec();

    return today >= MAX_APPLICATIONS_PER_DAY;
  }
}
