import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';

test.describe('Employer v3 workspace shell', () => {
  test.use({ storageState: storage.employer });

  test('dashboard uses the horizontal employer navigation and exposes theme switching', async ({
    page,
  }) => {
    await page.goto('/employer/dashboard', { waitUntil: 'domcontentloaded' });

    const primary = page.getByRole('navigation', { name: 'Employer primary' });
    await expect(primary).toBeVisible();
    await expect(primary.getByRole('link')).toHaveText([
      'Dashboard',
      'Jobs',
      'Candidates',
      'Interviews',
      'Company',
    ]);
    const firstLinkStyle = await primary.getByRole('link').first().evaluate((link) => {
      const style = getComputedStyle(link);
      return {
        paddingLeft: style.paddingLeft,
        textTransform: style.textTransform,
        fontFamily: style.fontFamily,
      };
    });
    expect(firstLinkStyle.paddingLeft).toBe('12px');
    expect(firstLinkStyle.textTransform).toBe('uppercase');
    expect(firstLinkStyle.fontFamily).toContain('DM Mono');
    await expect(page.getByRole('button', { name: /switch to light theme/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'employer dashboard');
  });

  test('job applications uses the v3 surface instead of the legacy cream layout', async ({ page }) => {
    const jobId = '64b0000000000000000000aa';
    await page.route(`**/api/employer/jobs/${jobId}`, (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ job: { _id: jobId, title: 'Backend Engineer' } }),
      }),
    );
    await page.route('**/api/employer/applicants/resume-assessment/budget', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ status: 'READY', limitUsd: 1, remainingUsd: 1 }),
      }),
    );
    await page.route(`**/api/employer/applicants?**`, (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) }),
    );

    await page.goto(`/employer/jobs/${jobId}/applications`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('navigation', { name: 'Employer primary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    const colors = await page.locator('#emapp').evaluate((element) => {
      const style = getComputedStyle(element);
      return { backgroundColor: style.backgroundColor, color: style.color };
    });
    expect(colors, 'job applications should use the dark v3 palette').toEqual({
      backgroundColor: 'rgb(11, 11, 12)',
      color: 'rgb(245, 245, 244)',
    });
  });

  test('jobs route exposes its contextual navigation inside the shared shell', async ({ page }) => {
    await page.goto('/employer/jobs', { waitUntil: 'domcontentloaded' });

    const section = page.getByRole('navigation', { name: 'Employer jobs' });
    await expect(section.getByRole('link')).toHaveText(['Jobs', 'Distribution']);
    await expect(page.getByRole('navigation', { name: 'Employer primary' })).toBeVisible();

    const rootStyle = await page.locator('#emapp').evaluate((root) => {
      const style = getComputedStyle(root);
      return { backgroundColor: style.backgroundColor, color: style.color };
    });
    expect(rootStyle).toEqual({ backgroundColor: 'rgb(11, 11, 12)', color: 'rgb(245, 245, 244)' });
  });

  test('contextual navigation matches the employer screens retained by the Claude design', async ({ page }) => {
    await page.goto('/employer/candidates', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: 'Employer candidates' }).getByRole('link')).toHaveText([
      'Candidates',
      'Screening',
      'Pipeline',
      'Talent pool',
    ]);

    await page.goto('/employer/interviews', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: 'Employer interviews' }).getByRole('link')).toHaveText([
      'Interviews',
      'Messages',
      'Offers',
    ]);

    await page.goto('/employer/company', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('navigation', { name: 'Employer company' }).getByRole('link')).toHaveText([
      'Company',
      'Usage',
      'Compliance',
    ]);
  });

  test('every retained employer page uses the v3 surface instead of the legacy cream layout', async ({ page }) => {
    const routes = [
      '/employer/jobs',
      '/employer/distribution',
      '/employer/candidates',
      '/employer/screening',
      '/employer/pipeline',
      '/employer/talent-pool',
      '/employer/interviews',
      '/employer/messages',
      '/employer/offers',
      '/employer/company',
      '/employer/usage',
      '/employer/compliance',
    ];

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const surface = page.locator('#emapp');
      await expect(surface, `${route} should render an employer app surface`).toBeVisible();
      const colors = await surface.evaluate((element) => {
        const style = getComputedStyle(element);
        return { backgroundColor: style.backgroundColor, color: style.color };
      });
      expect(colors, `${route} should use the dark v3 palette`).toEqual({
        backgroundColor: 'rgb(11, 11, 12)',
        color: 'rgb(245, 245, 244)',
      });
    }
  });

  test('pipeline provides the Claude by-role view', async ({ page }) => {
    await page.route('**/api/employer/jobs', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobs: [
          { _id: 'active-job', title: 'Backend Engineer', status: 'active' },
          { _id: 'draft-job', title: 'Draft Role', status: 'draft' },
          { _id: 'paused-job', title: 'Paused Role', status: 'paused' },
        ] }),
      }),
    );
    await page.route('**/api/employer/applicants', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([
          { _id: 'candidate-1', jobId: 'active-job' },
          { _id: 'candidate-2', jobId: 'active-job' },
          { _id: 'candidate-3', jobId: 'draft-job' },
        ]),
      }),
    );
    await page.goto('/employer/pipeline', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'By role' })).toBeVisible();
    await expect(page.getByText('1 live roles', { exact: true })).toBeVisible();
    await expect(page.getByText('2 candidates', { exact: true })).toBeVisible();
    await expect(page.getByText('Draft Role')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Employer candidates' })).toBeVisible();
  });

  test('offers resolves job titles from the jobs API', async ({ page }) => {
    await page.route('**/api/employer/offers**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ offers: [{ _id: 'offer-1', jobId: 'job-1', candidateName: 'A. Balogun' }] }),
      }),
    );
    await page.route('**/api/employer/jobs', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ jobs: [{ _id: 'job-1', title: 'Backend Engineer', status: 'active' }] }),
      }),
    );
    await page.goto('/employer/offers', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Backend Engineer', { exact: true })).toBeVisible();
  });

  test('candidate detail drawer uses the v3 surface', async ({ page }) => {
    await page.route('**/api/employer/applicants', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify([{ _id: 'candidate-1', candidateName: 'A. Balogun', stage: 'interview', aiScore: 94 }]),
      }),
    );
    await page.goto('/employer/candidates', { waitUntil: 'domcontentloaded' });
    const candidateRow = page.locator('.em-card').first();
    await expect(candidateRow).toHaveCSS('background-color', 'rgb(17, 17, 19)');
    await expect(candidateRow).toHaveCSS('border-radius', '2px');
    await expect(candidateRow.locator(':scope > div')).toHaveCSS('flex-direction', 'row');
    await page.getByRole('button', { name: 'View profile' }).click();

    const drawer = page.getByText('Candidate detail', { exact: true }).locator('..').locator('..');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveCSS('background-color', 'rgb(17, 17, 19)');
  });

  test('dashboard renders the v3 metrics, funnel, and 30-day application activity from APIs', async ({
    page,
  }) => {
    const jobs = Array.from({ length: 12 }, (_, index) => ({
      _id: `job-${index}`,
      title: `Role ${index + 1}`,
      status: 'active',
    }));
    const interviews = Array.from({ length: 23 }, (_, index) => ({
      _id: `interview-${index}`,
      scheduledAt: new Date(Date.now() + index * 60_000).toISOString(),
    }));
    const applicants = [
      { _id: 'a-1', jobId: 'job-0', createdAt: new Date().toISOString() },
      { _id: 'a-2', jobId: 'job-0', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
      { _id: 'a-3', jobId: 'job-1', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
    ];

    await page.route('**/api/employer/applicants/stats**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ total: 1284, screening: 412, interview: 148, offer: 46, hired: 11 }),
      }),
    );
    await page.route('**/api/employer/applicants', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(applicants) }),
    );
    await page.route('**/api/employer/jobs', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ jobs }) }),
    );
    await page.route('**/api/employer/interviews**', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ interviews }) }),
    );
    await page.route('**/api/employer/offers**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ offers: Array.from({ length: 11 }, (_, index) => ({ _id: `offer-${index}` })) }),
      }),
    );
    await page.route('**/api/employer/company', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ company: { name: 'Acme Lab' } }),
      }),
    );
    await page.route('**/api/users/profile', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: { name: 'Alex' } }) }),
    );
    await page.route('**/api/employer/ai/autopilot', (route) =>
      route.fulfill({ contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/employer/dashboard', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: 'Acme Lab' })).toBeVisible();
    await expect(page.getByText('12 live roles', { exact: true })).toBeVisible();

    const metrics = page.getByRole('region', { name: 'Hiring metrics' });
    await expect(metrics).toContainText('Open roles12live');
    await expect(metrics).toContainText('Applicants1284total');
    await expect(metrics).toContainText('Interviews23scheduled');
    await expect(metrics).toContainText('Offers11out');

    await expect(page.getByRole('region', { name: 'Recruiting funnel' })).toContainText(
      'Applicants1284100%Screened41232%Interview14836%Offer4631%Hired1124%',
    );
    await expect(
      page.getByRole('img', { name: 'Applications received in the last 30 days' }),
    ).toBeVisible();
    await expect(page.getByText('No application activity yet.')).toHaveCount(0);
    await expect(page.getByText('2 applied', { exact: true })).toBeVisible();
  });

  test('dashboard surfaces a metric API failure with a readable error state', async ({ page, guards }) => {
    guards.allowFailures(/\/api\/employer\/interviews/);
    guards.allowConsoleErrors();
    await page.route('**/api/employer/applicants/stats**', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ total: 2 }) }),
    );
    await page.route('**/api/employer/jobs', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ jobs: [] }) }),
    );
    await page.route('**/api/employer/interviews**', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Unavailable' }) }),
    );
    await page.route('**/api/employer/offers**', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ offers: [] }) }),
    );
    await page.route('**/api/employer/applicants', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ applicants: [] }) }),
    );

    await page.goto('/employer/dashboard', { waitUntil: 'domcontentloaded' });

    const heading = page.getByText('Couldn’t load this', { exact: true });
    await expect(heading).toBeVisible();
    const colors = await heading.evaluate((element) => {
      const foreground = getComputedStyle(element).color;
      const background = getComputedStyle(document.querySelector('.employer-dashboard')).backgroundColor;
      return { foreground, background };
    });
    expect(colors.foreground).not.toBe(colors.background);
    await expect(page.getByRole('region', { name: 'Hiring metrics' })).toHaveCount(0);
  });
});
