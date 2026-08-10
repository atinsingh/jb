import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminMetricsService } from './admin-metrics.service';
import { User } from '../schemas/user.schema';
import { Job } from '../schemas/job.schema';
import { Application } from '../schemas/application.schema';
import { EmployerOrg } from '../schemas/employer-org.schema';
import { EmployerSubscription } from '../employer-billing/schemas/employer-subscription.schema';
import { UserSubscription } from '../schemas/user-subscription.schema';
import { IngestionSource } from '../ingestion/schemas/ingestion-source.schema';
import { EMPLOYER_PLAN_PRICES } from './admin.constants';

const model = () => ({
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
});

describe('AdminMetricsService', () => {
  let service: AdminMetricsService;

  const userModel = model();
  const jobModel = model();
  const applicationModel = model();
  const employerOrgModel = model();
  const employerSubscriptionModel = model();
  const userSubscriptionModel = model();
  const ingestionSourceModel = model();

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMetricsService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Job.name), useValue: jobModel },
        { provide: getModelToken(Application.name), useValue: applicationModel },
        { provide: getModelToken(EmployerOrg.name), useValue: employerOrgModel },
        { provide: getModelToken(EmployerSubscription.name), useValue: employerSubscriptionModel },
        { provide: getModelToken(UserSubscription.name), useValue: userSubscriptionModel },
        { provide: getModelToken(IngestionSource.name), useValue: ingestionSourceModel },
      ],
    }).compile();

    service = moduleRef.get<AdminMetricsService>(AdminMetricsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('assembles the full metrics payload from mocked counts + aggregates', async () => {
    // Users: total, byRole, byPlan, active, suspended (countDocuments order = total, active, suspended)
    userModel.countDocuments
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(80) // active
      .mockResolvedValueOnce(5); // suspended
    userModel.aggregate
      .mockResolvedValueOnce([
        { _id: 'ROLE_CANDIDATE', count: 90 },
        { _id: 'ROLE_ADMIN', count: 10 },
      ]) // byRole
      .mockResolvedValueOnce([
        { _id: 'FREE', count: 70 },
        { _id: 'PRO', count: 30 },
      ]); // byPlan

    // Jobs: total, active
    jobModel.countDocuments.mockResolvedValueOnce(50).mockResolvedValueOnce(40);
    jobModel.aggregate
      .mockResolvedValueOnce([{ _id: 'published', count: 40 }]) // byLifecycle
      .mockResolvedValueOnce([{ _id: 'needs_review', count: 8 }]); // byModeration

    // Applications
    applicationModel.countDocuments.mockResolvedValueOnce(200);
    applicationModel.aggregate.mockResolvedValueOnce([
      { _id: 'pending', count: 120 },
      { _id: 'submitted', count: 80 },
    ]);

    // Employers
    employerOrgModel.countDocuments.mockResolvedValueOnce(12);
    employerSubscriptionModel.aggregate.mockResolvedValueOnce([
      { _id: 'free', count: 5 },
      { _id: 'starter', count: 3 },
      { _id: 'growth', count: 2 },
      { _id: 'scale', count: 1 },
    ]);

    // Candidate subscriptions
    userSubscriptionModel.countDocuments.mockResolvedValueOnce(25);

    // Ingestion: sources, enabled
    ingestionSourceModel.countDocuments.mockResolvedValueOnce(6).mockResolvedValueOnce(4);
    ingestionSourceModel.aggregate.mockResolvedValueOnce([
      { _id: 'healthy', count: 4 },
      { _id: 'unknown', count: 2 },
    ]);

    const res = await service.getMetrics();

    expect(res.users).toEqual({
      total: 100,
      byRole: { ROLE_CANDIDATE: 90, ROLE_ADMIN: 10 },
      byPlan: { FREE: 70, PRO: 30 },
      active: 80,
      suspended: 5,
    });
    expect(res.jobs).toEqual({
      total: 50,
      active: 40,
      byLifecycle: { published: 40 },
      byModeration: { needs_review: 8 },
    });
    expect(res.applications).toEqual({
      total: 200,
      byStatus: { pending: 120, submitted: 80 },
    });

    // MRR = 5*0 + 3*99 + 2*299 + 1*799 = 297 + 598 + 799 = 1694
    const expectedMrr =
      5 * EMPLOYER_PLAN_PRICES.free +
      3 * EMPLOYER_PLAN_PRICES.starter +
      2 * EMPLOYER_PLAN_PRICES.growth +
      1 * EMPLOYER_PLAN_PRICES.scale;
    expect(expectedMrr).toBe(1694);
    expect(res.employers).toEqual({
      orgs: 12,
      subscriptions: {
        byPlan: { free: 5, starter: 3, growth: 2, scale: 1 },
        mrrEstimate: 1694,
      },
    });

    expect(res.candidates).toEqual({ subscriptions: 25 });
    expect(res.ingestion).toEqual({
      sources: 6,
      enabled: 4,
      byHealth: { healthy: 4, unknown: 2 },
    });
  });

  it('buckets null aggregate _ids under "unknown" and yields 0 MRR with no subs', async () => {
    userModel.countDocuments.mockResolvedValue(0);
    userModel.aggregate
      .mockResolvedValueOnce([{ _id: null, count: 3 }]) // byRole with null bucket
      .mockResolvedValueOnce([]);
    jobModel.countDocuments.mockResolvedValue(0);
    jobModel.aggregate.mockResolvedValue([]);
    applicationModel.countDocuments.mockResolvedValue(0);
    applicationModel.aggregate.mockResolvedValue([]);
    employerOrgModel.countDocuments.mockResolvedValue(0);
    employerSubscriptionModel.aggregate.mockResolvedValue([]);
    userSubscriptionModel.countDocuments.mockResolvedValue(0);
    ingestionSourceModel.countDocuments.mockResolvedValue(0);
    ingestionSourceModel.aggregate.mockResolvedValue([]);

    const res = await service.getMetrics();

    expect(res.users.byRole).toEqual({ unknown: 3 });
    expect(res.employers.subscriptions.mrrEstimate).toBe(0);
    expect(res.employers.subscriptions.byPlan).toEqual({});
  });
});
