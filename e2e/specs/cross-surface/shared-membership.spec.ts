import { test, expect, storage } from '../../fixtures/test';

test.use({ storageState: storage.employer });

test('employer settings shows the subscription even when pricing is unavailable', async ({ page, guards }) => {
  guards.allowFailures('/api/employer/billing/plans');
  guards.allowConsoleErrors();
  await page.route('**/api/employer/billing/plans', route => route.fulfill({ status: 503, json: { message: 'Pricing temporarily unavailable' } }));
  await page.route('**/api/employer/billing/subscription', route => route.fulfill({ json: { subscription: {
    plan: 'paid', stripeCustomerId: 'cus_shared', stripeSubscriptionId: 'sub_shared', status: 'active',
    billingCycle: 'annual', cancelAtPeriodEnd: true, renewsAt: '2026-11-01T00:00:00.000Z',
  } } }));
  await page.route('**/api/employer/billing/portal', async route => {
    expect(route.request().postDataJSON().returnUrl).toBe(new URL('/employer/settings', page.url()).href);
    await route.fulfill({ json: { url: new URL('/employer/settings?portal=opened', page.url()).href } });
  });
  await page.goto('/employer/settings');
  const plan = page.getByRole('region', { name: 'Plan' });
  await expect(plan).toContainText('Current plan: Paid');
  await expect(plan).toContainText('Status: Active');
  await expect(plan).toContainText('Billing cycle: Annual');
  await expect(plan).toContainText('Paid access ends');
  await expect(plan).toContainText('Nov 1, 2026');
  await expect(plan).toContainText('Pricing temporarily unavailable');
  await plan.getByRole('button', { name: 'Manage subscription', exact: true }).click();
  await expect(page).toHaveURL(new URL('/employer/settings?portal=opened', page.url()).href);
});

test('both billing views explain shared Paid access and offer management', async ({ page, browser }) => {
  const membership = { stripeCustomerId: 'cus_shared', stripeSubscriptionId: 'sub_shared', status: 'active', billingCycle: 'monthly' };
  await page.route('**/api/employer/billing/subscription', route => route.fulfill({ json: { subscription: { ...membership, plan: 'paid' } } }));
  await page.route('**/api/employer/billing/plans', route => route.fulfill({ json: {
    currentPlan: 'paid', billingCycle: 'monthly', plans: [
      { key: 'free', name: 'Free', current: false, priceMonthly: 0, priceYearly: 0, currency: 'usd', levers: [] },
      { key: 'paid', name: 'Paid', current: true, priceMonthly: 10, priceYearly: 100, currency: 'usd', levers: [] },
    ],
  } }));
  await page.goto('/employer/settings');
  await expect(page.getByRole('region', { name: 'Plan' })).toContainText('Current plan: Paid');
  await expect(page.getByText('One Paid membership covers candidate and employer workspaces.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Manage subscription', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Upgrade to/ })).toHaveCount(0);
  await page.route('**/api/employer/applicants/resume-assessment/budget', route => route.fulfill({ json: { status: 'READY', limitCredits: 400, spentCredits: 5, remainingCredits: 395, resetAt: '2026-11-01T00:00:00.000Z' } }));
  await page.goto('/employer/jobs');
  const credits = page.getByRole('region', { name: 'Employer AI credits' });
  await expect(credits).toContainText('395 credits remaining');
  await expect(credits.getByRole('link', { name: 'Manage subscription', exact: true })).toBeVisible();
  await expect(credits.getByRole('link', { name: 'Upgrade plan', exact: true })).toHaveCount(0);
  await page.goto('/app/billing?success=true');
  await expect(page).toHaveURL(new URL('/employer/settings?success=true', page.url()).href);
  await expect(page.getByText('Checkout completed. Your plan updates once payment is confirmed.', { exact: true })).toBeVisible();

  const context = await browser.newContext({ storageState: storage.candidate });
  try {
    const candidate = await context.newPage();
    await candidate.route('**/api/users/invoices', route => route.fulfill({ json: { invoices: [] } }));
    await candidate.route('**/api/billing/subscription', route => route.fulfill({ json: { subscription: membership, currentPlan: 'PRO' } }));
    await candidate.route('**/api/billing/plans', route => route.fulfill({ json: { plans: [
      { _id: 'free', type: 'FREE', name: 'Free', priceMonthly: 0, priceYearly: 0, currency: 'usd' },
      { _id: 'paid', type: 'PRO', name: 'Paid', priceMonthly: 10, priceYearly: 100, currency: 'usd' },
    ] } }));
    await candidate.route('**/api/resume-harness/budget', route => route.fulfill({ json: { status: 'healthy', limit: 400, spent: 7, remaining: 393 } }));
    await candidate.goto(new URL('/app/billing', page.url()).href);
    await expect(candidate.getByTestId('candidate-current-plan')).toContainText('Current plan: Paid');
    await expect(candidate.getByTestId('billing-budget')).toContainText('393 of 400 remaining');
    await expect(candidate.getByText('One Paid membership covers candidate and employer workspaces.', { exact: true })).toBeVisible();
    await expect(candidate.getByRole('button', { name: 'Manage subscription', exact: true }).first()).toBeVisible();
    await expect(candidate.getByRole('button', { name: 'Choose Paid', exact: true })).toHaveCount(0);
    await candidate.route('**/api/billing/portal', async route => {
      expect(route.request().postDataJSON().returnUrl).toBe(new URL('/app/billing', candidate.url()).href);
      await route.fulfill({ json: { url: new URL('/app/billing?portal=opened', candidate.url()).href } });
    });
    await candidate.getByRole('button', { name: 'Manage subscription', exact: true }).first().click();
    await expect(candidate).toHaveURL(new URL('/app/billing?portal=opened', page.url()).href);
  } finally { await context.close(); }
});
