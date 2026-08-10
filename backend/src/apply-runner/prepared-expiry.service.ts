import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { ApplicationEventsService } from '../applications/application-events.service';

/**
 * Expires prepared applications that have gone stale.
 *
 * A preparation describes a form as it looked at a moment in time. Two things
 * invalidate it: enough time passing that the posting may have changed
 * underneath it, and the job closing outright. Neither is a failure — but both
 * mean the parked application must not be submitted as-is.
 *
 * Expiring is always safe. The commit pass ALSO re-checks the fingerprint, so
 * this sweep is about not wasting a candidate's attention on cards that can no
 * longer be sent, rather than about preventing a bad submission.
 */
@Injectable()
export class PreparedExpiryService {
  private readonly logger = new Logger(PreparedExpiryService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
    private readonly events: ApplicationEventsService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS, { name: 'prepared-expiry' })
  async handleCron(): Promise<void> {
    await this.sweep();
  }

  /** Extracted so the cron handler and any manual trigger do the same work. */
  async sweep(): Promise<{ expiredByTtl: number; expiredByClosure: number }> {
    const expiredByTtl = await this.expirePastTtl();
    const expiredByClosure = await this.expireClosedJobs();

    if (expiredByTtl || expiredByClosure) {
      this.logger.log(
        `Expired ${expiredByTtl} prepared application(s) past TTL and ${expiredByClosure} whose job closed.`,
      );
    }
    return { expiredByTtl, expiredByClosure };
  }

  /** Anything parked past its expiry date. */
  private async expirePastTtl(): Promise<number> {
    const stale = await this.applicationModel
      .find({ status: 'awaiting_approval', 'prepared.expiresAt': { $lt: new Date() } })
      .select('_id candidateId atsType')
      .lean();

    for (const app of stale as any[]) {
      await this.expire(app, 'This preparation expired — the posting may have changed since.');
    }
    return stale.length;
  }

  /**
   * Anything parked against a job that is no longer active.
   *
   * Checked separately from the TTL because a job can close the day after it was
   * prepared, long before the seven days are up — and submitting into a closed
   * posting is worse than useless.
   */
  private async expireClosedJobs(): Promise<number> {
    const parked = await this.applicationModel
      .find({ status: 'awaiting_approval' })
      .select('_id candidateId jobId atsType')
      .lean();

    if (!parked.length) return 0;

    const closed = await this.jobModel
      .find({ _id: { $in: parked.map((a: any) => a.jobId) }, isActive: false })
      .select('_id')
      .lean();
    const closedIds = new Set(closed.map((j: any) => String(j._id)));
    if (!closedIds.size) return 0;

    const affected = (parked as any[]).filter((a) => closedIds.has(String(a.jobId)));
    for (const app of affected) {
      await this.expire(app, 'This role was closed by the employer before you approved it.');
    }
    return affected.length;
  }

  private async expire(app: any, message: string): Promise<void> {
    await this.applicationModel
      .updateOne({ _id: app._id }, { $set: { status: 'expired', failReason: message } })
      .exec();

    await this.events.recordEvent({
      applicationId: app._id,
      userId: app.candidateId,
      type: 'ats_expired',
      message,
      meta: { atsType: app.atsType },
    });
  }
}
