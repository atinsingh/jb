import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

// The dev-only fallback used across the app when JWT_SECRET is unset. A live
// PAID environment MUST NOT run with this value, so readiness treats it as
// "not configured".
const DEV_JWT_FALLBACK = 'dev-insecure-secret-change-me';

@ApiTags('health')
@Controller()
export class HealthController {
  // Inject the connection that MongooseModule actually manages. The previous
  // version read the default global `mongoose.connection`, which @nestjs/mongoose
  // does not use — so it always reported "disconnected" even when the app was
  // fully connected and serving DB-backed requests.
  //
  // ConfigService is global (ConfigModule.forRoot({ isGlobal: true }) in
  // AppModule), so it injects here without any extra module wiring. It is used
  // to read env WITHOUT ever exposing the secret values themselves.
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Server is running and healthy' })
  async health() {
    return {
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      // 1 = connected, per mongoose ConnectionStates
      mongodb: this.connection.readyState === 1 ? 'connected' : 'disconnected',
      // LLM_DEFAULT_PROVIDER is what the routing layer actually reads; AI_PROVIDER
      // is the older env var kept for compatibility. Reporting the legacy one
      // first made health claim "openai" on a box routing every call elsewhere.
      aiProvider:
        process.env.LLM_DEFAULT_PROVIDER || process.env.AI_PROVIDER || 'openai',
    };
  }

  /**
   * Deploy-readiness report for operators / load balancers confirming a live
   * environment is correctly configured for the PAID alpha.
   *
   * Always returns HTTP 200 — this is a REPORT, not a gate. The caller decides
   * what to do based on the `ready` boolean; we never 503 here.
   *
   * SECURITY: this endpoint reports ONLY booleans and non-sensitive status
   * strings (e.g. the storage driver name). It never returns secret values,
   * connection strings, or key material.
   */
  @Get('health/readiness')
  @ApiOperation({
    summary: 'Deploy-readiness report (paid-alpha env/config check)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Readiness report. Always 200; inspect `ready` and `missing`. No secret values are returned.',
  })
  async readiness() {
    return this.buildReadiness();
  }

  /** True when an env var is set to a non-empty string. */
  private isSet(key: string): boolean {
    const value = this.config.get<string>(key);
    return typeof value === 'string' && value.trim().length > 0;
  }

  /** True when an env var equals the given literal (used for boolean-ish flags). */
  private equals(key: string, expected: string): boolean {
    return this.config.get<string>(key) === expected;
  }

  private buildReadiness() {
    const mongoOk = this.connection.readyState === 1;

    // JWT_SECRET must be set AND must not be the insecure dev fallback.
    const jwtRaw = this.config.get<string>('JWT_SECRET');
    const jwtSecret =
      typeof jwtRaw === 'string' &&
      jwtRaw.trim().length > 0 &&
      jwtRaw !== DEV_JWT_FALLBACK;

    const env = {
      jwtSecret,
      mongoUri: this.isSet('MONGODB_URI'),
      frontendUrl: this.isSet('FRONTEND_URL'),
      // Any one AI provider key is acceptable.
      aiKey:
        this.isSet('LITELLM_API_KEY') ||
        this.isSet('LITELLM_MASTER_KEY') ||
        this.isSet('ANTHROPIC_API_KEY') ||
        this.isSet('OPENAI_API_KEY') ||
        this.isSet('OPENROUTER_API_KEY'),
      smtp: this.isSet('SMTP_USER') && this.isSet('SMTP_PASSWORD'),
      stripe:
        this.isSet('STRIPE_SECRET_KEY') && this.isSet('STRIPE_WEBHOOK_SECRET'),
      googleOAuth:
        this.isSet('GOOGLE_CLIENT_ID') && this.isSet('GOOGLE_CLIENT_SECRET'),
      linkedinOAuth:
        this.isSet('LINKEDIN_CLIENT_ID') &&
        this.isSet('LINKEDIN_CLIENT_SECRET'),
      // Without any board configured the scraper produces an empty job pool.
      scraperBoards:
        this.isSet('GREENHOUSE_BOARDS') || this.isSet('LEVER_BOARDS'),
    };

    const flags = {
      autoApply: this.equals('AUTO_APPLICATION_ENABLED', 'true'),
      queue: this.equals('QUEUE_ENABLED', 'true'),
      storageDriver: this.config.get<string>('STORAGE_DRIVER') || 'local',
      quotaEnforced: this.equals('LLM_ENFORCE_QUOTA', 'true'),
    };

    // Alpha (paid) MUST-HAVES. NOTE: googleOAuth, linkedinOAuth and
    // scraperBoards are reported for ops visibility but are NICE-TO-HAVE — they
    // deliberately do NOT gate `ready`.
    const mustHaves: Record<string, boolean> = {
      mongo: mongoOk,
      jwtSecret: env.jwtSecret,
      mongoUri: env.mongoUri,
      frontendUrl: env.frontendUrl,
      aiKey: env.aiKey,
      smtp: env.smtp,
      stripe: env.stripe,
    };

    const missing = Object.entries(mustHaves)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    return {
      ready: missing.length === 0,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        mongo: {
          ok: mongoOk,
          state: (mongoOk ? 'connected' : 'disconnected') as
            | 'connected'
            | 'disconnected',
        },
        env,
        flags,
      },
      missing,
    };
  }
}
