import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';

test.describe('Employer v3 workspace shell', () => {
  test.use({ storageState: storage.employer });

  test('retained pages share the candidate and public theme', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('jobocate-marketing-theme')) localStorage.setItem('jobocate-marketing-theme', 'dark');
    });
    for (const route of ['/employer/dashboard', '/employer/jobs', '/employer/settings', '/employer/jobs/post']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('navigation', { name: 'Employer primary' }).getByRole('link'))
        .toHaveText(['Dashboard', 'Jobs', 'Settings']);
      await expect(page.locator('#emapp')).toHaveCSS('background-color', 'rgb(11, 11, 12)');
      await expect(page.locator('#emapp')).toHaveCSS('color', 'rgb(245, 245, 244)');
      await expectNoHorizontalOverflow(page, route);
    }
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect(page.locator('#emapp')).not.toHaveCSS('background-color', 'rgb(11, 11, 12)');
    await page.goto('/employer/settings');
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, 'employer settings');
    await page.goto('/employer/dashboard');
    await expectNoHorizontalOverflow(page, 'employer dashboard');
  });

  test('employer navigation and panels match the current candidate design', async ({ page, browser }) => {
    const candidate = await browser.newContext({ storageState: storage.candidate });
    try {
      const candidatePage = await candidate.newPage();
      await candidatePage.goto('http://localhost:3000/app/dashboard');
      const reference = await candidatePage.getByRole('navigation', { name: 'Candidate navigation' }).getByRole('link', { name: 'Dashboard', exact: true }).evaluate(el => {
        const css = getComputedStyle(el);
        return { fontSize: css.fontSize, borderRadius: css.borderRadius, textTransform: css.textTransform };
      });
      await page.goto('/employer/dashboard');
      const link = page.getByRole('navigation', { name: 'Employer primary' }).getByRole('link', { name: 'Dashboard', exact: true });
      for (const [property, value] of Object.entries(reference)) {
        await expect(link).toHaveCSS(property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), value);
      }
      await expect(page.getByRole('region', { name: 'Hiring metrics' }).getByRole('group', { name: 'Total jobs' })).toHaveCSS('border-radius', '12px');
    } finally { await candidate.close(); }
  });

  test('job applications stays available under Jobs', async ({ page }) => {
    const jobId = '64b0000000000000000000aa';
    await page.route(`**/api/employer/jobs/${jobId}`, (route) => route.fulfill({ json: { job: { _id: jobId, title: 'Backend Engineer' } } }));
    await page.route('**/api/employer/applicants/resume-assessment/budget', (route) => route.fulfill({ json: { status: 'READY', limitCredits: 100, remainingCredits: 100 } }));
    await page.route('**/api/employer/applicants?**', (route) => route.fulfill({ json: [] }));
    await page.goto(`/employer/jobs/${jobId}/applications`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Employer primary' }).getByRole('link', { name: 'Jobs', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('dashboard metrics and active roles come from jobs across companies', async ({ page }) => {
    await page.route('**/api/employer/jobs', (route) => route.fulfill({ json: { jobs: [
      { _id: 'job-1', title: 'Backend Engineer', companyName: 'North Studio', status: 'active', applicantCount: 7 },
      { _id: 'job-2', title: 'Draft role', companyName: 'South Studio', status: 'draft', applicantCount: 0 },
    ] } }));
    await page.goto('/employer/dashboard');
    const metrics = page.getByRole('region', { name: 'Hiring metrics' });
    await expect(metrics).toContainText('Total jobs2');
    await expect(metrics).toContainText('Active roles1');
    await expect(metrics).toContainText('Drafts1');
    await expect(metrics).toContainText('Applicants7');
    await expect(page.getByRole('region', { name: 'Active roles' })).toContainText('North Studio');
    await expect(page.getByRole('region', { name: 'Active roles' }).getByText('Draft role')).toHaveCount(0);
  });

  test('dashboard surfaces a jobs API failure with a retry', async ({ page, guards }) => {
    guards.allowFailures(/\/api\/employer\/jobs/);
    guards.allowConsoleErrors();
    await page.route('**/api/employer/jobs', (route) => route.fulfill({ status: 500, json: { message: 'Unavailable' } }));
    await page.goto('/employer/dashboard');
    await expect(page.getByText('Couldn’t load this', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Hiring metrics' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
