import { test, expect, storage } from '../../fixtures/test';
import { api, uniqueId } from '../../support/api';

/**
 * Posting a job is the employer's core action — everything else on that side of
 * the product depends on a job existing. This drives the real form, then checks
 * the job is actually readable back, because "the form submitted" and "the job
 * exists" have diverged here before.
 */
test.use({ storageState: storage.employer });
test.describe.configure({ mode: 'serial' });

test.describe('posting a job', () => {
  const jobTitle = `E2E Posted Role ${uniqueId('post')}`;

  test('the post form renders its required fields', async ({ page }) => {
    await page.goto('/employer/jobs/post', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      page.locator('input[name="title"], input[id="title"]').first(),
      'the post-a-job form has no title field',
    ).toBeVisible({ timeout: 20_000 });
  });

  test('a job posted through the form is readable back', async ({
    page,
    employerUser,
  }) => {
    await page.goto('/employer/jobs/post', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const fill = async (selector: string, value: string) => {
      const el = page.locator(selector).first();
      if (await el.count()) await el.fill(value);
    };

    // A four-section wizard (Job Information -> Company Details -> Requirements
    // & Benefits -> Preview & Submit), each section hidden (display:none) until
    // it is the active one. The same "Next"/"Back" pair drives all of it; the
    // button relabels to "Publish job" on the last section rather than being a
    // separate control.
    const next = () => page.getByRole('button', { name: /^next/i }).click();

    // ---- Job Information ----
    await fill('input[name="title"], input[id="title"]', jobTitle);
    await fill(
      'textarea[name="description"], textarea[id="description"]',
      'An end-to-end test posting describing a backend engineering role in detail.',
    );
    await fill(
      'input[name="location"], input[id="location"]',
      'Toronto, Ontario, Canada',
    );
    await next();

    // ---- Company Details ----
    await fill('input[name="companyName"], input[id="companyName"]', 'E2E Test Co');
    await next();

    // ---- Requirements & Benefits ----
    // Optional on this section; nothing required to proceed.
    await next();

    // ---- Preview & Submit ----
    await page.getByRole('button', { name: /publish job/i }).click();

    // The API is the source of truth. A form that appears to succeed while
    // nothing was written is exactly the failure this asserts against.
    await expect
      .poll(
        async () => {
          const jobs = await api
            .get<any>('/api/employer/jobs', employerUser.token)
            .catch(() => null);
          const list = Array.isArray(jobs) ? jobs : jobs?.jobs || [];
          return list.some((j: any) => j.title === jobTitle);
        },
        {
          message: `the job "${jobTitle}" was never created despite the form submitting`,
          timeout: 30_000,
        },
      )
      .toBe(true);
  });

  test('the new job appears in the employer jobs list', async ({ page }) => {
    await page.goto('/employer/jobs', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(
      page.locator('body'),
      'a job that exists over the API is missing from the employer jobs page',
    ).toContainText(jobTitle, { timeout: 25_000 });
  });
});

test.describe('post-a-job CRUD workspace', () => {
  test('uses the v3 surface and can edit and delete an existing job', async ({ page }) => {
    let jobs = [
      {
        _id: 'job-crud-1',
        title: 'Platform Engineer',
        type: 'Full-time',
        location: 'Toronto',
        description: 'Build the hiring platform.',
        status: 'active',
        visibility: 'private',
        salaryMin: 100000,
        salaryMax: 150000,
        responsibilities: [],
        requirements: [],
        benefits: [],
        skills: ['TypeScript'],
      },
    ];
    let patchedBody: Record<string, unknown> | null = null;
    let deletedId = '';

    await page.route('**/api/employer/jobs**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const id = url.pathname.split('/').at(-1);

      if (request.method() === 'GET' && id === 'jobs') {
        return route.fulfill({ status: 200, json: { jobs, total: jobs.length } });
      }
      if (request.method() === 'PATCH' && id === 'job-crud-1') {
        patchedBody = request.postDataJSON();
        jobs = jobs.map((job) =>
          job._id === id ? { ...job, ...(patchedBody as object) } : job,
        );
        return route.fulfill({ status: 200, json: { job: jobs[0] } });
      }
      if (request.method() === 'DELETE' && id === 'job-crud-1') {
        deletedId = id;
        jobs = [];
        return route.fulfill({ status: 200, json: { message: 'Job deleted successfully' } });
      }
      return route.continue();
    });

    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/employer/jobs/post', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#emapp')).toHaveAttribute('data-v3-page', 'true');
    await expect(page.getByText('Platform Engineer', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Edit Platform Engineer' }).click();
    await page.locator('#title').fill('Senior Platform Engineer');
    await page.locator('#salaryMin').fill('');
    await page.locator('#salaryMax').fill('');
    await page.getByRole('button', { name: /requirements/i }).click();
    await page.getByPlaceholder('Add a skill').fill('Node.js');
    await page.getByRole('button', { name: 'Add Skills' }).click();
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect.poll(() => patchedBody?.title).toBe('Senior Platform Engineer');
    expect(patchedBody).toMatchObject({
      salaryMin: null,
      salaryMax: null,
      status: 'active',
      visibility: 'private',
      skills: ['TypeScript', 'Node.js'],
    });
    await expect(
      page.getByLabel('Existing jobs').getByText('Senior Platform Engineer', { exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Delete Senior Platform Engineer' }).click();
    await expect.poll(() => deletedId).toBe('job-crud-1');
    await expect(
      page.getByLabel('Existing jobs').getByText('Senior Platform Engineer', { exact: true }),
    ).toHaveCount(0);
  });

  test('creates a new draft from the same workspace', async ({ page }) => {
    let createdBody: Record<string, unknown> | null = null;

    await page.route('**/api/employer/jobs**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const id = url.pathname.split('/').at(-1);

      if (request.method() === 'GET' && id === 'jobs') {
        return route.fulfill({ status: 200, json: { jobs: [], total: 0 } });
      }
      if (request.method() === 'POST' && id === 'jobs') {
        createdBody = request.postDataJSON();
        return route.fulfill({
          status: 201,
          json: { job: { _id: 'job-new', ...createdBody } },
        });
      }
      return route.continue();
    });

    await page.goto('/employer/jobs/post', { waitUntil: 'domcontentloaded' });
    await page.locator('#title').fill('Data Engineer');
    await page.locator('#location').fill('Remote');
    await page.locator('#description').fill('Build reliable data systems.');
    await page.getByRole('button', { name: /company details/i }).click();
    await page.locator('#companyName').fill('Jobocate Labs');
    await page.getByRole('button', { name: /save draft/i }).click();

    await expect.poll(() => createdBody?.title).toBe('Data Engineer');
    expect(createdBody).toMatchObject({
      companyName: 'Jobocate Labs',
      status: 'draft',
      visibility: 'public',
    });
    await expect(
      page.getByLabel('Existing jobs').getByText('Data Engineer', { exact: true }),
    ).toBeVisible();
  });
});
