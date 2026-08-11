import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';

/**
 * GET /api/users/invoices had no backing endpoint at all — the frontend built
 * a full invoices UI (loading state, empty state, a table) against a route that
 * did not exist anywhere on the backend, so the billing page 404'd on every
 * load. `getUserInvoices` is the fix: Stripe is already the source of truth for
 * the subscription itself, so invoices are read live from Stripe rather than
 * mirrored into a second local table that could drift.
 */
describe('BillingService.getUserInvoices', () => {
  const configValue = (key: string, fallback?: string) =>
    ({ STRIPE_SECRET_KEY: 'sk_test_dummy' })[key] ?? fallback;

  const buildService = (userDoc: any, stripeInvoices: any) => {
    const userModel: any = { findById: jest.fn().mockResolvedValue(userDoc) };
    const configService = { get: jest.fn(configValue) } as unknown as ConfigService;

    const service = new BillingService(
      userModel,
      {} as any,
      {} as any,
      {} as any,
      configService,
      {} as any,
    );

    // The constructor builds a real Stripe client from the (fake) secret key.
    // Swapping the `invoices` surface for a stub is the same pattern the rest
    // of this codebase uses for provider clients it does not want to hit for
    // real in a unit test.
    (service as any).stripe = {
      invoices: { list: jest.fn().mockResolvedValue(stripeInvoices) },
    };

    return service;
  };

  it('returns an empty list for a user who never checked out — no error, a real empty state', async () => {
    const service = buildService({ stripeCustomerId: undefined }, { data: [] });

    const invoices = await service.getUserInvoices('user-1');

    expect(invoices).toEqual([]);
    // No Stripe customer means no reason to call Stripe at all.
    expect((service as any).stripe.invoices.list).not.toHaveBeenCalled();
  });

  it('returns an empty list when the user record itself is missing', async () => {
    const service = buildService(null, { data: [] });

    await expect(service.getUserInvoices('missing-user')).resolves.toEqual([]);
  });

  it('converts Stripe amounts from cents and normalizes status', async () => {
    const service = buildService(
      { stripeCustomerId: 'cus_123' },
      {
        data: [
          {
            id: 'in_1',
            created: 1735689600, // 2025-01-01T00:00:00Z
            amount_paid: 2999,
            total: 2999,
            status: 'paid',
            description: null,
            lines: { data: [{ description: 'Pro plan — monthly' }] },
          },
        ],
      },
    );

    const invoices = await service.getUserInvoices('user-1');

    expect(invoices).toHaveLength(1);
    expect(invoices[0]).toEqual(
      expect.objectContaining({
        description: 'Pro plan — monthly',
        amount: 29.99,
        status: 'paid',
      }),
    );
    expect(invoices[0].date).toBe(new Date(1735689600 * 1000).toISOString());
  });

  it('queries Stripe scoped to this user\'s own customer id', async () => {
    const service = buildService({ stripeCustomerId: 'cus_456' }, { data: [] });

    await service.getUserInvoices('user-1');

    expect((service as any).stripe.invoices.list).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_456' }),
    );
  });

  it('reports a non-paid invoice status honestly rather than defaulting to "paid"', async () => {
    const service = buildService(
      { stripeCustomerId: 'cus_789' },
      {
        data: [
          {
            id: 'in_2',
            created: 1735689600,
            amount_paid: 0,
            total: 4900,
            status: 'open',
            description: 'Pro plan',
          },
        ],
      },
    );

    const invoices = await service.getUserInvoices('user-1');

    expect(invoices[0].status).toBe('open');
    expect(invoices[0].amount).toBe(0);
  });
});
