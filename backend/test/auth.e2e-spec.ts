import { INestApplication } from '@nestjs/common';
import { api, auth, createE2EApp, resetDatabase, uniqueEmail } from './utils/e2e-app';

/**
 * Auth + readiness. These are the gates every other journey depends on, and the
 * two registration-hardening rules (§P0.3) that would be a live-account
 * takeover if they regressed.
 */
describe('Auth and readiness (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2EApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /health/readiness', () => {
    it('reports readiness without leaking secret values', async () => {
      const res = await api(app).get('/health/readiness').expect(200);

      expect(typeof res.body.ready).toBe('boolean');
      expect(Array.isArray(res.body.missing)).toBe(true);

      // Env presence must be booleans only — never the values themselves.
      Object.values(res.body.env ?? {}).forEach((v) =>
        expect(typeof v).toBe('boolean'),
      );
      expect(JSON.stringify(res.body)).not.toContain(process.env.JWT_SECRET);
    });

    it('is served unprefixed, the way the ops runbook and container healthcheck call it', async () => {
      await api(app).get('/health').expect(200);
      await api(app).get('/api/health/readiness').expect(404);
    });
  });

  describe('registration', () => {
    it('registers a candidate and returns a usable token', async () => {
      const email = uniqueEmail('candidate');
      const res = await api(app)
        .post('/api/auth/register')
        .send({ name: 'Ada Lovelace', email, password: 'E2ePassw0rd!' })
        .expect(201);

      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role).toBe('ROLE_CANDIDATE');

      const me = await api(app)
        .get('/api/auth/me')
        .set(auth(res.body.token))
        .expect(200);
      expect(me.body.user.email).toBe(email);
    });

    it('rejects a duplicate email instead of silently creating a second account', async () => {
      const email = uniqueEmail('dupe');
      const body = { name: 'First', email, password: 'E2ePassw0rd!' };

      await api(app).post('/api/auth/register').send(body).expect(201);
      await api(app).post('/api/auth/register').send(body).expect(409);
    });

    it('refuses self-registration as ROLE_ADMIN or ROLE_AGENT', async () => {
      for (const role of ['ROLE_ADMIN', 'ROLE_AGENT']) {
        await api(app)
          .post('/api/auth/register')
          .send({
            name: 'Privilege Escalation',
            email: uniqueEmail('escalate'),
            password: 'E2ePassw0rd!',
            role,
          })
          .expect(400);
      }
    });

    it('validates the payload rather than 500ing on bad input', async () => {
      await api(app)
        .post('/api/auth/register')
        .send({ name: 'No Email', password: 'E2ePassw0rd!' })
        .expect(400);

      await api(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak',
          email: uniqueEmail('weak'),
          password: '123',
        })
        .expect(400);
    });
  });

  describe('login', () => {
    it('issues a token for correct credentials and 401s for wrong ones', async () => {
      const email = uniqueEmail('login');
      const password = 'E2ePassw0rd!';
      await api(app)
        .post('/api/auth/register')
        .send({ name: 'Login Tester', email, password })
        .expect(201);

      // 201, not 200: the login handler has no @HttpCode, so Nest applies the
      // POST default. Harmless for clients, but it contradicts its own Swagger
      // annotation (@ApiResponse status 200).
      const ok = await api(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(201);
      expect(ok.body.token).toEqual(expect.any(String));

      await api(app)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword!' })
        .expect(401);

      await api(app)
        .post('/api/auth/login')
        .send({ email: uniqueEmail('ghost'), password })
        .expect(401);
    });

    it('logs in without email verification (alpha posture — no SMTP required)', async () => {
      const email = uniqueEmail('unverified');
      await api(app)
        .post('/api/auth/register')
        .send({ name: 'Unverified', email, password: 'E2ePassw0rd!' })
        .expect(201);

      await api(app)
        .post('/api/auth/login')
        .send({ email, password: 'E2ePassw0rd!' })
        .expect(201);
    });
  });

  describe('protected routes', () => {
    it('rejects missing and forged tokens', async () => {
      await api(app).get('/api/auth/me').expect(401);
      await api(app)
        .get('/api/auth/me')
        .set(auth('not.a.real.token'))
        .expect(401);
    });
  });
});
