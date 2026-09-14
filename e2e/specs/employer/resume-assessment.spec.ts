import { test, expect, storage } from '../../fixtures/test';

test.describe('Employer screening resume assessment', () => {
  test.use({ storageState: storage.employer });

  test('shows independent ATS and directional signals without changing fit', async ({
    page,
  }) => {
    await page.route('**/api/employer/ai/screen', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ranked: [
            {
              applicantId: '64b000000000000000000003',
              name: 'Ada Lovelace',
              title: 'Backend engineer',
              score: 88,
              rationale: 'Strong fit based on the existing recruiter rubric.',
            },
          ],
        }),
      }),
    );
    await page.route('**/api/employer/applicants/64b000000000000000000003', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: '64b000000000000000000003',
          resumeAssessment: { status: 'NOT_RUN' },
        }),
      }),
    );
    await page.route(
      '**/api/employer/applicants/64b000000000000000000003/resume-assessment',
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
});
