import { HealthController } from './health.controller';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

const DEV_JWT_FALLBACK = 'dev-insecure-secret-change-me';

// A full set of env values that satisfies every alpha MUST-HAVE.
const FULL_ENV: Record<string, string> = {
  JWT_SECRET: 'a-real-long-production-secret',
  MONGODB_URI: 'mongodb://db/jobocate',
  FRONTEND_URL: 'https://app.jobocate.com',
  ANTHROPIC_API_KEY: 'sk-ant-xxx',
  OPENAI_API_KEY: 'sk-openai-xxx',
  SMTP_USER: 'mailer@jobocate.com',
  SMTP_PASSWORD: 'smtp-pass',
  STRIPE_SECRET_KEY: 'sk_live_xxx',
  STRIPE_WEBHOOK_SECRET: 'whsec_xxx',
  GOOGLE_CLIENT_ID: 'g-id',
  GOOGLE_CLIENT_SECRET: 'g-secret',
  LINKEDIN_CLIENT_ID: 'li-id',
  LINKEDIN_CLIENT_SECRET: 'li-secret',
  GREENHOUSE_BOARDS: 'acme',
  LEVER_BOARDS: 'beta',
  AUTO_APPLICATION_ENABLED: 'true',
  QUEUE_ENABLED: 'true',
  STORAGE_DRIVER: 's3',
  LLM_ENFORCE_QUOTA: 'true',
};

// All the secret VALUES that must never appear in the response payload.
const SECRET_VALUES = [
  'a-real-long-production-secret',
  'mongodb://db/jobocate',
  'sk-ant-xxx',
  'sk-openai-xxx',
  'smtp-pass',
  'sk_live_xxx',
  'whsec_xxx',
  'g-secret',
  'li-secret',
];

function makeConfig(env: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;
}

function makeConnection(readyState: 0 | 1): Connection {
  return { readyState } as unknown as Connection;
}

function makeController(
  env: Record<string, string>,
  readyState: 0 | 1 = 1,
): HealthController {
  return new HealthController(makeConnection(readyState), makeConfig(env));
}

describe('HealthController — GET /health/readiness', () => {
  it('reports ready:true with empty missing[] when all must-haves are present', async () => {
    const res = await makeController(FULL_ENV, 1).readiness();

    expect(res.ready).toBe(true);
    expect(res.missing).toEqual([]);
    expect(res.checks.mongo).toEqual({ ok: true, state: 'connected' });
    expect(res.checks.env).toEqual({
      jwtSecret: true,
      mongoUri: true,
      frontendUrl: true,
      aiKey: true,
      smtp: true,
      stripe: true,
      googleOAuth: true,
      linkedinOAuth: true,
      scraperBoards: true,
    });
    expect(typeof res.timestamp).toBe('string');
    expect(typeof res.uptime).toBe('number');
  });

  it('marks mongo down when connection.readyState !== 1 and lists it in missing', async () => {
    const res = await makeController(FULL_ENV, 0).readiness();

    expect(res.checks.mongo).toEqual({ ok: false, state: 'disconnected' });
    expect(res.ready).toBe(false);
    expect(res.missing).toContain('mongo');
  });

  it('missing SMTP => ready:false and missing:["smtp"]', async () => {
    const env = { ...FULL_ENV };
    delete env.SMTP_USER;
    delete env.SMTP_PASSWORD;

    const res = await makeController(env, 1).readiness();

    expect(res.checks.env.smtp).toBe(false);
    expect(res.ready).toBe(false);
    expect(res.missing).toEqual(['smtp']);
  });

  it('SMTP requires BOTH user and password (only user set => smtp false)', async () => {
    const env = { ...FULL_ENV };
    delete env.SMTP_PASSWORD; // user present, password missing

    const res = await makeController(env, 1).readiness();

    expect(res.checks.env.smtp).toBe(false);
    expect(res.missing).toEqual(['smtp']);
  });

  it('JWT_SECRET === dev fallback => jwtSecret:false (treated as unconfigured)', async () => {
    const env = { ...FULL_ENV, JWT_SECRET: DEV_JWT_FALLBACK };

    const res = await makeController(env, 1).readiness();

    expect(res.checks.env.jwtSecret).toBe(false);
    expect(res.ready).toBe(false);
    expect(res.missing).toEqual(['jwtSecret']);
  });

  it('stripe partial (secret set, webhook missing) => stripe:false', async () => {
    const env = { ...FULL_ENV };
    delete env.STRIPE_WEBHOOK_SECRET;

    const res = await makeController(env, 1).readiness();

    expect(res.checks.env.stripe).toBe(false);
    expect(res.ready).toBe(false);
    expect(res.missing).toEqual(['stripe']);
  });

  it('aiKey is true if EITHER provider key is set', async () => {
    const onlyAnthropic = { ...FULL_ENV };
    delete onlyAnthropic.OPENAI_API_KEY;
    expect((await makeController(onlyAnthropic, 1).readiness()).checks.env.aiKey).toBe(true);

    const onlyOpenai = { ...FULL_ENV };
    delete onlyOpenai.ANTHROPIC_API_KEY;
    expect((await makeController(onlyOpenai, 1).readiness()).checks.env.aiKey).toBe(true);

    const neither = { ...FULL_ENV };
    delete neither.ANTHROPIC_API_KEY;
    delete neither.OPENAI_API_KEY;
    const res = await makeController(neither, 1).readiness();
    expect(res.checks.env.aiKey).toBe(false);
    expect(res.missing).toEqual(['aiKey']);
  });

  it('nice-to-haves (google/linkedin OAuth, scraperBoards) do NOT gate ready', async () => {
    const env = { ...FULL_ENV };
    delete env.GOOGLE_CLIENT_ID;
    delete env.GOOGLE_CLIENT_SECRET;
    delete env.LINKEDIN_CLIENT_ID;
    delete env.LINKEDIN_CLIENT_SECRET;
    delete env.GREENHOUSE_BOARDS;
    delete env.LEVER_BOARDS;

    const res = await makeController(env, 1).readiness();

    expect(res.checks.env.googleOAuth).toBe(false);
    expect(res.checks.env.linkedinOAuth).toBe(false);
    expect(res.checks.env.scraperBoards).toBe(false);
    // still ready because all MUST-HAVES are present
    expect(res.ready).toBe(true);
    expect(res.missing).toEqual([]);
  });

  it('reports multiple missing must-haves in a stable order', async () => {
    const env = { ...FULL_ENV };
    delete env.SMTP_USER;
    delete env.SMTP_PASSWORD;
    delete env.STRIPE_SECRET_KEY;
    delete env.STRIPE_WEBHOOK_SECRET;

    const res = await makeController(env, 0).readiness();

    expect(res.ready).toBe(false);
    // mongo (down) + smtp + stripe, in must-have declaration order
    expect(res.missing).toEqual(['mongo', 'smtp', 'stripe']);
  });

  it('flags reflect env (true/string values)', async () => {
    const res = await makeController(FULL_ENV, 1).readiness();
    expect(res.checks.flags).toEqual({
      autoApply: true,
      queue: true,
      storageDriver: 's3',
      quotaEnforced: true,
    });
  });

  it('flags default correctly when unset (storageDriver=>"local", booleans=>false)', async () => {
    const env = { ...FULL_ENV };
    delete env.AUTO_APPLICATION_ENABLED;
    delete env.QUEUE_ENABLED;
    delete env.STORAGE_DRIVER;
    delete env.LLM_ENFORCE_QUOTA;

    const res = await makeController(env, 1).readiness();
    expect(res.checks.flags).toEqual({
      autoApply: false,
      queue: false,
      storageDriver: 'local',
      quotaEnforced: false,
    });
  });

  it('SECURITY: response never contains any secret VALUE — only booleans/short status strings', async () => {
    const res = await makeController(FULL_ENV, 1).readiness();
    const serialized = JSON.stringify(res);

    for (const secret of SECRET_VALUES) {
      expect(serialized).not.toContain(secret);
    }

    // Every value under checks.env must be a boolean (present/absent only).
    for (const v of Object.values(res.checks.env)) {
      expect(typeof v).toBe('boolean');
    }

    // The only non-boolean status string exposed is the storage driver name,
    // which is not sensitive.
    expect(typeof res.checks.flags.storageDriver).toBe('string');
    expect(res.checks.flags.storageDriver).toBe('s3');

    // `missing` contains only short check names, never values.
    for (const name of res.missing) {
      expect(SECRET_VALUES).not.toContain(name);
    }
  });
});
