import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';

import {
  SupabaseUserSyncService,
  SupabaseWebhookEvent,
} from './supabase-user-sync.service';

/**
 * Receives `auth.users` changes from a Supabase Database Webhook.
 *
 * This is the half of the sync the token path cannot do: a user's access token
 * only ever tells us about that user signing in, so updates and deletions made
 * in Supabase would otherwise never reach the Mongo document.
 *
 * **On the secret.** Supabase Database Webhooks are Postgres triggers calling
 * `pg_net`. They have no built-in signature scheme like Stripe's, so there is
 * nothing to HMAC-verify here. What you get is custom HTTP headers you set when
 * creating the webhook, which makes the check a shared-secret comparison. It is
 * weaker than a signature (it does not bind the secret to the body), so the
 * endpoint is also written to be safe under replay: every operation the sync
 * service performs is idempotent.
 *
 * Deliberately unguarded by `JwtAuthGuard`: the caller is Postgres, not a user,
 * and it holds no access token. The header check below is the whole gate.
 */
@Controller('auth')
export class SupabaseWebhookController {
  private readonly logger = new Logger(SupabaseWebhookController.name);

  constructor(
    private readonly userSync: SupabaseUserSyncService,
    private readonly config: ConfigService,
  ) {}

  @Post('supabase-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  // Machine-to-machine, and a burst of user changes (a migration run, say) must
  // not get rate-limited into silent data loss.
  @SkipThrottle()
  async handle(
    @Headers('x-webhook-secret') secret: string | undefined,
    @Body() event: SupabaseWebhookEvent,
  ) {
    this.assertAuthentic(secret);

    const outcome = await this.userSync.handleWebhook(event);
    this.logger.log(`auth.users ${event?.type} -> ${outcome}`);

    // Always 200 on an authenticated call. Supabase retries on non-2xx, and
    // retrying a payload we have already decided to ignore achieves nothing.
    return { received: true, outcome };
  }

  private assertAuthentic(provided: string | undefined): void {
    const expected = this.config.get<string>('SUPABASE_WEBHOOK_SECRET');

    if (!expected) {
      // Refuse rather than run unauthenticated. An open endpoint that can
      // deactivate accounts is worse than one that is broken.
      this.logger.error('SUPABASE_WEBHOOK_SECRET is not configured; rejecting');
      throw new UnauthorizedException('Webhook is not configured');
    }

    if (!provided || !this.constantTimeEquals(provided, expected)) {
      this.logger.warn('Rejected Supabase webhook with a bad or missing secret');
      throw new UnauthorizedException('Invalid webhook secret');
    }
  }

  /**
   * Length is compared first because `timingSafeEqual` throws on a mismatch.
   * That leaks the secret's length, which is not worth defending: an attacker
   * who can guess the length still has to guess 32 random bytes.
   */
  private constantTimeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  }
}
