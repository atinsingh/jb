import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppLoggerService } from '../common/logger/logger.service';

/**
 * Server-side Supabase Auth operations that act on behalf of an operator rather
 * than a signed-in user.
 *
 * Kept separate from `SupabaseTokenService` (which only ever verifies) and
 * `SupabaseUserSyncService` (which only ever reconciles) because this one holds
 * the **service-role key**, and that key bypasses all authorisation. Anything
 * using it should be obvious at a glance, and every method here must be reachable
 * only from a ROLE_ADMIN-guarded route.
 *
 * This is also where JOB-46's user-import will land.
 */
@Injectable()
export class SupabaseAdminService implements OnModuleInit {
  private baseUrl: string;
  private serviceRoleKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('SupabaseAdminService');
  }

  onModuleInit() {
    this.baseUrl = (this.configService.get<string>('SUPABASE_URL') || '').replace(/\/$/, '');
    this.serviceRoleKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';
  }

  /**
   * Email a password-recovery link to a user, as an admin would from the console.
   *
   * Replaces `UsersService.requestPasswordReset`, which minted its own
   * `crypto.randomBytes` token into `resetPasswordToken` and sent it with our
   * mailer. Supabase now owns both the token and the email, so the link the user
   * receives is the same one the self-service flow produces and lands on the
   * same `/app/reset-password` handler.
   */
  async sendPasswordRecovery(email: string): Promise<{ message: string }> {
    if (!this.baseUrl || !this.serviceRoleKey) {
      throw new BadRequestException(
        'Supabase is not configured; cannot send a recovery email.',
      );
    }

    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    const redirectTo = `${frontendUrl}/app/reset-password`;

    const response = await fetch(
      `${this.baseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
        body: JSON.stringify({ email }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(
        `Supabase recovery request failed (${response.status}): ${detail}`,
      );
      throw new BadRequestException('Could not send the recovery email.');
    }

    this.logger.log(`Password recovery email requested for ${email}`);

    // Deliberately non-committal, matching the old endpoint: an admin console
    // should not become an oracle for which addresses have accounts.
    return { message: 'If the email exists, a password reset link has been sent.' };
  }
}
