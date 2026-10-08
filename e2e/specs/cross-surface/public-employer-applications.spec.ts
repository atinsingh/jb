import { test, expect, storage } from '../../fixtures/test';
import { api, uniqueId } from '../../support/api';

test.use({ storageState: storage.candidate });

test('public employer listings exclude private and draft jobs, including after a visibility change', async ({ employerUser, candidateUser }) => {
  const title = uniqueId('public-listing');
  const ids: string[] = [];
  try {
    for (const [suffix, status, visibility] of [['Public', 'active', 'public'], ['Private', 'active', 'private'], ['Draft', 'draft', 'public']]) {
      const result = await api.post<any>('/api/employer/jobs', { title: `${title} ${suffix}`, companyName: 'Public Listing Labs', status, visibility }, employerUser.token);
      ids.push(result.job._id);
    }
    const listing = await api.get<any>(`/api/public/jobs?q=${title}`);
    expect(listing.jobs.map(job => job.title)).toEqual([`${title} Public`]);
    const publicId = listing.jobs[0].id;
    await api.patch(`/api/employer/jobs/${ids[0]}`, { visibility: 'private' }, employerUser.token);
    expect((await api.get<any>(`/api/public/jobs?q=${title}`)).jobs).toEqual([]);
    await expect(api.get(`/api/public/jobs/${publicId}`)).rejects.toMatchObject({ status: 404 });
    await expect(api.post(`/api/applications/apply/${publicId}`, {}, candidateUser.token)).rejects.toMatchObject({ status: 404 });
  } finally {
    for (const id of ids) await api.del(`/api/employer/jobs/${id}`, employerUser.token);
  }
});

test('a website application reaches the job applicant list and opening it does not rerun review', async ({ page, browser, employerUser, candidateUser }) => {
  const title = uniqueId('website-apply');
  const created = await api.post<any>('/api/employer/jobs', {
    title, companyName: 'Website Apply Labs', description: 'Build TypeScript APIs.', status: 'active', visibility: 'public',
  }, employerUser.token);
  let applicationId: string | undefined;
  try {
    const { jobs } = await api.get<any>(`/api/public/jobs?q=${title}`);
    const jobId = jobs[0].id;
    const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      const visitor = await anonymous.newPage();
      await visitor.goto(new URL(`/jobs/${jobId}`, page.url() === 'about:blank' ? 'http://localhost:3000' : page.url()).href);
      await expect(visitor.getByRole('link', { name: 'Sign in to apply' })).toHaveAttribute('href', `/app/login?redirect=${encodeURIComponent(`/jobs/${jobId}`)}`);
    } finally { await anonymous.close(); }
    await page.goto(`/jobs/${jobId}`);
    await page.getByRole('button', { name: 'Apply on Jobocate', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Application submitted');
    const applications = await api.get<any>('/api/applications/my-applications', candidateUser.token);
    const application = applications.applications.find(item => item.jobId?._id === jobId);
    applicationId = application?._id;
    expect(application).toMatchObject({ status: 'submitted' });
    await page.reload();
    await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled();
    await expect.poll(async () => {
      const applicants = await api.get<any[]>(`/api/employer/applicants?jobId=${created.job._id}`, employerUser.token);
      return applicants.find(item => item.applicationId === applicationId)?.resumeAssessment?.status;
    }).toBe('NO_RESUME');
    const employerJobs = await api.get<any>('/api/employer/jobs', employerUser.token);
    expect(employerJobs.jobs.find(item => item._id === created.job._id).applicantCount).toBe(1);
    const context = await browser.newContext({ storageState: storage.employer });
    try {
      const employer = await context.newPage();
      let reviewCalls = 0;
      await employer.route('**/api/employer/applicants/*/resume-assessment', route => { reviewCalls++; return route.abort(); });
      await employer.route('**/api/employer/applicants/resume-assessment/acquire', route => route.fulfill({ json: { ready: true } }));
      await employer.route('**/api/employer/applicants/resume-assessment/budget', route => route.fulfill({ json: { status: 'READY', limitCredits: 100, spentCredits: 0, remainingCredits: 100 } }));
      await employer.route('**/api/employer/applicants/resume-assessment/preview?*', route => route.fulfill({ json: { saved: false } }));
      await employer.goto(new URL(`/employer/jobs/${created.job._id}/applications`, page.url()).href);
      await expect(employer.getByRole('region', { name: 'Applicants', exact: true })).toContainText(candidateUser.name);
      await expect(employer.getByText('No submitted resume is attached to this applicant.', { exact: true })).toBeVisible();
      await employer.reload();
      await expect(employer.getByText('No submitted resume is attached to this applicant.', { exact: true })).toBeVisible();
      expect(reviewCalls).toBe(0);
    } finally { await context.close(); }
  } finally {
    await api.del(`/api/employer/jobs/${created.job._id}`, employerUser.token);
  }
});
