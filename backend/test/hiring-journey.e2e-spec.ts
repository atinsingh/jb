import { INestApplication } from '@nestjs/common';
import {
  api,
  auth,
  createE2EApp,
  registerUser,
  resetDatabase,
  TestUser,
} from './utils/e2e-app';

/**
 * The go-live spine, end to end across both surfaces:
 *
 *   employer posts a job -> job is published into the candidate search pool
 *   -> candidate finds and applies -> application shows in the candidate's
 *   tracker -> the same application shows in the employer's pipeline.
 *
 * That last hop is the "pipeline bridge". Until it was wired, the employer
 * pipeline/interviews/offers screens were permanently empty no matter how many
 * candidates applied, so it is the single most important thing to prove before
 * taking real money from employers.
 *
 * Steps share state and must run in order — jest runs `it` blocks sequentially
 * within a describe, and the file is pinned to a single worker.
 */
describe('Employer -> candidate -> employer hiring journey (e2e)', () => {
  let app: INestApplication;
  let employer: TestUser;
  let candidate: TestUser;

  /** EmployerJob id (employer surface) vs Job id (candidate search pool) — distinct documents. */
  let employerJobId: string;
  let searchJobId: string;
  let applicationId: string;

  const JOB = {
    title: 'Senior Frontend Engineer (E2E)',
    companyName: 'E2E Test Corp',
    location: 'Toronto, ON',
    isRemote: true,
    type: 'Full-time',
    salaryMin: 120000,
    salaryMax: 160000,
    salaryPeriod: 'year',
    description: 'Build the Jobocate candidate surface with React and Node.',
    requirements: ['5+ years React', 'TypeScript'],
    skills: ['React', 'TypeScript', 'Node.js'],
  };

  beforeAll(async () => {
    app = await createE2EApp();
    await resetDatabase(app);
    employer = await registerUser(app, 'ROLE_EMPLOYER', 'employer');
    candidate = await registerUser(app, 'ROLE_CANDIDATE', 'candidate');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('1. employer posts a job', async () => {
    const res = await api(app)
      .post('/api/employer/jobs')
      .set(auth(employer.token))
      .send(JOB)
      .expect(201);

    employerJobId = res.body.job._id;
    expect(employerJobId).toEqual(expect.any(String));
    // Jobs start as drafts — a draft must not be visible to candidates yet.
    expect(res.body.job.status).toBe('draft');
  });

  it('2. a draft job stays out of the candidate search pool', async () => {
    const res = await api(app)
      .get('/api/jobs')
      .set(auth(candidate.token))
      .expect(200);

    const jobs = res.body.jobs ?? res.body.data ?? res.body;
    expect(
      (jobs as any[]).some((j) => j.title === JOB.title && j.isActive),
    ).toBe(false);
  });

  it('3. activating the job publishes it into the candidate search pool', async () => {
    await api(app)
      .patch(`/api/employer/jobs/${employerJobId}/status`)
      .set(auth(employer.token))
      .send({ status: 'active' })
      .expect(200);

    const res = await api(app)
      .get('/api/jobs')
      .set(auth(candidate.token))
      .expect(200);

    const jobs = (res.body.jobs ?? res.body.data ?? res.body) as any[];
    const published = jobs.find((j) => j.title === JOB.title);

    expect(published).toBeDefined();
    searchJobId = published._id ?? published.id;

    // Shape the matching/eligibility engine depends on.
    expect(published.source).toBe('Jobocate');
    expect(published.isExternal).toBe(false);
    expect(published.verifiedEmployer).toBe(true);
    expect(published.workplaceType).toBe('REMOTE');
    expect(published.sourceJobKey).toBe(employerJobId);
  });

  it('4. candidate applies to the published job', async () => {
    const res = await api(app)
      .post(`/api/applications/apply/${searchJobId}`)
      .set(auth(candidate.token))
      .expect(201);

    applicationId = res.body.application?._id ?? res.body.application?.id;
    expect(applicationId).toEqual(expect.any(String));
  });

  it('5. a duplicate application is a 400, not a 500 or a second row', async () => {
    await api(app)
      .post(`/api/applications/apply/${searchJobId}`)
      .set(auth(candidate.token))
      .expect(400);

    const res = await api(app)
      .get('/api/applications/my-applications')
      .set(auth(candidate.token))
      .expect(200);

    const applications = (res.body.applications ?? res.body) as any[];
    expect(
      applications.filter((a) => String(a.jobId?._id ?? a.jobId) === searchJobId)
        .length,
    ).toBe(1);
  });

  it('6. the application appears in the candidate tracker', async () => {
    const res = await api(app)
      .get('/api/applications/my-applications')
      .set(auth(candidate.token))
      .expect(200);

    const applications = (res.body.applications ?? res.body) as any[];
    const mine = applications.find((a) => String(a._id) === applicationId);
    expect(mine).toBeDefined();
  });

  it('7. THE BRIDGE: the same application appears in the employer pipeline', async () => {
    const res = await api(app)
      .get('/api/employer/applicants')
      .set(auth(employer.token))
      .expect(200);

    const applicants = (res.body.applicants ?? res.body.data ?? res.body) as any[];
    expect(Array.isArray(applicants)).toBe(true);

    const bridged = applicants.find(
      (a) => String(a.jobId?._id ?? a.jobId) === String(employerJobId),
    );
    expect(bridged).toBeDefined();
    expect(bridged.candidateName || bridged.name).toBeTruthy();
  });

  it('8. employer moves the applicant through a pipeline stage', async () => {
    const list = await api(app)
      .get('/api/employer/applicants')
      .set(auth(employer.token))
      .expect(200);

    const applicants = (list.body.applicants ?? list.body.data ?? list.body) as any[];
    const applicantId = applicants[0]?._id ?? applicants[0]?.id;
    expect(applicantId).toBeDefined();

    await api(app)
      .patch(`/api/employer/applicants/${applicantId}/stage`)
      .set(auth(employer.token))
      .send({ stage: 'screening' })
      .expect(200);

    const stats = await api(app)
      .get('/api/employer/applicants/stats')
      .set(auth(employer.token))
      .expect(200);
    expect(stats.body).toBeDefined();
  });

  it('9. another employer cannot read this employer pipeline', async () => {
    const other = await registerUser(app, 'ROLE_EMPLOYER', 'rival');

    const res = await api(app)
      .get('/api/employer/applicants')
      .set(auth(other.token))
      .expect(200);

    const applicants = (res.body.applicants ?? res.body.data ?? res.body) as any[];
    expect(applicants).toHaveLength(0);

    await api(app)
      .patch(`/api/employer/jobs/${employerJobId}/status`)
      .set(auth(other.token))
      .send({ status: 'closed' })
      .expect((r) => {
        if (r.status === 200) {
          throw new Error(
            'A rival employer closed a job they do not own — tenant isolation is broken',
          );
        }
      });
  });
});
