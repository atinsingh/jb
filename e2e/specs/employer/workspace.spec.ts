import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';
import { api, uniqueId } from '../../support/api';

test.use({ storageState: storage.employer });

test('employer navigation keeps three pages without administrative page notes', async ({ page }) => {
  await page.goto('/employer/dashboard');
  await expect(page.getByRole('navigation', { name: 'Employer primary' }).getByRole('link'))
    .toHaveText(['Dashboard', 'Jobs', 'Settings']);
  await expect(page.getByRole('heading', { name: 'Employer dashboard' })).toBeVisible();
  await expect(page.getByText('Muted pages', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Your workspace' })).toHaveCount(0);
  await page.goto('/employer/company');
  await expect(page).toHaveURL(/\/employer\/dashboard$/);
  await page.goto('/employer/billing');
  await expect(page).toHaveURL(/\/employer\/settings$/);
});

test('jobs displays measured credits, including exhaustion and an unavailable balance', async ({ page }) => {
  let budget: object = { status: 'READY', limitCredits: 100, spentCredits: 63, remainingCredits: 37, resetAt: '2026-11-01T00:00:00.000Z' };
  await page.route('**/api/employer/applicants/resume-assessment/budget', (route) =>
    route.fulfill({ json: budget }));
  await page.route('**/api/employer/billing/plans', route => route.fulfill({ json: { currentPlan: 'free', plans: [{ key: 'free', name: 'Free' }] } }));
  await page.goto('/employer/jobs');
  const balance = page.getByRole('region', { name: 'Employer AI credits' });
  await expect(balance).toContainText('37 credits remaining');
  await expect(balance).toContainText('Free plan includes 100 credits per month');
  await expect(balance).toContainText('63 used');
  await expect(balance).toContainText('Nov 1, 2026');
  await expect(balance).toContainText('Candidate and employer credits are counted separately');
  await expect(balance).toContainText('100');
  await expect(balance.getByRole('link', { name: 'Upgrade plan' })).toHaveAttribute('href', '/employer/settings#plan');
  budget = { status: 'BUDGET_EXHAUSTED', limitCredits: 100, spentCredits: 100, remainingCredits: 0 };
  await balance.getByRole('button', { name: 'Refresh balance' }).click();
  await expect(balance).toContainText('0 credits remaining');
  for (const invalid of [
    { status: 'CONFIGURATION_ERROR' },
    { status: 'CONFIGURATION_ERROR', limitCredits: 100, spentCredits: 0, remainingCredits: 0 },
    { status: 'READY', limitCredits: 100, spentCredits: 62.5, remainingCredits: 37.5 },
    { status: 'READY', limitCredits: 100, spentCredits: 10, remainingCredits: 100 },
  ]) {
    budget = invalid;
    await page.reload();
    await expect(balance).toContainText('Credit balance unavailable');
    await expect(balance).not.toContainText('credits remaining');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page, 'employer jobs');
});

test('settings saves basic account details and starts a plan upgrade', async ({ page, employerUser }) => {
  const original = (await api.get<any>('/api/users/profile', employerUser.token)).user;
  await page.route('**/api/employer/billing/subscription', (route) => route.fulfill({ json: {
    subscription: { plan: 'free', status: 'canceled', stripeSubscriptionId: 'sub_old', stripeCustomerId: 'cus_existing' },
  } }));
  await page.route('**/api/employer/billing/plans', (route) => route.fulfill({ json: {
    currentPlan: 'free', billingCycle: 'monthly', plans: [
      { key: 'free', name: 'Free', current: true, selfServe: false, priceMonthly: 0, priceYearly: 0, currency: 'cad', levers: [] },
      { key: 'paid', name: 'Paid', current: false, selfServe: true, priceMonthly: 10, priceYearly: 100, currency: 'cad', levers: [['Job slots', '3']] },
    ],
  } }));
  let upgrade: object | null = null;
  await page.route('**/api/employer/billing/upgrade', (route) => {
    upgrade = route.request().postDataJSON();
    return route.fulfill({ json: { checkoutUrl: 'http://localhost:3000/employer/settings?success=true' } });
  });
  try {
    await page.goto('/employer/settings');
    await page.getByLabel('Full name', { exact: true }).fill('Employer Review');
    await page.getByLabel('Phone', { exact: true }).fill('+1 416 555 0131');
    await page.getByLabel('Location', { exact: true }).fill('Toronto');
    await page.getByRole('button', { name: 'Save details' }).click();
    await expect(page.getByRole('status')).toHaveText('Account details saved.');
    await page.reload();
    await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Employer Review');
    await expect(page.getByLabel('Phone', { exact: true })).toHaveValue('+1 416 555 0131');
    await expect(page.getByRole('heading', { name: /experience|skills|certifications/i })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Plan' })).toContainText('Current plan: Free');
    await page.getByLabel('Billing cycle').selectOption('annual');
    await page.getByRole('button', { name: 'Upgrade to Paid' }).click();
    await expect.poll(() => upgrade).toEqual({ plan: 'paid', billingCycle: 'annual' });
    await expect(page).toHaveURL(/settings\?success=true$/);
  } finally {
    await api.patch('/api/users/profile', {
      name: original.name || '', phone: original.phone || '', location: original.location || '',
    }, employerUser.token);
  }
});

test('one employer can post jobs for different companies without a company profile', async ({ page, employerUser }) => {
  const jobs: string[] = [];
  const title = uniqueId('company-role');
  try {
    for (const companyName of ['North Studio', 'South Studio']) {
      const response = await api.post<any>('/api/employer/jobs', {
        title: `${title} ${companyName}`, companyName, status: 'draft',
      }, employerUser.token);
      jobs.push(response.job._id);
    }
    await page.goto('/employer/jobs');
    await expect(page.getByText('North Studio', { exact: true })).toBeVisible();
    await expect(page.getByText('South Studio', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, 'employer jobs with company rows');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/employer/jobs/post');
    await page.getByRole('button', { name: /company details/i }).click();
    await expect(page.getByText('Choose the company for this posting. You can post for a different company each time.', { exact: true })).toBeVisible();
  } finally {
    for (const id of jobs) await api.del(`/api/employer/jobs/${id}`, employerUser.token);
  }
});
