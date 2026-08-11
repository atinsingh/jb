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
