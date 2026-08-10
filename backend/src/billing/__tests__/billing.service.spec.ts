import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { PinoLogger } from 'nestjs-pino';
import { EmployerBillingService } from '../../employer-billing/employer-billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let mockConfigService: Partial<ConfigService>;
  let mockLogger: Partial<PinoLogger>;

  const mockUserModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPlanModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  };

  const mockSubscriptionModel = {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockUsageModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          STRIPE_SECRET_KEY: 'sk_test_mock',
          STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
          FRONTEND_URL: 'http://localhost:3000',
        };
        return config[key] ?? defaultValue;
      }),
    };

    mockLogger = {
      setContext: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('SubscriptionPlan'), useValue: mockPlanModel },
        { provide: getModelToken('UserSubscription'), useValue: mockSubscriptionModel },
        { provide: getModelToken('UsageRecord'), useValue: mockUsageModel },
        { provide: PinoLogger, useValue: mockLogger },
        // BillingService routes employer-tagged webhook events here; these unit
        // tests only exercise candidate paths, so a stub is enough.
        {
          provide: EmployerBillingService,
          useValue: {
            applyStripeSubscription: jest.fn(),
            recordInvoice: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleStripeWebhook', () => {
    it('should throw BadRequestException for invalid signature', async () => {
      const payload = Buffer.from('invalid payload');
      const invalidSignature = 'invalid_signature';

      // BillingService logs via its own `new Logger(BillingService.name)`
      // (NestJS Logger), not the injected PinoLogger — spy on the real instance.
      const errorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.handleStripeWebhook(payload, invalidSignature),
      ).rejects.toThrow(BadRequestException);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
        'Webhook signature verification failed',
      );
    });

    it('should validate webhook signature format', async () => {
      const payload = Buffer.from(JSON.stringify({ type: 'test' }));
      const malformedSignature = 't=123,v1=abc'; // Malformed but structured

      await expect(
        service.handleStripeWebhook(payload, malformedSignature),
      ).rejects.toThrow(BadRequestException);
    });

    // Note: Full webhook signature verification requires actual Stripe SDK mocking
    // In production, use Stripe's test webhook secrets and payloads
  });

  describe('getPlans', () => {
    it('should return active plans sorted by order', async () => {
      const mockPlans = [
        { name: 'Free', type: 'FREE', sortOrder: 0 },
        { name: 'Pro', type: 'PRO', sortOrder: 1 },
      ];

      mockPlanModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockPlans),
      });

      const result = await service.getPlans();

      expect(mockPlanModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(mockPlans);
    });
  });

  describe('recordUsage', () => {
    it('should increment usage for a feature', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const featureKey = 'job_applications_per_month';

      // getUserSubscription() chains .findOne(...).populate('planId')
      mockSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      });

      mockUsageModel.findOneAndUpdate.mockResolvedValue({
        userId,
        featureKey,
        count: 5,
      });

      const result = await service.recordUsage(userId, featureKey, 1);

      expect(mockUsageModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result.count).toBe(5);
    });
  });

  describe('getUsage', () => {
    it('should return current usage for a feature', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const featureKey = 'ai_credits_per_month';

      // getUserSubscription() chains .findOne(...).populate('planId')
      mockSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      });

      mockUsageModel.findOne.mockResolvedValue({
        count: 42,
      });

      const result = await service.getUsage(userId, featureKey);

      expect(result).toBe(42);
    });

    it('should return 0 if no usage record exists', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const featureKey = 'ai_credits_per_month';

      // getUserSubscription() chains .findOne(...).populate('planId')
      mockSubscriptionModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      mockUsageModel.findOne.mockResolvedValue(null);

      const result = await service.getUsage(userId, featureKey);

      expect(result).toBe(0);
    });
  });
});

