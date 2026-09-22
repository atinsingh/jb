import { expect, test, storage } from '../../fixtures/test';

const candidatePlans = {
  plans: [
    {
      _id: 'free-id',
      type: 'FREE',
      name: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'usd',
      features: ['Monthly AI allowance'],
    },
    {
      _id: 'paid-id',
      type: 'PRO',
      name: 'Paid',
      priceMonthly: 10,
      priceYearly: 100,
      currency: 'usd',
      features: ['Higher monthly AI allowance'],
    },
  ],
};

const employerPlans = {
  plans: [
    {
      key: 'free',
      name: 'Free',
      tagline: 'Post your first role',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'cad',
      popular: false,
      selfServe: false,
      levers: [['Job slots', '1']],
    },
    {
      key: 'starter',
      name: 'Starter',
      tagline: 'For a first hire or two',
      priceMonthly: 49,
      priceYearly: 499.8,
      currency: 'cad',
      popular: false,
      selfServe: true,
      levers: [['Job slots', '3']],
    },
    {
      key: 'scale',
      name: 'Professional',
      tagline: 'High-volume recruiting',
      priceMonthly: 399,
      priceYearly: 4069.8,
      currency: 'cad',
      popular: true,
      selfServe: true,
      levers: [['Job slots', '15']],
    },
  ],
};

test('candidate pricing renders exactly the tiers and prices returned by the catalog API', async ({ page }) => {
  await page.route('**/api/billing/plans', (route) => route.fulfill({ json: candidatePlans }));

  await page.goto('/pricing');
  await expect(page.getByTestId('candidate-pricing-tier')).toHaveCount(2);
  await expect(page.locator('[data-testid="candidate-pricing-tier"][data-tier="PRO"]')).toContainText('$10');
  await expect(page.getByText('Premium')).toHaveCount(0);

  await page.getByRole('button', { name: 'Switch to annual billing' }).click();
  await expect(page.locator('[data-testid="candidate-pricing-tier"][data-tier="PRO"]')).toContainText('$100/year');
});

test('employer pricing renders the Stripe-backed tier count and yearly totals', async ({ page }) => {
  await page.route('**/api/billing/employer-plans', (route) => route.fulfill({ json: employerPlans }));

  await page.goto('/employers/pricing');
  await expect(page.getByTestId('employer-pricing-tier')).toHaveCount(3);
  await expect(page.locator('[data-testid="employer-pricing-tier"][data-tier="scale"]')).toContainText('Professional');
  await expect(page.locator('[data-testid="employer-pricing-tier"][data-tier="starter"]')).toContainText('CA$49/month');

  await page.getByRole('button', { name: 'Switch to annual billing' }).click();
  await expect(page.locator('[data-testid="employer-pricing-tier"][data-tier="starter"]')).toContainText('CA$499.80/year');
});

test.describe('employer account billing', () => {
  test.use({ storageState: storage.employer });

  test('uses the exact Stripe yearly charge instead of multiplying a rendered monthly price', async ({ page }) => {
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        json: { user: { id: 'employer-1', role: 'ROLE_EMPLOYER' } },
      }),
    );
    await page.route('**/api/employer/billing/subscription', (route) =>
      route.fulfill({
        json: {
          subscription: {
            plan: 'scale',
            billingCycle: 'annual',
            renewsAt: '2027-01-01T00:00:00.000Z',
          },
        },
      }),
    );
    await page.route('**/api/employer/billing/invoices', (route) => route.fulfill({ json: { invoices: [] } }));
    await page.route('**/api/employer/billing/plans', (route) =>
      route.fulfill({
        json: {
          ...employerPlans,
          currentPlan: 'scale',
          billingCycle: 'annual',
        },
      }),
    );
    await page.route('**/api/employer/company', (route) => route.fulfill({ json: { company: { name: 'Acme Lab' } } }));

    await page.goto('/employer/billing');
    await expect(page.getByTestId('employer-current-plan')).toContainText('Professional plan');
    await expect(page.getByTestId('employer-next-charge')).toHaveText('CA$4,069.80');
    await expect(page.getByTestId('employer-annual-total')).toHaveText('CA$4,069.80');
  });
});
