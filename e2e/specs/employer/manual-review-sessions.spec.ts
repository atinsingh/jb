import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';
import { api, uniqueId } from '../../support/api';
import { URLS } from '../../playwright.config';
import * as fs from 'fs';
import * as path from 'path';

test.use({ storageState: storage.employer });

test('uploaded reviews survive navigation and reopen separately from applicants without charging again', async ({ page, guards }) => {
  const jobId = '64b000000000000000000006';
  const applicantId = '64b000000000000000000003';
  const sessions: any[] = [];
  let runs = 0;
  let sandboxReady = true;
  let failRerun = false;
  const result = (score: number) => ({
    preview: true, status: 'COMPLETE', runId: `run-${score}`,
    ats: { status: 'COMPLETE', semanticMatch: score, gaps: ['Kubernetes'] },
    aiContent: { status: 'COMPLETE', composite: 23, signals: {} },
  });
  const applicant = { _id: applicantId, candidateName: 'Website Applicant', stage: 'applied', resumeAssessment: result(95) };
  await page.route(`**/api/employer/jobs/${jobId}`, route => route.fulfill({ json: { job: { _id: jobId, title: 'Backend Engineer' } } }));
  await page.route('**/api/employer/applicants?**', route => route.fulfill({ json: [applicant] }));
  await page.route(`**/api/employer/applicants/${applicantId}`, route => route.fulfill({ json: applicant }));
  await page.route('**/api/employer/applicants/resume-assessment/acquire', route => route.fulfill({ status: sandboxReady ? 201 : 503, json: { ready: sandboxReady, message: 'Scoring unavailable' } }));
  await page.route('**/api/employer/applicants/resume-assessment/release', route => route.fulfill({ json: { released: true } }));
  await page.route('**/api/employer/applicants/resume-assessment/budget', route => route.fulfill({ json: { status: 'READY', limitCredits: 100, spentCredits: 2, remainingCredits: 98 } }));
  await page.route('**/api/employer/applicants/resume-assessment/preview?**', route => {
    const id = new URL(route.request().url()).searchParams.get('sessionId');
    if (route.request().method() === 'GET') {
      const session = sessions.find(item => item.sessionId === id) || sessions[0];
      return route.fulfill({ json: {
        saved: !!session, ...session,
        resumeText: id ? session?.resumeText : undefined,
        sessions: sessions.map(({ resumeText, ...summary }) => summary),
      } });
    }
    if (id && failRerun) return route.fulfill({ status: 503, json: { message: 'Review could not start' } });
    runs += 1;
    if (id) {
      const session = sessions.find(item => item.sessionId === id);
      session.assessment = result(79);
      return route.fulfill({ json: { ...session.assessment, ...session } });
    }
    const session = {
      sessionId: runs === 1 ? '64b000000000000000000011' : '64b000000000000000000012',
      fileName: runs === 1 ? 'ada.pdf' : 'grace.pdf', createdAt: '2026-10-08T10:00:00Z',
      resumeText: runs === 1 ? 'Ada original backend resume.' : 'Grace original platform resume.',
      assessment: result(runs === 1 ? 71 : 88),
    };
    sessions.unshift(session);
    return route.fulfill({ json: { ...session.assessment, ...session } });
  });

  await page.goto(`/employer/jobs/${jobId}`);
  for (const name of ['ada.pdf', 'grace.pdf']) {
    await page.getByLabel('Upload resume for ATS preview').setInputFiles({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
    await page.getByRole('button', { name: 'Score uploaded resume', exact: true }).click();
    await expect.poll(() => runs).toBe(name === 'ada.pdf' ? 1 : 2);
    await expect(page.getByRole('region', { name: 'Uploaded review detail' })).toContainText(name);
  }
  const reviews = page.getByRole('region', { name: 'Uploaded reviews' });
  await expect(reviews.getByRole('button')).toHaveCount(2);
  await reviews.getByRole('button', { name: /ada.pdf/ }).click();
  const detail = page.getByRole('region', { name: 'Uploaded review detail' });
  await expect(detail).toContainText('71/100');
  await detail.getByText('View extracted resume', { exact: true }).click();
  await expect(detail).toContainText('Ada original backend resume.');
  await expect(detail.getByRole('button', { name: 'Reject' })).toHaveCount(0);
  await expect(page.getByText('1 applicant in this pipeline', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/review=64b000000000000000000011/);

  await detail.getByRole('button', { name: 'Re-run uploaded review' }).click();
  await expect(detail).toContainText('79/100');
  expect(runs).toBe(3);

  failRerun = true;
  guards.allowFailures('/resume-assessment/preview');
  guards.allowConsoleErrors();
  await detail.getByRole('button', { name: 'Re-run uploaded review' }).click();
  await expect(page.getByText('Review could not start', { exact: true })).toBeVisible();
  await expect(detail).toContainText('79/100');
  expect(runs).toBe(3);

  sandboxReady = false;
  guards.allowFailures('/resume-assessment/acquire');
  guards.allowConsoleErrors();
  await page.reload();
  await expect(detail).toContainText('79/100');
  await expect(detail.getByRole('button', { name: 'Re-run uploaded review' })).toBeDisabled();
  expect(runs).toBe(3);
  await reviews.getByRole('button', { name: /grace.pdf/ }).click();
  await expect(detail).toContainText('88/100');
  expect(runs).toBe(3);
  await page.getByRole('region', { name: 'Applicants' }).getByRole('button', { name: /Website Applicant/ }).click();
  await expect(page.getByRole('region', { name: 'Applicant detail' })).toContainText('95/100');
  await expect(detail).toHaveCount(0);
  await expect(page).not.toHaveURL(/review=/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page, 'saved upload reviews');
});

test('real API stores separate uploads and retrieves an older session without scoring or creating applicants', async ({ request, employerUser }) => {
  const { job } = await api.post<any>('/api/employer/jobs', {
    title: uniqueId('saved-review'), companyName: 'E2E Review Sessions', status: 'draft',
  }, employerUser.token);
  const endpoint = `${URLS.backend}/api/employer/applicants/resume-assessment/preview?jobId=${job._id}`;
  const headers = { Authorization: `Bearer ${employerUser.token}` };
  const buffer = fs.readFileSync(path.join(__dirname, '../../fixtures/ats-preview.pdf'));
  try {
    const sessions: any[] = [];
    for (const fileName of ['first.pdf', 'second.pdf']) {
      const response = await request.post(endpoint, {
        headers, multipart: { resume: { name: fileName, mimeType: 'application/pdf', buffer } },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
      const session = await response.json();
      expect(session.status).toBe('NO_JOB_DESCRIPTION'); // No external model call or credits.
      sessions.push(session);
    }
    expect(sessions[0].sessionId).not.toBe(sessions[1].sessionId);
    const history = await (await request.get(endpoint, { headers })).json();
    expect(history.sessions.map((item: any) => item.fileName)).toEqual(['second.pdf', 'first.pdf']);
    const reopened = await (await request.get(`${endpoint}&sessionId=${sessions[0].sessionId}`, { headers })).json();
    expect(reopened.fileName).toBe('first.pdf');
    expect(reopened.assessment.runId).toBe(sessions[0].runId);
    expect(reopened.resumeText.length).toBeGreaterThan(20);
    const applicants = await api.get<any>(`/api/employer/applicants?jobId=${job._id}`, employerUser.token);
    expect(Array.isArray(applicants) ? applicants : applicants.applicants).toHaveLength(0);
    const jobs = await api.get<any>('/api/employer/jobs', employerUser.token);
    expect(jobs.jobs.find((item: any) => item._id === job._id).applicantCount).toBe(0);
  } finally {
    await api.del(`/api/employer/jobs/${job._id}`, employerUser.token);
  }
});
