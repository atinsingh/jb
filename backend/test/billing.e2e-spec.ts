import { INestApplication } from '@nestjs/common';
import {
  api,
  auth,
  createE2EApp,
  registerUser,
  resetDatabase,
  TestUser,
} from './utils/e2e-app';

/**
 * Billing guards.
 *
 * The property under test is simple and worth stating plainly: **no request an
 * employer can make may raise their own tier.** `upgrade()` used to write the
 * plan straight to the document along with a fabricated `amount: 0,
 * status: 'paid'` invoice, so any employer could hand themselves the enterprise
 * tier — 100 job slots and 10,000 AI actions a month — for free.
 *
 * Stripe credentials are deliberately absent here (see `setup-e2e.ts`): a paid
 * tier must be unreachable *because of the guards*, not because a network call
 * happened to be configured.
 */
describe('Billing guards (e2e)', () => {
  let app: INestApplication;
  let employer: TestUser;

  const subscriptionOf = async (user: TestUser) => {
    const res = await api(app)
      .get('/api/employer/billing/subscription')
      .set(auth(user.token))
      .expect(200);
    return res.body.subscription;
  };

  beforeAll(async () => {
    app = await createE2EApp();
    await resetDatabase(app);
    employer = await registerUser(app, 'ROLE_EMPLOYER', 'billing-employer');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('starts every employer on the free tier', async () => {
    const sub = await subscriptionOf(employer);

    expect(sub.plan).toBe('free');
    expect(sub.aiActionsLimit).toBe(25);
    expect(sub.jobSlotsLimit).toBe(1);
    expect(sub.stripeSubscriptionId).toBeUndefined();
  });

  it('publishes a catalogue that marks which plans are self-serve', async () => {
    const res = await api(app)
      .get('/api/employer/billing/plans')
      .set(auth(employer.token))
      .expect(200);

    const byKey = Object.fromEntries(res.body.plans.map((p: any) => [p.key, p]));
    expect(res.body.currentPlan).toBe('free');
    expect(byKey.growth.selfServe).toBe(true);
    expect(byKey.growth.monthly).toBe(299);
    // Sales-led and free tiers must not render a "buy" button.
    expect(byKey.enterprise.selfServe).toBe(false);
    expect(byKey.free.selfServe).toBe(false);
  });

  it('refuses to sell the sales-led enterprise plan', async () => {
    const res = await api(app)
      .post('/api/employer/billing/upgrade')
      .set(auth(employer.token))
      .send({ plan: 'enterprise' })
      .expect(400);

    expect(String(res.body.message)).toMatch(/sales-led|contact sales/i);
  });

  it('NEVER grants a paid tier from an upgrade request', async () => {
    for (const plan of ['starter', 'growth', 'scale', 'enterprise']) {
      // Some of these 4xx on the guard, others fail reaching Stripe — either is
      // fine. What must never happen is the tier changing.
      await api(app)
        .post('/api/employer/billing/upgrade')
        .set(auth(employer.token))
        .send({ plan });

      const sub = await subscriptionOf(employer);
      expect(sub.plan).toBe('free');
      expect(sub.aiActionsLimit).toBe(25);
    }
  });

  it('does not fabricate a paid invoice', async () => {
    const res = await api(app)
      .get('/api/employer/billing/invoices')
      .set(auth(employer.token))
      .expect(200);

    // The old code pushed an `amount: 0, status: 'paid'` row per upgrade attempt.
    expect(res.body.invoices).toEqual([]);
  });

  it('rejects an unknown plan key', async () => {
    await api(app)
      .post('/api/employer/billing/upgrade')
      .set(auth(employer.token))
      .send({ plan: 'unlimited-please' })
      .expect(400);
  });

  it('refuses a billing-portal session for an employer with no Stripe customer', async () => {
    const res = await api(app)
      .post('/api/employer/billing/portal')
      .set(auth(employer.token))
      .send({});

    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/no billing information/i);
  });

  it('keeps usage meters aligned with the free tier', async () => {
    const res = await api(app)
      .get('/api/employer/billing/usage')
      .set(auth(employer.token))
      .expect(200);

    expect(res.body.usage).toEqual(
      expect.objectContaining({
        aiActionsLimit: 25,
        aiActionsUsed: 0,
        jobSlotsLimit: 1,
      }),
    );
  });

  describe('candidate billing', () => {
    it('rejects checkout for a plan that has no Stripe price configured', async () => {
      const candidate = await registerUser(app, 'ROLE_CANDIDATE', 'billing-cand');

      const res = await api(app)
        .post('/api/billing/checkout')
        .set(auth(candidate.token))
        .send({ planId: '000000000000000000000000', billingCycle: 'monthly' });

      // 404 (no such plan) or 400 (pricing not configured) — never a silent grant.
      expect([400, 404]).toContain(res.status);
    });
  });
});
