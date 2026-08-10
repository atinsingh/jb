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
 * Role boundaries on live-money and live-data surfaces. Every route here is one
 * a self-registered user could hit on day one of the alpha, so each assertion is
 * a "would this be a breach" check rather than a coverage exercise.
 */
describe('Role-based access control (e2e)', () => {
  let app: INestApplication;
  let candidate: TestUser;
  let employer: TestUser;

  beforeAll(async () => {
    app = await createE2EApp();
    await resetDatabase(app);
    candidate = await registerUser(app, 'ROLE_CANDIDATE', 'rbac-candidate');
    employer = await registerUser(app, 'ROLE_EMPLOYER', 'rbac-employer');
  });

  afterAll(async () => {
    await app?.close();
  });

  const forbidden = (status: number) => [401, 403].includes(status);

  describe('admin console', () => {
    const adminRoutes = [
      '/api/admin/users',
      '/api/admin/metrics',
      '/api/admin/jobs',
    ];

    it.each(adminRoutes)('%s is closed to candidates', async (route) => {
      const res = await api(app).get(route).set(auth(candidate.token));
      expect(forbidden(res.status)).toBe(true);
    });

    it.each(adminRoutes)('%s is closed to employers', async (route) => {
      const res = await api(app).get(route).set(auth(employer.token));
      expect(forbidden(res.status)).toBe(true);
    });

    it.each(adminRoutes)('%s is closed to anonymous callers', async (route) => {
      const res = await api(app).get(route);
      expect(forbidden(res.status)).toBe(true);
    });
  });

  describe('employer surface', () => {
    it('is closed to candidates', async () => {
      for (const route of [
        '/api/employer/jobs',
        '/api/employer/applicants',
      ]) {
        const res = await api(app).get(route).set(auth(candidate.token));
        expect(forbidden(res.status)).toBe(true);
      }
    });

    it('rejects a candidate posting a job', async () => {
      const res = await api(app)
        .post('/api/employer/jobs')
        .set(auth(candidate.token))
        .send({ title: 'Should never exist' });
      expect(forbidden(res.status)).toBe(true);
    });
  });

  describe('candidate surface', () => {
    it('requires authentication', async () => {
      for (const route of [
        '/api/applications/my-applications',
        '/api/users/preferences',
        '/api/matching/eligible-jobs',
      ]) {
        await api(app).get(route).expect(401);
      }
    });

    it('serves an authenticated candidate its own (empty) data', async () => {
      const res = await api(app)
        .get('/api/applications/my-applications')
        .set(auth(candidate.token))
        .expect(200);

      const applications = (res.body.applications ?? res.body) as any[];
      expect(Array.isArray(applications)).toBe(true);
      expect(applications).toHaveLength(0);
    });
  });

  describe('scraper controls', () => {
    it('does not expose job-monitor triggers to non-admins', async () => {
      // Public scraper triggers were an unauthenticated hole closed in P0.3.
      for (const token of [candidate.token, employer.token]) {
        const res = await api(app)
          .post('/api/jobs/monitor/run')
          .set(auth(token))
          .send({});
        expect([401, 403, 404]).toContain(res.status);
      }

      const anon = await api(app).post('/api/jobs/monitor/run').send({});
      expect([401, 403, 404]).toContain(anon.status);
    });
  });
});
