import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingService } from '../billing.service';
import { PinoLogger } from 'nestjs-pino';
import { EmployerBillingService } from '../../employer-billing/employer-billing.service';
import { Types } from 'mongoose';

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
        {
          provide: getModelToken('UserSubscription'),
          useValue: mockSubscriptionModel,
        },
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
      const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

      await expect(service.handleStripeWebhook(payload, invalidSignature)).rejects.toThrow(BadRequestException);

      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }), 'Webhook signature verification failed');
    });

    it('should validate webhook signature format', async () => {
      const payload = Buffer.from(JSON.stringify({ type: 'test' }));
      const malformedSignature = 't=123,v1=abc'; // Malformed but structured

      await expect(service.handleStripeWebhook(payload, malformedSignature)).rejects.toThrow(BadRequestException);
    });

    // Note: Full webhook signature verification requires actual Stripe SDK mocking
    // In production, use Stripe's test webhook secrets and payloads
  });

  describe('getPlans', () => {
    it('replaces seeded candidate prices with the current Stripe amounts', async () => {
      const mockPlans = [
        {
          name: 'Free',
          type: 'FREE',
          sortOrder: 0,
          priceMonthly: 0,
          priceYearly: 0,
        },
        {
          name: 'Paid',
          type: 'PRO',
          sortOrder: 1,
          priceMonthly: 999,
          priceYearly: 9999,
          stripePriceIdMonthly: 'price_paid_monthly',
          stripePriceIdYearly: 'price_paid_yearly',
        },
        {
          name: 'Elite',
          type: 'ELITE',
          sortOrder: 2,
          priceMonthly: 29,
          priceYearly: 290,
        },
      ];

      mockPlanModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockPlans),
      });
      (service as any).stripe = {
        subscriptions: { list: jest.fn().mockResolvedValue({ data: [], has_more: false }) },
        prices: {
          list: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'price_paid_monthly',
                active: true,
                currency: 'usd',
                unit_amount: 1000,
                recurring: { interval: 'month' },
                product: {
                  id: 'prod_VAucq8N2hh10sb',
                  active: true,
                  name: 'Jobocate Paid Tier Monthly',
                  default_price: 'price_paid_monthly',
                  metadata: {},
                },
              },
              {
                id: 'price_paid_yearly',
                active: true,
                currency: 'usd',
                unit_amount: 10000,
                recurring: { interval: 'year' },
                product: {
                  id: 'prod_VAue1EgKKX8FIz',
                  active: true,
                  name: 'Jobocate Paid Tier Yearly',
                  default_price: 'price_paid_yearly',
                  metadata: {},
                },
              },
              {
                id: 'price_other_app_monthly',
                active: true,
                currency: 'usd',
                unit_amount: 9900,
                recurring: { interval: 'month' },
                product: {
                  id: 'prod_other_app_monthly',
                  active: true,
                  name: 'Jobocate Paid Tier Monthly',
                  metadata: {},
                },
              },
              {
                id: 'price_other_app_yearly',
                active: true,
                currency: 'usd',
                unit_amount: 99900,
                recurring: { interval: 'year' },
                product: {
                  id: 'prod_other_app_yearly',
                  active: true,
                  name: 'Jobocate Paid Tier Yearly',
                  metadata: {},
                },
              },
            ],
          }),
        },
      };

      const result = await service.getPlans();

      expect((service as any).stripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({ product: 'prod_VAucq8N2hh10sb' }),
      );
      expect((service as any).stripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({ product: 'prod_VAue1EgKKX8FIz' }),
      );

      expect(result).toEqual([
        expect.objectContaining({
          name: 'Free',
          type: 'FREE',
          priceMonthly: 0,
          priceYearly: 0,
        }),
        expect.objectContaining({
          name: 'Paid',
          type: 'PRO',
          priceMonthly: 10,
          priceYearly: 100,
          currency: 'usd',
          stripeProductIdMonthly: 'prod_VAucq8N2hh10sb',
          stripeProductIdYearly: 'prod_VAue1EgKKX8FIz',
        }),
      ]);
    });

    it('does not expose an inactive legacy plan by id', async () => {
      mockPlanModel.findById.mockResolvedValue({
        _id: 'legacy-id',
        type: 'ELITE',
        isActive: false,
      });

      await expect(service.getPlanById('legacy-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createCheckoutSession', () => {
    it('refuses a second paid subscription even when local webhook state is stale', async () => {
      jest.spyOn(service, 'getPlanById').mockResolvedValue({ _id: { toString: () => 'paid-id' }, type: 'PRO', isActive: true } as any);
      jest.spyOn(service, 'createOrGetStripeCustomer').mockResolvedValue('cus_123');
      const create = jest.fn();
      (service as any).stripe = {
        subscriptions: { list: jest.fn().mockResolvedValue({ data: [{ id: 'sub_active', status: 'active' }] }) },
        checkout: { sessions: { create } },
      };

      await expect(service.createCheckoutSession({ _id: { toString: () => 'user-id' } } as any, {
        planId: 'paid-id', billingCycle: 'monthly',
      })).rejects.toThrow(/already has a subscription/i);
      expect(create).not.toHaveBeenCalled();
    });

    it('rejects active legacy candidate plans before creating a customer', async () => {
      jest.spyOn(service, 'getPlanById').mockResolvedValue({
        _id: { toString: () => 'legacy-id' },
        type: 'ELITE',
        isActive: true,
      } as any);
      const createCustomer = jest
        .spyOn(service, 'createOrGetStripeCustomer')
        .mockResolvedValue('cus_legacy');

      await expect(
        service.createCheckoutSession({ _id: 'user-id' } as any, {
          planId: 'legacy-id',
          billingCycle: 'monthly',
        }),
      ).rejects.toThrow('Only the configured Paid plan can be purchased');
      expect(createCustomer).not.toHaveBeenCalled();
    });

    it('uses the yearly Stripe price without changing the monthly AI reset', async () => {
      const checkoutCreate = jest.fn().mockResolvedValue({
        id: 'cs_year',
        url: 'https://stripe.test/cs_year',
      });
      (service as any).stripe = {
        subscriptions: { list: jest.fn().mockResolvedValue({ data: [], has_more: false }) },
        prices: {
          list: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'price_monthly',
                active: true,
                currency: 'usd',
                unit_amount: 1000,
                recurring: { interval: 'month' },
                product: {
                  id: 'prod_VAucq8N2hh10sb',
                  active: true,
                  name: 'Jobocate Paid Tier Monthly',
                  default_price: 'price_monthly',
                  metadata: {},
                },
              },
              {
                id: 'price_yearly',
                active: true,
                currency: 'usd',
                unit_amount: 10000,
                recurring: { interval: 'year' },
                product: {
                  id: 'prod_VAue1EgKKX8FIz',
                  active: true,
                  name: 'Jobocate Paid Tier Yearly',
                  default_price: 'price_yearly',
                  metadata: {},
                },
              },
            ],
          }),
        },
        checkout: { sessions: { create: checkoutCreate, list: jest.fn().mockResolvedValue({ data: [], has_more: false }) } },
      };
      jest.spyOn(service, 'getPlanById').mockResolvedValue({
        _id: { toString: () => 'paid-id' },
        type: 'PRO',
        isActive: true,
        stripePriceIdMonthly: 'price_monthly',
        stripePriceIdYearly: 'price_yearly',
      } as any);
      jest.spyOn(service, 'createOrGetStripeCustomer').mockResolvedValue('cus_123');
      const user = { _id: { toString: () => 'user-id' } } as any;

      await service.createCheckoutSession(user, {
        planId: 'paid-id',
        billingCycle: 'yearly',
      });

      expect(checkoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_yearly', quantity: 1 }],
          metadata: expect.objectContaining({ billingCycle: 'yearly' }),
        }),
        expect.objectContaining({ idempotencyKey: expect.stringContaining('candidate:user-id:paid-id:yearly:') }),
      );
    });
  });

  it('repairs a paid checkout from Stripe when its webhook was missed', async () => {
    const userId = new Types.ObjectId('6ab40c9b08b05b370ea05250');
    const planId = new Types.ObjectId('6aaac3bbe001ea16154ebefd');
    const user = { _id: userId, currentPlanType: 'FREE', stripeCustomerId: 'cus_paid' } as any;
    const subscription = {
      id: 'sub_paid', customer: 'cus_paid', status: 'active',
      metadata: { userId: String(userId), planId: String(planId), planType: 'PRO' },
      items: { data: [{ price: { product: 'prod_VAue1EgKKX8FIz', recurring: { interval: 'year' } } }] },
      current_period_start: 1760000000, current_period_end: 1790000000,
      cancel_at_period_end: false,
    };
    (service as any).stripe = { subscriptions: { list: jest.fn().mockResolvedValue({ data: [subscription], has_more: false }) } };
    mockPlanModel.findOne.mockResolvedValue({ _id: planId, type: 'PRO', isActive: true });
    mockSubscriptionModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue({ status: 'active', billingCycle: 'yearly' }) });
    mockSubscriptionModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
    mockUserModel.findByIdAndUpdate.mockResolvedValue({});

    const result = await (service as any).getReconciledSubscription(user);

    expect(result.currentPlan).toBe('PRO');
    expect(mockSubscriptionModel.create).toHaveBeenCalledWith(expect.objectContaining({ stripeSubscriptionId: 'sub_paid', billingCycle: 'yearly' }));
    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(String(userId), expect.objectContaining({ currentPlanType: 'PRO' }));
  });

  it('keeps the surviving subscription when Stripe deletes one of two', async () => {
    const survivor = { id: 'sub_new', status: 'active', metadata: { userId: '507f1f77bcf86cd799439011' } };
    (service as any).stripe = {
      subscriptions: { list: jest.fn().mockResolvedValue({ data: [survivor], has_more: false }) },
    };
    const apply = jest.spyOn(service as any, 'handleSubscriptionUpdated').mockResolvedValue(undefined);
    const downgrade = jest.spyOn(service, 'downgradeToFree').mockResolvedValue(undefined);
    mockSubscriptionModel.updateOne.mockResolvedValue({});

    await (service as any).handleSubscriptionDeleted({
      id: 'sub_old', customer: 'cus_123', metadata: { userId: '507f1f77bcf86cd799439011' },
    });

    expect(apply).toHaveBeenCalledWith(survivor);
    expect(downgrade).not.toHaveBeenCalled();
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
