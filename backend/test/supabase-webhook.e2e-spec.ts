import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';

import {
  api,
  auth,
  createE2EApp,
  registerUser,
  resetDatabase,
  uniqueEmail,
} from './utils/e2e-app';
import { signTestAccessToken } from './utils/supabase-test-auth';

/**
 * The Supabase -> Mongo sync webhook.
 *
 * This is the only channel that can learn about updates and deletions made in
 * Supabase; the lazy upsert in the auth guard only ever sees a user signing in.
 *
 * Delivery is at-least-once and can arrive out of order, so the interesting
 * tests here are not the happy path: they are replay, out-of-order, and the
 * blast radius of a delete.
 */
const SECRET = process.env.SUPABASE_WEBHOOK_SECRET as string;
const PATH = '/api/auth/supabase-webhook';

function userRow(overrides: Record<string, any> = {}) {
  return {
    id: randomUUID(),
    email: uniqueEmail('webhook'),
    email_confirmed_at: new Date().toISOString(),
    raw_user_meta_data: { name: 'Webhook User' },
    raw_app_meta_data: { provider: 'email' },
    deleted_at: null,
    ...overrides,
  };
}

const event = (
  type: 'INSERT' | 'UPDATE' | 'DELETE',
  record: Record<string, any> | null,
  oldRecord: Record<string, any> | null = null,
) => ({ type, table: 'users', schema: 'auth', record, old_record: oldRecord });

describe('Supabase user-sync webhook (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    app = await createE2EApp();
    connection = app.get<Connection>(getConnectionToken());
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  const post = (body: unknown, secret: string | null = SECRET) => {
    const req = api(app).post(PATH).send(body as object);
    return secret === null ? req : req.set('x-webhook-secret', secret);
  };

  describe('authentication', () => {
    it('rejects a request with no secret', async () => {
      await post(event('INSERT', userRow()), null).expect(401);
    });

    it('rejects a wrong secret', async () => {
      await post(event('INSERT', userRow()), 'not-the-secret').expect(401);
    });

    it('rejects a secret that is a prefix of the real one', async () => {
      // Guards the length-check branch in the constant-time compare.
      await post(event('INSERT', userRow()), SECRET.slice(0, -1)).expect(401);
    });

    it('does not create anything when rejected', async () => {
      const row = userRow();
      await post(event('INSERT', row), 'wrong').expect(401);

      const found = await connection
        .collection('users')
        .findOne({ supabaseUserId: row.id });
      expect(found).toBeNull();
    });
  });

  describe('INSERT', () => {
    it('creates the local user', async () => {
      const row = userRow();
      await post(event('INSERT', row)).expect(200);

      const found = await connection
        .collection('users')
        .findOne({ supabaseUserId: row.id });

      expect(found).toMatchObject({
        email: row.email,
        name: 'Webhook User',
        role: 'ROLE_CANDIDATE',
        isActive: true,
      });
    });

    it('is idempotent under replay', async () => {
      const row = userRow();
      await post(event('INSERT', row)).expect(200);
      await post(event('INSERT', row)).expect(200);
      await post(event('INSERT', row)).expect(200);

      const count = await connection
        .collection('users')
        .countDocuments({ supabaseUserId: row.id });
      expect(count).toBe(1);
    });

    it('claims a migrated user by email instead of duplicating them', async () => {
      const email = uniqueEmail('webhook-migrated');
      await connection.collection('users').insertOne({
        email,
        name: 'Paying Employer',
        role: 'ROLE_EMPLOYER',
        currentPlanType: 'ELITE',
        stripeCustomerId: 'cus_e2e_webhook',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const row = userRow({ email });
      await post(event('INSERT', row)).expect(200);

      const found = await connection.collection('users').findOne({ email });
      // The whole point: Supabase owns identity, we own everything else.
      expect(found).toMatchObject({
        supabaseUserId: row.id,
        role: 'ROLE_EMPLOYER',
        currentPlanType: 'ELITE',
        stripeCustomerId: 'cus_e2e_webhook',
      });
      expect(await connection.collection('users').countDocuments({ email })).toBe(1);
    });
  });

  describe('UPDATE', () => {
    it('applies an email change', async () => {
      const row = userRow();
      await post(event('INSERT', row)).expect(200);

      const newEmail = uniqueEmail('webhook-changed');
      await post(event('UPDATE', { ...row, email: newEmail })).expect(200);

      const found = await connection
        .collection('users')
        .findOne({ supabaseUserId: row.id });
      expect(found?.email).toBe(newEmail);
    });

    it('never overwrites role, plan or Stripe state', async () => {
      const user = await registerUser(app, 'ROLE_EMPLOYER', 'webhook-role');
      const existing = await connection
        .collection('users')
        .findOne({ email: user.email });
      await connection
        .collection('users')
        .updateOne(
          { email: user.email },
          { $set: { currentPlanType: 'PRO', stripeCustomerId: 'cus_keepme' } },
        );

      await post(
        event('UPDATE', {
          id: existing!.supabaseUserId,
          email: user.email,
          email_confirmed_at: new Date().toISOString(),
          // A hostile payload: none of this may be honoured.
          raw_user_meta_data: { role: 'ROLE_ADMIN', currentPlanType: 'FREE' },
          deleted_at: null,
        }),
      ).expect(200);

      const after = await connection
        .collection('users')
        .findOne({ email: user.email });
      expect(after).toMatchObject({
        role: 'ROLE_EMPLOYER',
        currentPlanType: 'PRO',
        stripeCustomerId: 'cus_keepme',
      });
    });

    it('self-heals when the INSERT was never delivered', async () => {
      // Out-of-order or lost delivery: an UPDATE for a user we have never seen
      // must create it rather than drop the change on the floor.
      const row = userRow();
      await post(event('UPDATE', row)).expect(200);

      const found = await connection
        .collection('users')
        .findOne({ supabaseUserId: row.id });
      expect(found?.email).toBe(row.email);
    });
  });

  describe('DELETE', () => {
    it('soft-deactivates rather than removing the document', async () => {
      const row = userRow();
      await post(event('INSERT', row)).expect(200);
      await post(event('DELETE', null, row)).expect(200);

      const found = await connection
        .collection('users')
        .findOne({ supabaseUserId: row.id });

      // Applications, resumes and matches all reference this document.
      expect(found).not.toBeNull();
      expect(found?.isActive).toBe(false);
    });

    it('locks the account out on the very next request', async () => {
      const user = await registerUser(app, 'ROLE_CANDIDATE', 'webhook-locked');
      const existing = await connection
        .collection('users')
        .findOne({ email: user.email });

      await api(app).get('/api/auth/me').set(auth(user.token)).expect(200);

      await post(
        event('DELETE', null, { id: existing!.supabaseUserId }),
      ).expect(200);

      // The access token is still cryptographically valid: Supabase cannot
      // revoke it mid-flight. The guard's isActive check is what stops it.
      await api(app).get('/api/auth/me').set(auth(user.token)).expect(401);
    });

    it('ignores a delete for a user we never created', async () => {
      const res = await post(
        event('DELETE', null, { id: randomUUID() }),
      ).expect(200);
      expect(res.body.outcome).toBe('ignored');
    });

    it('is idempotent under replay', async () => {
      const row = userRow();
      await post(event('INSERT', row)).expect(200);
      await post(event('DELETE', null, row)).expect(200);
      await post(event('DELETE', null, row)).expect(200);

      const found = await connection
        .collection('users')
        .findOne({ supabaseUserId: row.id });
      expect(found?.isActive).toBe(false);
    });

    it('restores the account if Supabase brings the user back', async () => {
      const row = userRow();
      await post(event('INSERT', row)).expect(200);
      await post(event('DELETE', null, row)).expect(200);
      await post(event('INSERT', row)).expect(200);

      const found = await connection
        .collection('users')
        .findOne({ supabaseUserId: row.id });
      expect(found?.isActive).toBe(true);
    });
  });

  describe('misrouted events', () => {
    it('ignores a table that is not auth.users', async () => {
      const res = await post({
        type: 'INSERT',
        table: 'profiles',
        schema: 'public',
        record: userRow(),
        old_record: null,
      }).expect(200);

      expect(res.body.outcome).toBe('ignored');
    });

    it('ignores a record with no id or email', async () => {
      const res = await post(event('INSERT', { foo: 'bar' })).expect(200);
      expect(res.body.outcome).toBe('ignored');
    });
  });
});
