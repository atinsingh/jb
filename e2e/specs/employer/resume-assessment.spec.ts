import { test, expect, storage } from '../../fixtures/test';

test.describe('Employer screening resume assessment', () => {
  test.use({ storageState: storage.employer });

  const applicantId = '64b000000000000000000003';

  async function mockScreening(page) {
    await page.route('**/api/employer/ai/screen', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ranked: [
            {
              applicantId,
              name: 'Ada Lovelace',
              title: 'Backend engineer',
              score: 88,
              rationale: 'Strong fit based on the existing recruiter rubric.',
            },
          ],
        }),
      }),
    );
    await page.route(`**/api/employer/applicants/${applicantId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: applicantId,
          resumeAssessment: { status: 'NOT_RUN' },
        }),
      }),
    );
  }

  async function mockBudget(page, overrides = {}) {
    await page.route('**/api/employer/applicants/resume-assessment/acquire', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ready: true }),
      }),
    );
    await page.route('**/api/employer/applicants/resume-assessment/budget', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'READY',
          spentUsd: 0.25,
          limitUsd: 1,
          remainingUsd: 0.75,
          period: 'monthly',
          resetAt: '2026-10-01T00:00:00.000Z',
          ...overrides,
        }),
      }),
    );
  }

  test('shows independent ATS and directional signals without changing fit', async ({
    page,
  }) => {
    await mockScreening(page);
    await mockBudget(page);
    await page.route(
      `**/api/employer/applicants/${applicantId}/resume-assessment`,
      (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'COMPLETE',
            ats: {
              status: 'COMPLETE',
              semanticMatch: 71,
              subScores: { skills: 74, experience: 68 },
              gaps: ['Kubernetes'],
              suggestions: ['Add measurable platform outcomes.'],
            },
            aiContent: {
              status: 'COMPLETE',
              composite: 42,
              detectorVersion: 'jobocate-heuristic-v1',
              weightingVersion: 'weights-v1',
              signals: {
                vocabularyDiversity: {
                  value: 0.61,
                  likelihood: 31,
                  explanation: 'Lower type-token diversity raises this directional signal.',
                },
              },
            },
          }),
        }),
    );

    await page.goto('/employer/screening');
    await page.getByText('Ada Lovelace').click();
    await expect(page.getByText('Assessment has not run.')).toBeVisible();
    await expect(page.getByText(/\$0\.75 of \$1\.00 remaining/i)).toBeVisible();
    await expect(page.getByText(/resets Oct 1/i)).toBeVisible();
    await expect(page.getByText(/does not use this budget/i)).toBeVisible();
    await page.getByRole('button', { name: 'Run resume assessment' }).click();

    await expect(page.getByText('ATS semantic match')).toBeVisible();
    await expect(page.getByText('71/100')).toBeVisible();
    await expect(page.getByText('Good to submit')).toBeVisible();
    await expect(
      page.getByText('AI-content likelihood (directional)'),
    ).toBeVisible();
    await expect(page.getByText('42/100')).toBeVisible();
    await expect(page.getByText(/false positives and false negatives/i)).toBeVisible();
    await expect(page.getByText('Kubernetes')).toBeVisible();

    // Existing recruiter fit semantics remain independent and unchanged.
    await expect(page.getByText('STRONG FIT', { exact: true })).toBeVisible();
    await expect(page.getByText('88', { exact: true })).toBeVisible();
  });

  test('treats the 70-point ATS boundary as improve before submitting', async ({
    page,
  }) => {
    await mockScreening(page);
    await mockBudget(page);
    await page.route(
      `**/api/employer/applicants/${applicantId}/resume-assessment`,
      (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'COMPLETE',
            ats: { status: 'COMPLETE', semanticMatch: 70 },
            aiContent: {
              status: 'COMPLETE',
              composite: 25,
              signals: {},
              detectorVersion: 'jobocate-heuristic-v1',
              weightingVersion: 'weights-v1',
            },
          }),
        }),
    );

    await page.goto('/employer/screening');
    await page.getByText('Ada Lovelace').click();
    await page.getByRole('button', { name: 'Run resume assessment' }).click();

    await expect(page.getByText('70/100')).toBeVisible();
    await expect(page.getByText('Improve before submitting')).toBeVisible();
  });

  test('shows the free heuristic when the employer ATS budget is exhausted', async ({
    page,
  }) => {
    await mockScreening(page);
    await mockBudget(page, {
      status: 'BUDGET_EXHAUSTED',
      spentUsd: 1,
      remainingUsd: 0,
      reason: 'EMPLOYER_BUDGET_EXHAUSTED',
    });
    await page.route(
      `**/api/employer/applicants/${applicantId}/resume-assessment`,
      (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'PARTIAL',
            ats: {
              status: 'BUDGET_EXHAUSTED',
              reason: 'EMPLOYER_BUDGET_EXHAUSTED',
              spentUsd: 1,
              limitUsd: 1,
              remainingUsd: 0,
              period: 'monthly',
            },
            aiContent: {
              status: 'COMPLETE',
              composite: 63,
              detectorVersion: 'jobocate-heuristic-v1',
              weightingVersion: 'weights-v1',
              signals: {
                stockPhrases: {
                  value: 1,
                  likelihood: 100,
                  explanation: 'Matches come only from the versioned Jobocate stock-phrase list.',
                },
              },
            },
          }),
        }),
    );

    await page.goto('/employer/screening');
    await page.getByText('Ada Lovelace').click();
    await expect(page.getByText(/ATS budget is exhausted/i)).toBeVisible();
    await page.getByRole('button', { name: 'Run resume assessment' }).click();

    await expect(page.getByText('Partial assessment')).toBeVisible();
    await expect(page.getByText('63/100')).toBeVisible();
    await expect(page.getByText(/does not use this budget/i)).toBeVisible();
    await expect(page.getByText(/ATS match was not run because/i)).toBeVisible();
  });

  test('job applications can score an uploaded resume without an applicant', async ({
    page,
  }) => {
    const jobId = '64b0000000000000000000aa';
    await page.route(`**/api/employer/jobs/${jobId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ job: { _id: jobId, title: 'Backend Engineer' } }),
      }),
    );
    await mockBudget(page);
    await page.route('**/api/employer/applicants?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );
    await page.route(
      `**/api/employer/applicants/resume-assessment/preview?**`,
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: false }) });
          return;
        }
        expect(route.request().method()).toBe('POST');
        const contentType = route.request().headers()['content-type'] || '';
        expect(contentType).toContain('multipart/form-data');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            preview: true,
            status: 'COMPLETE',
            ats: {
              status: 'COMPLETE',
              semanticMatch: 71,
              subScores: { skills: 74, experience: 68 },
              gaps: ['Kubernetes'],
              suggestions: ['Add measurable platform outcomes.'],
            },
            aiContent: {
              status: 'COMPLETE',
              composite: 42,
              detectorVersion: 'jobocate-heuristic-v1',
              weightingVersion: 'weights-v1',
              signals: {},
            },
          }),
        });
      },
    );

    await page.goto(`/employer/jobs/${jobId}/applications`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .getByLabel('Upload résumé for ATS preview')
      .setInputFiles({
        name: 'ada.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-preview'),
      });
    await page.getByRole('button', { name: 'Score uploaded résumé' }).click();

    await expect(page.getByText('Ad-hoc ATS preview')).toBeVisible();
    await expect(page.getByText('71/100')).toBeVisible();
    await expect(page.getByText('Good to submit')).toBeVisible();
    await expect(page.getByText('Ada Lovelace')).toHaveCount(0);
  });

  test('keeps the uploaded preview and reacquires its sandbox when the applications tab returns', async ({
    page, guards,
  }) => {
    guards.allowFailures('/resume-assessment/release');
    guards.allowConsoleErrors();
    const jobId = '64b0000000000000000000aa';
    const acquires: string[] = [];
    const releases: string[] = [];
    const reruns: string[] = [];
    await page.route(`**/api/employer/jobs/${jobId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ job: { _id: jobId, title: 'Backend Engineer' } }),
      }),
    );
    await mockBudget(page);
    await page.route('**/api/employer/applicants?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );
    await page.route(
      '**/api/employer/applicants/resume-assessment/acquire',
      (route) => {
        acquires.push(route.request().method());
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ready: true }),
        });
      },
    );
    await page.route(
      '**/api/employer/applicants/resume-assessment/preview?**',
      (route) => {
        if (route.request().method() === 'POST') reruns.push('POST');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            route.request().method() === 'GET'
              ? {
                  saved: true,
                  fileName: 'ada.pdf',
                  assessment: {
                    preview: true,
                    status: 'COMPLETE',
                    ats: { status: 'COMPLETE', semanticMatch: 71 },
                    aiContent: { status: 'COMPLETE', composite: 42, signals: {} },
                  },
                }
              : {
                  preview: true,
                  status: 'COMPLETE',
                  ats: { status: 'COMPLETE', semanticMatch: 72 },
                  aiContent: { status: 'COMPLETE', composite: 42, signals: {} },
                },
          ),
        });
      },
    );
    await page.route(
      '**/api/employer/applicants/resume-assessment/release',
      (route) => {
        releases.push(route.request().method());
        return route.fulfill({
          status: releases.length === 1 ? 503 : 200,
          contentType: 'application/json',
          body: JSON.stringify({ released: true }),
        });
      },
    );

    await page.goto(`/employer/jobs/${jobId}/applications`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect.poll(() => acquires.length).toBe(1);
    await expect(page.getByText('ada.pdf')).toBeVisible();
    await expect(page.getByText('Assessment has not run.')).toBeVisible();
    await expect(page.getByText('71/100')).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pagehide'));
    });

    await expect.poll(() => releases.length).toBe(2);
    expect(releases[0]).toBe('POST');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => acquires.length).toBe(2);
    await expect(page.getByText('Assessment has not run.')).toBeVisible();
    await expect(page.getByText('71/100')).toHaveCount(0);
    await page.getByRole('button', { name: 'Score uploaded résumé' }).click();
    await expect.poll(() => reruns.length).toBe(1);
    await expect(page.getByText('72/100')).toBeVisible();
  });

  test('waits for ATS acquisition before requesting the budget on first visit', async ({ page }) => {
    const jobId = '64b0000000000000000000aa';
    let sandboxReady = false;
    let budgetBeforeReady = false;
    await page.route(`**/api/employer/jobs/${jobId}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job: { _id: jobId, title: 'Backend Engineer' } }) }),
    );
    await page.route('**/api/employer/applicants?**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );
    await page.route('**/api/employer/applicants/resume-assessment/acquire', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      sandboxReady = true;
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ready: true }) });
    });
    await page.route('**/api/employer/applicants/resume-assessment/budget', (route) => {
      budgetBeforeReady ||= !sandboxReady;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sandboxReady
          ? { status: 'READY', spentUsd: 0, limitUsd: 1, remainingUsd: 1 }
          : { status: 'CONFIGURATION_ERROR', reason: 'EMPLOYER_ATS_CONFIGURATION_ERROR' }),
      });
    });
    await page.route('**/api/employer/applicants/resume-assessment/preview?**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: false }) }),
    );

    await page.goto(`/employer/jobs/${jobId}/applications`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect(page.getByText('ATS budget: $1.00 of $1.00 remaining this month.')).toBeVisible();
    expect(budgetBeforeReady).toBe(false);
  });

  test('renews the ATS sandbox while the applications page remains visible', async ({ page }) => {
    const jobId = '64b0000000000000000000aa';
    let acquires = 0;
    await page.clock.install();
    await page.route(`**/api/employer/jobs/${jobId}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job: { _id: jobId, title: 'Backend Engineer' } }) }),
    );
    await page.route('**/api/employer/applicants?**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
    );
    await page.route('**/api/employer/applicants/resume-assessment/acquire', (route) => {
      acquires += 1;
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ready: true }) });
    });
    await page.route('**/api/employer/applicants/resume-assessment/budget', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'READY' }) }),
    );
    await page.route('**/api/employer/applicants/resume-assessment/preview?**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: false }) }),
    );

    await page.goto(`/employer/jobs/${jobId}/applications`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => acquires).toBe(1);
    await page.clock.fastForward(5 * 60 * 1000);
    await expect.poll(() => acquires).toBe(2);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.fastForward(16 * 60 * 1000);
    expect(acquires).toBe(2);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => acquires).toBe(3);
  });

  test('explains that ATS matching stopped because the scoring container became unavailable', async ({
    page,
  }) => {
    const jobId = '64b0000000000000000000aa';
    await page.route(`**/api/employer/jobs/${jobId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ job: { _id: jobId, title: 'Backend Engineer' } }),
      }),
    );
    await mockBudget(page);
    await page.route('**/api/employer/applicants?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );
    await page.route(
      `**/api/employer/applicants/resume-assessment/preview?**`,
      (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            preview: true,
            status: 'PARTIAL',
            ats: {
              status: 'ATS_INTERRUPTED',
              reason: 'EMPLOYER_ATS_SANDBOX_RELEASED',
              harness: 'ats',
            },
            aiContent: {
              status: 'COMPLETE',
              composite: 32,
              detectorVersion: 'jobocate-heuristic-v1',
              weightingVersion: 'weights-v1',
              signals: {},
            },
          }),
        }),
    );

    await page.goto(`/employer/jobs/${jobId}/applications`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .getByLabel('Upload résumé for ATS preview')
      .setInputFiles({
        name: 'ada.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-preview'),
      });
    await page.getByRole('button', { name: 'Score uploaded résumé' }).click();

    await expect(
      page.getByText(/scoring container became unavailable/i),
    ).toBeVisible();
    await expect(
      page.getByText('ATS matching failed during execution. Retry the assessment.'),
    ).toHaveCount(0);
  });

  test('keeps an ATS preview running when the tab loses focus', async ({
    page,
  }) => {
    const jobId = '64b0000000000000000000aa';
    const releases: string[] = [];
    await page.route(`**/api/employer/jobs/${jobId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ job: { _id: jobId, title: 'Backend Engineer' } }),
      }),
    );
    await mockBudget(page);
    await page.route('**/api/employer/applicants?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );
    await page.route(
      '**/api/employer/applicants/resume-assessment/release',
      (route) => {
        releases.push(route.request().method());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ released: true }),
        });
      },
    );
    await page.route(
      `**/api/employer/applicants/resume-assessment/preview?**`,
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: false }) });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            preview: true,
            status: 'COMPLETE',
            ats: { status: 'COMPLETE', semanticMatch: 71 },
            aiContent: { status: 'COMPLETE', composite: 42, signals: {} },
          }),
        });
      },
    );

    await page.goto(`/employer/jobs/${jobId}/applications`, {
      waitUntil: 'domcontentloaded',
    });
    await page
      .getByLabel('Upload résumé for ATS preview')
      .setInputFiles({
        name: 'ada.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-preview'),
      });
    await page.getByRole('button', { name: 'Score uploaded résumé' }).click();
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(page.getByText('71/100')).toBeVisible();
    expect(releases).toHaveLength(0);
  });
});
