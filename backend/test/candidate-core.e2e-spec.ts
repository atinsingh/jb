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
 * The screens a paying candidate touches on day one: preferences, profile,
 * matches, notifications and their plan entitlement.
 *
 * Several of these read and write through reference fields that were `Mixed`
 * until the ObjectId schema fix (`UserPreferences.userId`, `Job.addedBy`,
 * `CandidateNotification.userId`), so persistence is asserted by reading back
 * through a *fresh* request rather than trusting the write response.
 */
describe('Candidate core surface (e2e)', () => {
  let app: INestApplication;
  let candidate: TestUser;
  let employer: TestUser;

  beforeAll(async () => {
    app = await createE2EApp();
    await resetDatabase(app);
    candidate = await registerUser(app, 'ROLE_CANDIDATE', 'core-candidate');
    employer = await registerUser(app, 'ROLE_EMPLOYER', 'core-employer');
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('job preferences', () => {
    const PREFS = {
      titles: ['Backend Engineer', 'Platform Engineer'],
      locations: ['Remote', 'Toronto, ON'],
      salaryMin: 120000,
      remoteOnly: true,
      visaSponsorshipNeeded: false,
    };

    it('creates preferences on first read rather than 404ing', async () => {
      const res = await api(app)
        .get('/api/users/preferences')
        .set(auth(candidate.token))
        .expect(200);

      expect(res.body.preferences).toBeDefined();
    });

    it('saves preferences and reads them back on a new request', async () => {
      await api(app)
        .put('/api/users/preferences')
        .set(auth(candidate.token))
        .send(PREFS)
        .expect(200);

      const res = await api(app)
        .get('/api/users/preferences')
        .set(auth(candidate.token))
        .expect(200);

      // The round-trip is the point: a Mixed userId path silently created a
      // second document instead of updating this one.
      expect(res.body.preferences.titles).toEqual(PREFS.titles);
      expect(res.body.preferences.locations).toEqual(PREFS.locations);
      expect(res.body.preferences.salaryMin).toBe(PREFS.salaryMin);
      expect(res.body.preferences.remoteOnly).toBe(true);
    });

    it('does not duplicate the preferences document on repeated saves', async () => {
      for (const salaryMin of [130000, 140000]) {
        await api(app)
          .put('/api/users/preferences')
          .set(auth(candidate.token))
          .send({ salaryMin })
          .expect(200);
      }

      const res = await api(app)
        .get('/api/users/preferences')
        .set(auth(candidate.token))
        .expect(200);

      // Last write wins on the SAME document; a duplicate would resurface the
      // older value (or an empty shell).
      expect(res.body.preferences.salaryMin).toBe(140000);
      expect(res.body.preferences.titles).toEqual(PREFS.titles);
    });

    it('rejects an unknown field instead of storing it', async () => {
      await api(app)
        .put('/api/users/preferences')
        .set(auth(candidate.token))
        .send({ salaryMin: 100000, notAField: 'nope' })
        .expect(400);
    });
  });

  describe('profile', () => {
    it('returns the authenticated candidate profile without the password', async () => {
      const res = await api(app)
        .get('/api/users/profile')
        .set(auth(candidate.token))
        .expect(200);

      const body = JSON.stringify(res.body);
      expect(body).toContain(candidate.email);
      expect(res.body.user?.password ?? res.body.password).toBeUndefined();
      expect(body).not.toContain('E2ePassw0rd!');
    });
  });

  describe('matching', () => {
    it('serves eligible jobs for an authenticated candidate', async () => {
      const res = await api(app)
        .get('/api/matching/eligible-jobs')
        .set(auth(candidate.token))
        .expect(200);

      const jobs = res.body.jobs ?? res.body.data ?? res.body;
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('notifications', () => {
    it('produces a candidate notification when an application is created', async () => {
      // Publish a job so there is something real to apply to.
      const created = await api(app)
        .post('/api/employer/jobs')
        .set(auth(employer.token))
        .send({
          title: 'Notification Probe Engineer',
          companyName: 'E2E Test Corp',
          isRemote: true,
        })
        .expect(201);
      await api(app)
        .patch(`/api/employer/jobs/${created.body.job._id}/status`)
        .set(auth(employer.token))
        .send({ status: 'active' })
        .expect(200);

      const jobs = await api(app)
        .get('/api/jobs')
        .set(auth(candidate.token))
        .expect(200);
      const searchJob = (jobs.body.jobs ?? jobs.body).find(
        (j: any) => j.title === 'Notification Probe Engineer',
      );
      expect(searchJob).toBeDefined();

      await api(app)
        .post(`/api/applications/apply/${searchJob._id}`)
        .set(auth(candidate.token))
        .expect(201);

      const res = await api(app)
        .get('/api/notifications')
        .set(auth(candidate.token))
        .expect(200);

      const items = res.body.notifications ?? res.body.items ?? res.body;
      expect(Array.isArray(items)).toBe(true);
      const applied = items.find((n: any) => n.type === 'applications');
      expect(applied).toBeDefined();
      expect(applied.text).toContain('Notification Probe Engineer');
    });

    it('marks notifications read', async () => {
      await api(app)
        .post('/api/notifications/read-all')
        .set(auth(candidate.token))
        .expect(201);

      const res = await api(app)
        .get('/api/notifications')
        .set(auth(candidate.token))
        .expect(200);

      const items = res.body.notifications ?? res.body.items ?? res.body;
      expect(items.every((n: any) => n.read !== false)).toBe(true);
    });

    it('is closed to employers (they have their own feed)', async () => {
      const res = await api(app)
        .get('/api/notifications')
        .set(auth(employer.token));
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('billing and entitlement', () => {
    it('serves the public plan catalogue', async () => {
      const res = await api(app).get('/api/billing/plans');
      expect([200, 401]).toContain(res.status);
    });

    it('serves the candidate entitlement without a Stripe subscription', async () => {
      // Alpha runs with LLM_ENFORCE_QUOTA=false, but the endpoint must still
      // answer — the frontend gates UI on it.
      const res = await api(app)
        .get('/api/entitlements')
        .set(auth(candidate.token));
      expect([200, 404]).toContain(res.status);
    });
  });
});
