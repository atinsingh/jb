import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID, generateKeyPairSync } from 'crypto';
import { importJWK, SignJWT } from 'jose';

import {
  api,
  auth,
  createE2EApp,
  registerUser,
  resetDatabase,
  uniqueEmail,
} from './utils/e2e-app';
import { signTestAccessToken } from './utils/supabase-test-auth';

const ISSUER = 'https://e2e.supabase.test/auth/v1';

/**
 * Auth and readiness — the gates every other journey depends on.
 *
 * Registration and login endpoints are gone: Supabase Auth owns identity, and
 * nothing in this codebase mints a token or writes a password hash. What is left
 * to prove is that the guard verifies Supabase-issued tokens correctly, which is
 * the boundary the whole API sits behind.
 *
 * Tokens are signed with the throwaway keypair from setup-e2e.ts and checked
 * through the real `jwtVerify` path — signature, issuer, audience and expiry all
 * genuinely validated. Nothing is mocked, and the suite still makes no network
 * calls.
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
      expect(JSON.stringify(res.body)).not.toContain(
        process.env.E2E_SIGNING_JWK as string,
      );
    });

    it('is served unprefixed, the way the ops runbook and container healthcheck call it', async () => {
      await api(app).get('/health').expect(200);
      await api(app).get('/api/health/readiness').expect(404);
    });
  });

  describe('token verification', () => {
    it('accepts a valid Supabase token and resolves the local user', async () => {
      const user = await registerUser(app, 'ROLE_CANDIDATE', 'auth-valid');

      const res = await api(app)
        .get('/api/auth/me')
        .set(auth(user.token))
        .expect(200);

      expect(res.body.user.email).toBe(user.email);
      expect(res.body.user.role).toBe('ROLE_CANDIDATE');
      // Supabase holds identity; the local document holds everything else.
      expect(res.body.user.currentPlanType).toBe('FREE');
      // The password field must never leave the API, migrated users included.
      expect(res.body.user.password).toBeUndefined();
    });

    it('rejects an absent token', async () => {
      await api(app).get('/api/auth/me').expect(401);
    });

    it('rejects a malformed token', async () => {
      await api(app)
        .get('/api/auth/me')
        .set(auth('not.a.real.token'))
        .expect(401);
    });

    it('rejects an expired token', async () => {
      const token = await signTestAccessToken({
        sub: randomUUID(),
        email: uniqueEmail('auth-expired'),
        expiresInSeconds: -60,
      });

      const res = await api(app).get('/api/auth/me').set(auth(token)).expect(401);

      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects a token signed by a key we do not trust', async () => {
      // A structurally perfect token, signed by the wrong key and even carrying
      // our kid. This is the case that matters most: it is what an attacker
      // would actually try.
      const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const key = await importJWK(
        privateKey.export({ format: 'jwk' }) as any,
        'RS256',
      );

      const forged = await new SignJWT({ email: 'attacker@example.com' })
        .setProtectedHeader({ alg: 'RS256', kid: process.env.E2E_SIGNING_KID as string })
        .setSubject(randomUUID())
        .setIssuer(ISSUER)
        .setAudience('authenticated')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(key);

      await api(app).get('/api/auth/me').set(auth(forged)).expect(401);
    });

    it('rejects a token whose audience is not "authenticated"', async () => {
      const key = await importJWK(
        JSON.parse(process.env.E2E_SIGNING_JWK as string),
        'RS256',
      );

      const wrongAudience = await new SignJWT({ email: uniqueEmail('aud') })
        .setProtectedHeader({ alg: 'RS256', kid: process.env.E2E_SIGNING_KID as string })
        .setSubject(randomUUID())
        .setIssuer(ISSUER)
        .setAudience('anon')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(key);

      await api(app).get('/api/auth/me').set(auth(wrongAudience)).expect(401);
    });
  });

  describe('Supabase to Mongo sync', () => {
    it('lazily creates a local user on the first authenticated request', async () => {
      // The webhook is the primary sync channel, but a first API call can beat
      // it. A valid token must always resolve to a user.
      const sub = randomUUID();
      const email = uniqueEmail('lazy-upsert');
      const token = await signTestAccessToken({ sub, email, name: 'Lazy User' });

      const res = await api(app).get('/api/auth/me').set(auth(token)).expect(200);

      expect(res.body.user.email).toBe(email);
      expect(res.body.user.supabaseUserId).toBe(sub);
      expect(res.body.user.role).toBe('ROLE_CANDIDATE');
    });

    it('honours an employer sign-up, matching the old RegisterDto', async () => {
      const sub = randomUUID();
      const email = uniqueEmail('employer-signup');
      const token = await signTestAccessToken({
        sub,
        email,
        role: 'ROLE_EMPLOYER',
      });

      const res = await api(app).get('/api/auth/me').set(auth(token)).expect(200);

      expect(res.body.user.role).toBe('ROLE_EMPLOYER');
    });

    it('refuses to let user_metadata self-assign a privileged role', async () => {
      // user_metadata is USER-WRITABLE. Only candidate/employer may be
      // self-selected at sign-up — exactly what the old RegisterDto enforced
      // with @IsIn(['ROLE_CANDIDATE', 'ROLE_EMPLOYER']). Anything else, most of
      // all ROLE_ADMIN, must fall back to candidate.
      for (const claimed of ['ROLE_ADMIN', 'ROLE_AGENT', 'root', '']) {
        const token = await signTestAccessToken({
          sub: randomUUID(),
          email: uniqueEmail('escalation'),
          role: claimed,
        });

        const res = await api(app)
          .get('/api/auth/me')
          .set(auth(token))
          .expect(200);

        expect(res.body.user.role).toBe('ROLE_CANDIDATE');
      }
    });

    it('does not re-evaluate role from the token for an existing user', async () => {
      // The escalation that matters more: an established account whose owner
      // edits their own user_metadata and replays a token.
      const user = await registerUser(app, 'ROLE_CANDIDATE', 'no-reeval');
      const connection = app.get<Connection>(getConnectionToken());
      const existing = await connection
        .collection('users')
        .findOne({ email: user.email });

      const escalated = await signTestAccessToken({
        sub: existing!.supabaseUserId as string,
        email: user.email,
        role: 'ROLE_ADMIN',
      });

      const res = await api(app)
        .get('/api/auth/me')
        .set(auth(escalated))
        .expect(200);

      expect(res.body.user.role).toBe('ROLE_CANDIDATE');
    });

    it('links an already-migrated user by email instead of duplicating them', async () => {
      const connection = app.get<Connection>(getConnectionToken());
      const email = uniqueEmail('pre-migrated');

      // A user that exists locally but has not been stamped with a Supabase id.
      await connection.collection('users').insertOne({
        email,
        name: 'Pre-migrated User',
        role: 'ROLE_EMPLOYER',
        provider: 'local',
        isActive: true,
        currentPlanType: 'PRO',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const sub = randomUUID();
      const token = await signTestAccessToken({ sub, email });

      const res = await api(app).get('/api/auth/me').set(auth(token)).expect(200);

      // Crucially, role and plan survive: the account was claimed, not recreated.
      expect(res.body.user.role).toBe('ROLE_EMPLOYER');
      expect(res.body.user.currentPlanType).toBe('PRO');
      expect(res.body.user.supabaseUserId).toBe(sub);

      const count = await connection.collection('users').countDocuments({ email });
      expect(count).toBe(1);
    });

    it('rejects a valid token for a deactivated account', async () => {
      // Supabase has no instant-revocation equivalent of the old tokenVersion
      // bump, so deactivation is enforced here, against the local document.
      const user = await registerUser(app, 'ROLE_CANDIDATE', 'suspended');
      const connection = app.get<Connection>(getConnectionToken());
      await connection
        .collection('users')
        .updateOne({ email: user.email }, { $set: { isActive: false } });

      const res = await api(app)
        .get('/api/auth/me')
        .set(auth(user.token))
        .expect(401);

      expect(res.body.message).toMatch(/no longer active/i);
    });
  });

  describe('retired endpoints', () => {
    it('no longer exposes registration, login or logout', async () => {
      await api(app).post('/api/auth/register').send({}).expect(404);
      await api(app).post('/api/auth/login').send({}).expect(404);
      await api(app).post('/api/auth/logout').send({}).expect(404);
    });

    it('no longer exposes the hand-rolled OAuth routes', async () => {
      await api(app).get('/api/auth/google').expect(404);
      await api(app).get('/api/auth/linkedin').expect(404);
    });
  });
});
