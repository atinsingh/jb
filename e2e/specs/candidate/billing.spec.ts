import { expect, test, storage } from '../../fixtures/test';

test.use({ storageState: storage.candidate });

test('renders the live two-tier catalogue and sends the selected checkout cycle', async ({ page }) => {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { user: { id: 'candidate-e2e-1', role: 'ROLE_CANDIDATE' } } }),
  );
  await page.route('**/api/billing/plans', (route) => route.fulfill({ json: { plans: [
    { _id: 'free-id', type: 'FREE', name: 'Free', priceMonthly: 0, priceYearly: 0, features: ['Monthly AI allowance'] },
    { _id: 'paid-id', type: 'PRO', name: 'Paid', priceMonthly: 10, priceYearly: 100, features: ['Higher monthly AI allowance'] },
  ] } }));
  await page.route('**/api/billing/subscription', (route) =>
    route.fulfill({ json: { subscription: null } }),
  );
  await page.route('**/api/users/invoices', (route) => route.fulfill({ json: { invoices: [] } }));
  await page.route('**/api/resume-harness/budget', (route) => route.fulfill({ json: {
    unit: 'USD', tier: 'FREE', limit: 0.5, spent: 0, remaining: 0.5,
    periodStart: '2026-09-01T00:00:00.000Z', periodEnd: '2026-10-01T00:00:00.000Z',
    resetAt: '2026-10-01T00:00:00.000Z', status: 'healthy', lastRefreshedAt: '2026-09-21T00:00:00.000Z',
  } }));
  let checkout: any;
  await page.route('**/api/billing/checkout', async (route) => {
    checkout = route.request().postDataJSON();
    await route.fulfill({ json: { sessionId: 'cs_123', url: '/app/billing?checkout=1' } });
  });

  await page.goto('/app/billing');
  await expect(page.locator('[data-testid^="billing-plan-"]')).toHaveCount(2);
  await expect(page.getByText('Premium')).toHaveCount(0);
  await expect(page.getByTestId('billing-budget')).toContainText('$0.50 of $0.50 remaining');
  await expect(page.getByTestId('billing-plan-PRO')).toContainText('$10');

  await page.getByRole('switch', { name: 'Billing cycle' }).click();
  await expect(page.getByTestId('billing-plan-PRO')).toContainText('$100/year');
  await page.getByTestId('billing-checkout-PRO').click();
  await expect.poll(() => checkout).toEqual({ planId: 'paid-id', billingCycle: 'yearly' });
});
