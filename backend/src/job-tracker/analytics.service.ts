import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { MockInterviewSession, MockInterviewSessionDocument } from '../schemas/mock-interview-session.schema';
import { isQueueEnabled } from '../queue/queue.constants';
import {
  QUEUE_CRON,
  JOB_ANALYTICS,
  JOBID_ANALYTICS,
  CRON_ANALYTICS,
} from '../queue/cron-queue.constants';

export interface ApplicationAnalytics {
  userId: string;
  period: string; // e.g., "2024-01"
  totalApplications: number;
  byStatus: Record<string, number>;
  averageMatchScore: number;
  interviewCount: number;
  averageInterviewScore: number;
  createdAt: Date;
}

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(MockInterviewSession.name)
    private interviewSessionModel: Model<MockInterviewSessionDocument>,
    // Present only when QUEUE_ENABLED=true; else @Optional → undefined (inline).
    @Optional() @InjectQueue(QUEUE_CRON) private readonly cronQueue?: Queue,
  ) {}

  /** Register the repeatable monthly-analytics job with a stable jobId when queues own it. */
  async onModuleInit(): Promise<void> {
    if (!this.cronQueue) return;
    await this.cronQueue.add(
      JOB_ANALYTICS,
      {},
      { repeat: { cron: CRON_ANALYTICS }, jobId: JOBID_ANALYTICS },
    );
  }

  /**
   * Generate analytics for a user
   */
  async generateUserAnalytics(
    userId: string,
    period?: string,
  ): Promise<ApplicationAnalytics> {
    const targetPeriod = period || this.getCurrentPeriod();

    // Get applications for the period
    const periodStart = this.getPeriodStart(targetPeriod);
    const periodEnd = this.getPeriodEnd(targetPeriod);

    const applications = await this.applicationModel
      .find({
        candidateId: userId,
        appliedAt: { $gte: periodStart, $lte: periodEnd },
      })
      .exec();

    // Calculate statistics
    const byStatus: Record<string, number> = {};
    let totalMatchScore = 0;
    let matchScoreCount = 0;

    for (const app of applications) {
      byStatus[app.status || 'pending'] = (byStatus[app.status || 'pending'] || 0) + 1;
      if (app.matchScore) {
        totalMatchScore += app.matchScore;
        matchScoreCount++;
      }
    }

    const averageMatchScore = matchScoreCount > 0 ? totalMatchScore / matchScoreCount : 0;

    // Get interview sessions
    const interviewSessions = await this.interviewSessionModel
      .find({
        userId,
        completedAt: { $gte: periodStart, $lte: periodEnd },
        status: 'completed',
      })
      .exec();

    const interviewCount = interviewSessions.length;
    const totalInterviewScore = interviewSessions
      .map((s) => s.overallScore || 0)
      .reduce((sum, score) => sum + score, 0);
    const averageInterviewScore =
      interviewCount > 0 ? totalInterviewScore / interviewCount : 0;

    return {
      userId,
      period: targetPeriod,
      totalApplications: applications.length,
      byStatus,
      averageMatchScore,
      interviewCount,
      averageInterviewScore,
      createdAt: new Date(),
    };
  }

  /**
   * Background job: Aggregate analytics monthly
   * Runs on the 1st of every month
   */
  @Cron('0 0 1 * *')
  async aggregateMonthlyAnalytics() {
    // Queues own scheduling when enabled → decorator no-ops (avoid double run).
    if (isQueueEnabled()) return;
    return this.runAnalyticsOnce();
  }

  /**
   * Aggregate monthly analytics — called by both the @Cron handler (queues off)
   * and the Bull processor (queues on) so both paths do identical work.
   */
  async runAnalyticsOnce() {
    this.logger.log('Aggregating monthly analytics...');

    // Get all unique user IDs with applications
    const users = await this.applicationModel.distinct('candidateId').exec();

    for (const userId of users) {
      try {
        const previousPeriod = this.getPreviousPeriod();
        const analytics = await this.generateUserAnalytics(
          userId.toString(),
          previousPeriod,
        );

        // In a real implementation, save to analytics collection
        this.logger.log(
          `Generated analytics for user ${userId} for period ${analytics.period}`,
        );
      } catch (error) {
        this.logger.error(`Error generating analytics for user ${userId}:`, error);
      }
    }

    this.logger.log('Monthly analytics aggregation completed');
  }

  /**
   * Get current period (YYYY-MM)
   */
  private getCurrentPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get previous period
   */
  private getPreviousPeriod(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get period start date
   */
  private getPeriodStart(period: string): Date {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  /**
   * Get period end date
   */
  private getPeriodEnd(period: string): Date {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month, 0, 23, 59, 59, 999);
  }
}

