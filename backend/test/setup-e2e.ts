/**
 * E2E environment. Runs as a jest `setupFiles` entry, i.e. BEFORE any spec (and
 * therefore before `AppModule`) is imported — which matters because
 * `app.module.ts` reads `process.env.MONGODB_URI` and the queue flags at module
 * LOAD time, not inside a factory.
 *
 * `.env` still gets loaded by ConfigModule, but dotenv never overrides a key
 * that is already present, so everything set here wins. That is also why keys we
 * want *disabled* are set to '' rather than deleted: an absent key would simply
 * be repopulated from `.env`.
 */

// Point at a dedicated database. The guard below is deliberate: dropping the
// dev database (~1700 scraped jobs) would be an expensive accident.
process.env.MONGODB_URI =
  process.env.E2E_MONGODB_URI || 'mongodb://localhost:27017/jobocate_e2e';

if (!/e2e/i.test(process.env.MONGODB_URI)) {
  throw new Error(
    `Refusing to run E2E against "${process.env.MONGODB_URI}" — the suite drops its database, ` +
      'so the URI must name an e2e database.',
  );
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'e2e-only-secret-not-used-outside-tests';

// Nothing may reach the network or spawn a browser during E2E.
process.env.QUEUE_ENABLED = 'false';
process.env.AUTO_APPLICATION_ENABLED = 'false';
process.env.JOB_SCRAPING_ENABLED = 'false';
process.env.INGESTION_CRON_DISABLE = 'true';

// No Stripe credentials: the billing specs assert the *guards* (which tier a
// request can grant), and those must hold without reaching Stripe. A real key
// here would mean the suite created live test-mode objects on every run.
process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = '';

// Force the LLM router onto the deterministic Mock provider: E2E asserts on
// application behaviour, not on model output, and must pass offline.
process.env.LLM_DEFAULT_PROVIDER = 'mock';
process.env.OPENAI_API_KEY = '';
process.env.ANTHROPIC_API_KEY = '';
process.env.OPENROUTER_API_KEY = '';
process.env.EMERGENT_LLM_KEY = '';
process.env.LLM_ENFORCE_QUOTA = 'false';

// The throttler is in-memory and counts every request in the process; a suite
// that fires dozens of calls back-to-back would 429 on production limits.
process.env.THROTTLE_LIMIT_SHORT = '100000';
process.env.THROTTLE_LIMIT_MEDIUM = '100000';
process.env.THROTTLE_LIMIT_LONG = '100000';
