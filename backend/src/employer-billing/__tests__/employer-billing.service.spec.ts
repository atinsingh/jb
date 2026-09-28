import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { EmployerBillingService } from '../employer-billing.service';
import { EmployerSubscription } from '../schemas/employer-subscription.schema';

/**
 * `applyStripeSubscription` is the only code path that may raise an employer's
 * tier, so these tests pin both directions: an active subscription grants the
 * plan's limits, and anything that isn't currently paid falls back to free
 * rather than leaving a lapsed employer on a paid tier.
 */
describe('EmployerBillingService', () => {
  let service: EmployerBillingService;
  let doc: any;

  // Must be ObjectId-shaped: getOrCreateSubscription casts it.
  const OWNER_ID = '6a75f4b08b17b92734f48657';

  const stripeSubscription = (overrides: any = {}): any => ({
    id: 'sub_test_123',
    customer: 'cus_test_123',
    status: 'active',
    cancel_at_period_end: false,
    current_period_end: 1893456000,
    items: { data: [{ price: { recurring: { interval: 'month' } } }] },
    metadata: { audience: 'employer', ownerId: OWNER_ID, plan: 'paid' },
    ...overrides,
  });

  beforeEach(async () => {
    doc = {
      ownerId: OWNER_ID,
      plan: 'free',
      billingCycle: 'monthly',
      status: 'active',
      jobSlotsLimit: 1,
      seatsLimit: 1,
      sourcingCreditsLimit: 10,
      invoices: [],
      save: jest.fn().mockImplementation(function (this: any) {
        return Promise.resolve(doc);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerBillingService,
        {
          provide: getModelToken(EmployerSubscription.name),
          useValue: {
            findOneAndUpdate: jest.fn().mockReturnValue({ exec: () => Promise.resolve(doc) }),
            findOne: jest.fn().mockResolvedValue(doc),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_k: string, d?: any) => d ?? '') },
        },
      ],
    }).compile();

    service = module.get<EmployerBillingService>(EmployerBillingService);
  });

  describe('applyStripeSubscription', () => {
    it('grants the plan limits for an active subscription', async () => {
      await service.applyStripeSubscription(stripeSubscription());

      expect(doc.plan).toBe('paid');
      expect(doc).not.toHaveProperty('aiActionsLimit');
      expect(doc.jobSlotsLimit).toBe(3);
      expect(doc.seatsLimit).toBe(3);
      expect(doc.stripeSubscriptionId).toBe('sub_test_123');
      expect(doc.stripeCustomerId).toBe('cus_test_123');
      expect(doc.save).toHaveBeenCalled();
    });

    it('reads the billing cycle from the Stripe price interval', async () => {
      await service.applyStripeSubscription(
        stripeSubscription({
          items: { data: [{ price: { recurring: { interval: 'year' } } }] },
        }),
      );

      expect(doc.billingCycle).toBe('annual');
    });

    it('drops a past_due employer back to free limits', async () => {
      await service.applyStripeSubscription(stripeSubscription({ status: 'past_due' }));

      expect(doc.plan).toBe('free');
      expect(doc).not.toHaveProperty('aiActionsLimit');
      expect(doc.status).toBe('past_due');
    });

    it('drops a canceled employer back to free limits', async () => {
      await service.applyStripeSubscription(stripeSubscription({ status: 'canceled' }));

      expect(doc.plan).toBe('free');
      expect(doc).not.toHaveProperty('aiActionsLimit');
    });

    it('keeps a trialing employer on the paid tier', async () => {
      await service.applyStripeSubscription(
        stripeSubscription({
          status: 'trialing',
          metadata: { audience: 'employer', ownerId: OWNER_ID, plan: 'paid' },
        }),
      );

      expect(doc.plan).toBe('paid');
      expect(doc).not.toHaveProperty('aiActionsLimit');
    });

    it('ignores a subscription with no ownerId rather than guessing', async () => {
      await service.applyStripeSubscription(stripeSubscription({ metadata: { audience: 'employer' } }));

      expect(doc.plan).toBe('free');
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('ignores an unknown plan key rather than falling back to a paid tier', async () => {
      await service.applyStripeSubscription(
        stripeSubscription({
          metadata: {
            audience: 'employer',
            ownerId: OWNER_ID,
            plan: 'platinum',
          },
        }),
      );

      expect(doc.plan).toBe('free');
      expect(doc.save).not.toHaveBeenCalled();
    });
  });

  describe('upgrade', () => {
    it('refuses a second paid employer subscription even if the local record says free', async () => {
      const create = jest.fn();
      (service as any).stripe = {
        subscriptions: { list: jest.fn().mockResolvedValue({ data: [{ id: 'sub_active', status: 'active' }] }) },
        checkout: { sessions: { create } },
      };
      doc.stripeCustomerId = 'cus_123';
      await expect(service.upgrade(OWNER_ID, { plan: 'paid' })).rejects.toThrow(/already has a subscription/i);
      expect(create).not.toHaveBeenCalled();
    });

    it('ignores cancellation of an old subscription when a different paid subscription is current', async () => {
      doc.plan = 'paid';
      doc.stripeSubscriptionId = 'sub_new';
      await service.applyStripeSubscription(stripeSubscription({ status: 'canceled', id: 'sub_old' }));
      expect(doc.plan).toBe('paid');
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('refuses the removed enterprise plan', async () => {
      await expect(service.upgrade(OWNER_ID, { plan: 'enterprise' })).rejects.toThrow(/unknown plan/i);
      expect(doc.plan).toBe('free');
    });

    it('refuses an unknown plan', async () => {
      await expect(service.upgrade(OWNER_ID, { plan: 'platinum' })).rejects.toThrow(/unknown plan/i);
    });

    it('does not touch the subscription when checkout cannot be created', async () => {
      // No Stripe key in this module, so price resolution fails — the important
      // part is that the employer is not upgraded on the way through.
      await expect(service.upgrade(OWNER_ID, { plan: 'paid' })).rejects.toBeDefined();

      expect(doc.plan).toBe('free');
      expect(doc).not.toHaveProperty('aiActionsLimit');
      expect(doc.invoices).toEqual([]);
    });
  });

  describe('recordInvoice', () => {
    it('stores the amount in dollars, not Stripe minor units', async () => {
      await service.recordInvoice({
        customer: 'cus_test_123',
        created: 1893456000,
        amount_paid: 29900,
        status: 'paid',
        number: 'INV-001',
        lines: { data: [{ description: 'Growth plan' }] },
      } as any);

      expect(doc.invoices).toHaveLength(1);
      expect(doc.invoices[0]).toEqual(
        expect.objectContaining({
          amount: 299,
          status: 'paid',
          description: 'Growth plan',
        }),
      );
    });
  });

  describe('getPlans', () => {
    it('builds paid employer tiers and prices from the active Stripe catalog', async () => {
      (service as any).stripe = {
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
                  name: 'Paid Plan Monthly',
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
                  name: 'Paid Plan Yearly',
                  default_price: 'price_paid_yearly',
                  metadata: {},
                },
              },
              {
                id: 'price_other_starter_monthly',
                active: true,
                currency: 'cad',
                unit_amount: 99900,
                recurring: { interval: 'month' },
                product: {
                  id: 'prod_other_starter_monthly',
                  active: true,
                  name: 'Starter Plan Monthly',
                  metadata: {},
                },
              },
            ],
          }),
        },
      };

      const res = await service.getPlans(OWNER_ID);
      const byKey = Object.fromEntries(res.plans.map((p) => [p.key, p]));

      expect((service as any).stripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({ product: 'prod_VAucq8N2hh10sb' }),
      );
      expect((service as any).stripe.prices.list).not.toHaveBeenCalledWith(
        expect.objectContaining({ product: 'prod_other_starter_monthly' }),
      );

      expect(res.currentPlan).toBe('free');
      expect(byKey.free.current).toBe(true);
      expect(res.plans.map((p) => p.key)).toEqual(['free', 'paid']);
      expect(byKey.paid).toEqual(
        expect.objectContaining({
          name: 'Paid',
          priceMonthly: 10,
          priceYearly: 100,
          currency: 'usd',
          stripePriceIdMonthly: 'price_paid_monthly',
          stripePriceIdYearly: 'price_paid_yearly',
        }),
      );
    });
  });
});
