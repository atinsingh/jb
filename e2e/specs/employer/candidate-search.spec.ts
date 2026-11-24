import { test, expect, storage } from '../../fixtures/test';

test.use({ storageState: storage.employer });

const ada = {
  candidateId: 'ada',
  name: 'Ada Lovelace',
  headline: 'Backend engineer',
  location: 'London',
  targetRoles: ['Senior Backend Engineer'],
  matchedRoles: ['Senior Backend Engineer'],
  skills: ['TypeScript'],
};

test('candidate search is in the employer nav and shows the matched person', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/employer/candidate-search') && !url.includes('/for-job/')) {
      calls += 1;
      expect(new URL(url).searchParams.get('q')).toBe('Ada');
      await route.fulfill({ json: { candidates: [ada], page: 1, limit: 20, total: 1 } });
      return;
    }
    if (url.includes('/api/auth/me')) {
      await route.fulfill({ json: { user: { role: 'ROLE_EMPLOYER', name: 'E2E Employer' } } });
      return;
    }
    await route.fulfill({ json: {} });
  });

  await page.goto('/employer/dashboard');
  await page.getByRole('navigation', { name: 'Employer primary' }).getByRole('link', { name: 'Candidates' }).click();
  await expect(page).toHaveURL(/\/employer\/search$/);
  expect(calls).toBe(0);
  await page.getByLabel('Name or skill').fill('Ada');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
  await expect(page.getByText('Senior Backend Engineer')).toBeVisible();
  await expect(page.getByText('TypeScript')).toBeVisible();
  await expect(page.getByText('Showing 1–1 of 1')).toBeVisible();
  await expect(page.getByText('Bob Other')).toHaveCount(0);
  expect(calls).toBe(1);
});

test('a posted job shows recommended candidates from the résumé database', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/employer/candidate-search/for-job/')) {
      await route.fulfill({ json: { candidates: [ada] } });
      return;
    }
    if (url.includes('/api/auth/me')) {
      await route.fulfill({ json: { user: { role: 'ROLE_EMPLOYER', name: 'E2E Employer' } } });
      return;
    }
    if (url.includes('/api/employer/jobs/')) {
      await route.fulfill({ json: { job: { _id: 'job-1', title: 'Senior Backend Engineer', skills: ['TypeScript'] } } });
      return;
    }
    await route.fulfill({ json: {} });
  });

  await page.goto('/employer/jobs/job-1/applications');
  const recommended = page.getByRole('region', { name: 'Recommended candidates' });
  await expect(recommended.getByText('Ada Lovelace')).toBeVisible();
  await expect(recommended.getByText('Senior Backend Engineer')).toBeVisible();
  await expect(recommended.getByRole('link', { name: 'Search candidates' })).toHaveAttribute('href', '/employer/search');
});
