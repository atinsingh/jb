import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { EntitlementService } from '../entitlement.service';
import { PinoLogger } from 'nestjs-pino';
import { FeatureKeys } from '@jobocate/contracts';

describe('EntitlementService', () => {
  let service: EntitlementService;
  let mockLogger: Partial<PinoLogger>;

  const mockUserModel = {
    findById: jest.fn(),
  };

  const mockEntitlementModel = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockPlanModel = {
    findOne: jest.fn(),
  };

  const mockUsageModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
  };

  const mockSubscriptionModel = {
    findOne: jest.fn(),
  };

  const testUserId = new Types.ObjectId().toString();
  const testPlanId = new Types.ObjectId();

  beforeEach(async () => {
    mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementService,
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('PlanEntitlement'), useValue: mockEntitlementModel },
        { provide: getModelToken('SubscriptionPlan'), useValue: mockPlanModel },
        { provide: getModelToken('UsageRecord'), useValue: mockUsageModel },
        { provide: getModelToken('UserSubscription'), useValue: mockSubscriptionModel },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<EntitlementService>(EntitlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deducts candidate AI action credits with a database-side limit guard', async () => {
    mockUserModel.findById.mockResolvedValue({ _id: testUserId, currentPlanType: 'PRO' });
    mockPlanModel.findOne.mockResolvedValue({ _id: testPlanId, name: 'Paid', type: 'PRO' });
    mockEntitlementModel.findOne.mockResolvedValue({
      featureKey: 'ai_credits_per_month', featureName: 'AI Actions per Month', type: 'limit', value: 100,
    });
    mockSubscriptionModel.findOne.mockResolvedValue(null);
    mockUsageModel.findOne.mockResolvedValue({ count: 99 });
    mockUsageModel.findOneAndUpdate.mockResolvedValue({ count: 100 });

    const result = await service.consumeActionCredit(testUserId, 'ai_credits_per_month');

    expect(result.allowed).toBe(true);
    expect(mockUsageModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ count: { $lt: 100 } }),
      expect.objectContaining({ $inc: { count: 1 } }),
      expect.objectContaining({ new: true }),
    );
    expect(mockUsageModel.create).not.toHaveBeenCalled();
  });

  it('denies a racing candidate credit deduction once another review reaches the plan limit', async () => {
    mockUserModel.findById.mockResolvedValue({ _id: testUserId, currentPlanType: 'FREE' });
    mockPlanModel.findOne.mockResolvedValue({ _id: testPlanId, name: 'Free', type: 'FREE' });
    mockEntitlementModel.findOne.mockResolvedValue({
      featureKey: 'ai_credits_per_month', featureName: 'AI Actions per Month', type: 'limit', value: 25,
    });
    mockSubscriptionModel.findOne.mockResolvedValue(null);
    mockUsageModel.findOne
      .mockResolvedValueOnce({ count: 24 })
      .mockResolvedValueOnce({ count: 25 });
    mockUsageModel.findOneAndUpdate.mockResolvedValue(null);

    const result = await service.consumeActionCredit(testUserId, 'ai_credits_per_month');
    expect(result.allowed).toBe(false);
    expect(mockUsageModel.create).not.toHaveBeenCalled();
  });

  it('uses a monthly AI action window even for an annual paid subscription', async () => {
    mockUserModel.findById.mockResolvedValue({ _id: testUserId, currentPlanType: 'PRO' });
    mockPlanModel.findOne.mockResolvedValue({ _id: testPlanId, name: 'Paid', type: 'PRO' });
    mockEntitlementModel.findOne.mockResolvedValue({
      featureKey: 'ai_credits_per_month', featureName: 'AI Actions per Month', type: 'limit', value: 100,
    });
    mockSubscriptionModel.findOne.mockResolvedValue({
      currentPeriodStart: new Date('2026-01-01'), currentPeriodEnd: new Date('2027-01-01'),
    });
    mockUsageModel.findOne.mockResolvedValue({ count: 1 });
    mockUsageModel.findOneAndUpdate.mockResolvedValue({ count: 2 });

    await service.consumeActionCredit(testUserId, 'ai_credits_per_month');

    const filter = mockUsageModel.findOneAndUpdate.mock.calls[0][0];
    expect(filter.periodStart.getMonth()).toBe(new Date().getMonth());
    expect(filter.periodStart.getFullYear()).toBe(new Date().getFullYear());
  });

  describe('checkEntitlement - Boolean Features', () => {
    it('should allow access when boolean entitlement is true', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'PRO',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Pro',
        type: 'PRO',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
        featureName: 'AI Resume Optimization',
        type: 'boolean',
        value: true,
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
      });

      expect(result.allowed).toBe(true);
      expect(result.currentValue).toBe(true);
    });

    it('should deny access when boolean entitlement is false', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'FREE',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Free',
        type: 'FREE',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
        featureName: 'AI Resume Optimization',
        type: 'boolean',
        value: false,
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
      });

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('requires upgrade');
    });
  });

  describe('checkEntitlement - Limit Features', () => {
    it('should allow access when under limit', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'PRO',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Pro',
        type: 'PRO',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH,
        featureName: 'Job Applications per Month',
        type: 'limit',
        value: 50,
      });

      mockSubscriptionModel.findOne.mockResolvedValue({
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      mockUsageModel.findOne.mockResolvedValue({
        count: 10,
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH,
      });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.usage).toBe(10);
      expect(result.remaining).toBe(40);
    });

    it('should deny access when at limit', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'FREE',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Free',
        type: 'FREE',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH,
        featureName: 'Job Applications per Month',
        type: 'limit',
        value: 5,
      });

      mockSubscriptionModel.findOne.mockResolvedValue(null);

      mockUsageModel.findOne.mockResolvedValue({
        count: 5,
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toContain('Limit reached');
    });

    it('should allow unlimited access when value is -1', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'ELITE',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Elite',
        type: 'ELITE',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH,
        featureName: 'Job Applications per Month',
        type: 'limit',
        value: -1, // Unlimited
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH,
      });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
      expect(result.message).toBe('Unlimited');
    });

    it('should increment usage when incrementUsage is true', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'PRO',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Pro',
        type: 'PRO',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.AI_CREDITS_PER_MONTH,
        featureName: 'AI Credits per Month',
        type: 'limit',
        value: 100,
      });

      mockSubscriptionModel.findOne.mockResolvedValue({
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      mockUsageModel.findOne.mockResolvedValue({
        count: 50,
      });

      mockUsageModel.findOneAndUpdate.mockResolvedValue({
        count: 51,
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.AI_CREDITS_PER_MONTH,
        incrementUsage: true,
      });

      expect(result.allowed).toBe(true);
      expect(mockUsageModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('checkEntitlement - Tier Features', () => {
    it('should allow access when tier matches', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'ELITE',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Elite',
        type: 'ELITE',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.AGENT_TYPE,
        featureName: 'Agent Type',
        type: 'tier',
        value: 'human',
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.AGENT_TYPE,
        requiredValue: 'human',
      });

      expect(result.allowed).toBe(true);
      expect(result.currentValue).toBe('human');
    });

    it('should deny access when tier is lower than required', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'PRO',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Pro',
        type: 'PRO',
      });

      mockEntitlementModel.findOne.mockResolvedValue({
        featureKey: FeatureKeys.AGENT_TYPE,
        featureName: 'Agent Type',
        type: 'tier',
        value: 'ai',
      });

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.AGENT_TYPE,
        requiredValue: 'human',
      });

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('requires "human" tier');
    });
  });

  describe('checkEntitlement - Edge Cases', () => {
    it('should deny access when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
      });

      expect(result.allowed).toBe(false);
      expect(result.message).toBe('User not found');
    });

    it('should deny access when plan not found', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'NONEXISTENT',
      });

      mockPlanModel.findOne.mockResolvedValue(null);

      const result = await service.checkEntitlement(testUserId, {
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
      });

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Plan not found');
    });

    it('should deny access when feature not defined for plan', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: testUserId,
        currentPlanType: 'FREE',
      });

      mockPlanModel.findOne.mockResolvedValue({
        _id: testPlanId,
        name: 'Free',
        type: 'FREE',
      });

      mockEntitlementModel.findOne.mockResolvedValue(null);

      const result = await service.checkEntitlement(testUserId, {
        featureKey: 'some_unknown_feature',
      });

      expect(result.allowed).toBe(false);
      expect(result.message).toContain('not available');
    });
  });
});

