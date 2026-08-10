import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { Job } from '../schemas/job.schema';
import { Application } from '../schemas/application.schema';
import { EmployerOrg } from '../schemas/employer-org.schema';
import { EmployerSubscription } from '../employer-billing/schemas/employer-subscription.schema';
import { UserSubscription } from '../schemas/user-subscription.schema';
import { IngestionSource } from '../ingestion/schemas/ingestion-source.schema';
import { EMPLOYER_PLAN_PRICES } from './admin.constants';

/** Shape returned by GET /api/admin/metrics. */
export interface AdminMetrics {
  users: {
    total: number;
    byRole: Record<string, number>;
    byPlan: Record<string, number>;
    active: number;
    suspended: number;
  };
  jobs: {
    total: number;
    active: number;
    byLifecycle: Record<string, number>;
    byModeration: Record<string, number>;
  };
  applications: {
    total: number;
    byStatus: Record<string, number>;
  };
  employers: {
    orgs: number;
    subscriptions: {
      byPlan: Record<string, number>;
      mrrEstimate: number;
    };
  };
  candidates: {
    subscriptions: number;
  };
  ingestion: {
    sources: number;
    enabled: number;
    byHealth: Record<string, number>;
  };
}

@Injectable()
export class AdminMetricsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<any>,
    @InjectModel(Job.name) private readonly jobModel: Model<any>,
    @InjectModel(Application.name) private readonly applicationModel: Model<any>,
    @InjectModel(EmployerOrg.name) private readonly employerOrgModel: Model<any>,
    @InjectModel(EmployerSubscription.name)
    private readonly employerSubscriptionModel: Model<any>,
    @InjectModel(UserSubscription.name)
    private readonly userSubscriptionModel: Model<any>,
    @InjectModel(IngestionSource.name)
    private readonly ingestionSourceModel: Model<any>,
  ) {}

  /**
   * Collapse a `$group` aggregate of shape [{ _id, count }] into a plain
   * { [_id]: count } map. Null/undefined `_id`s are bucketed under 'unknown'.
   */
  private toMap(rows: Array<{ _id: any; count: number }>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const row of rows || []) {
      const key = row._id === null || row._id === undefined ? 'unknown' : String(row._id);
      out[key] = row.count;
    }
    return out;
  }

  private groupBy(model: Model<any>, field: string) {
    return model.aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  }

  async getMetrics(): Promise<AdminMetrics> {
    const [
      usersTotal,
      usersByRole,
      usersByPlan,
      usersActive,
      usersSuspended,
      jobsTotal,
      jobsActive,
      jobsByLifecycle,
      jobsByModeration,
      appsTotal,
      appsByStatus,
      orgs,
      empSubsByPlan,
      candidateSubs,
      ingestionSources,
      ingestionEnabled,
      ingestionByHealth,
    ] = await Promise.all([
      this.userModel.countDocuments({}),
      this.groupBy(this.userModel, 'role'),
      this.groupBy(this.userModel, 'currentPlanType'),
      this.userModel.countDocuments({ isActive: true }),
      this.userModel.countDocuments({ suspended: true }),
      this.jobModel.countDocuments({}),
      this.jobModel.countDocuments({ isActive: true }),
      this.groupBy(this.jobModel, 'lifecycle'),
      this.groupBy(this.jobModel, 'moderationStatus'),
      this.applicationModel.countDocuments({}),
      this.groupBy(this.applicationModel, 'status'),
      this.employerOrgModel.countDocuments({}),
      this.groupBy(this.employerSubscriptionModel, 'plan'),
      this.userSubscriptionModel.countDocuments({}),
      this.ingestionSourceModel.countDocuments({}),
      this.ingestionSourceModel.countDocuments({ enabled: true }),
      this.groupBy(this.ingestionSourceModel, 'health'),
    ]);

    const byPlan = this.toMap(empSubsByPlan);
    const mrrEstimate = Object.entries(byPlan).reduce(
      (sum, [plan, count]) => sum + (EMPLOYER_PLAN_PRICES[plan] ?? 0) * count,
      0,
    );

    return {
      users: {
        total: usersTotal,
        byRole: this.toMap(usersByRole),
        byPlan: this.toMap(usersByPlan),
        active: usersActive,
        suspended: usersSuspended,
      },
      jobs: {
        total: jobsTotal,
        active: jobsActive,
        byLifecycle: this.toMap(jobsByLifecycle),
        byModeration: this.toMap(jobsByModeration),
      },
      applications: {
        total: appsTotal,
        byStatus: this.toMap(appsByStatus),
      },
      employers: {
        orgs,
        subscriptions: { byPlan, mrrEstimate },
      },
      candidates: {
        subscriptions: candidateSubs,
      },
      ingestion: {
        sources: ingestionSources,
        enabled: ingestionEnabled,
        byHealth: this.toMap(ingestionByHealth),
      },
    };
  }
}
