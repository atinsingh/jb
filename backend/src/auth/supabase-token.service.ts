import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

import { UserDocument } from '../schemas/user.schema';
import { SupabaseUserSyncService } from './supabase-user-sync.service';
import { AppLoggerService } from '../common/logger/logger.service';

/**
 * Verifies Supabase access tokens and resolves them to our Mongo user document.
 *
 * Two constraints drove the shape of this:
 *
 * 1. **The result must be a hydrated Mongoose `UserDocument`.** Roughly forty
 *    controllers read `req.user._id.toString()`, and `RolesGuard` /
 *    `EntitlementGuard` read `req.user.role`. Returning a token payload would
 *    turn a contained swap into a repo-wide edit.
 * 2. **No network call per request.** Verification is local against a JWKS that
 *    `jose` fetches once and caches, re-fetching only on an unseen `kid` — which
 *    is exactly what makes key rotation work. Calling `supabase.auth.getUser()`
 *    instead would put a round trip in front of every single API call.
 *
 * Deliberately not a Passport strategy: `passport-jwt` verifies the token itself
 * before `validate()` runs, so it cannot be pointed at a JWKS. `JwtAuthGuard`
 * was the only consumer of the old 'jwt' strategy, so dropping Passport here
 * costs nothing and removes a layer.
 */
@Injectable()
export class SupabaseTokenService implements OnModuleInit {
  private jwks: JWTVerifyGetKey;
  private issuer: string;

  constructor(
    private readonly userSync: SupabaseUserSyncService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('SupabaseTokenService');
  }

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error(
        'SUPABASE_URL must be set — the auth guard cannot verify tokens without it.',
      );
    }

    this.issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
    // Offline escape hatch for the E2E suite, which is built to run with no
    // network at all (see backend/test/setup-e2e.ts). When set, this is a JWKS
    // document as JSON and verification runs against it locally. Unset in every
    // real environment, where the remote JWKS below is used.
    const localJwks = this.configService.get<string>('SUPABASE_JWKS_LOCAL');
    if (localJwks) {
      this.jwks = createLocalJWKSet(JSON.parse(localJwks));
      this.logger.warn('Verifying tokens against a LOCAL JWKS — test configuration only.');
      return;
    }

    const jwksUrl =
      this.configService.get<string>('SUPABASE_JWKS_URL') ||
      `${this.issuer}/.well-known/jwks.json`;

    // jose fetches this once and caches it, re-fetching only on an unseen `kid`
    // — which is what makes key rotation work without a redeploy.
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    this.logger.log(`Verifying Supabase tokens against JWKS at ${jwksUrl}`);
  }

  /** Verify a raw bearer token and return the matching local user. */
  async authenticate(token: string): Promise<UserDocument> {
    const claims = await this.verify(token);

    const supabaseUserId = claims.sub as string | undefined;
    if (!supabaseUserId) {
      throw new UnauthorizedException('Token missing subject claim');
    }

    const user = await this.userSync.resolveFromToken(supabaseUserId, claims);

    // Supabase has no equivalent of the old `tokenVersion` instant-revocation
    // trick — its access tokens stay valid until they expire. We already hold
    // the user document, so enforce deactivation here instead. This is strictly
    // better than tokenVersion was: it covers admin suspension, not just
    // self-service logout.
    if (user.isActive === false || user.suspended) {
      this.logger.warn(`Rejected token for deactivated account: ${user.email}`);
      throw new UnauthorizedException('This account is no longer active');
    }

    return user;
  }

  private async verify(token: string): Promise<Record<string, any>> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      });
      return payload as Record<string, any>;
    } catch (error: any) {
      const code = error?.code || error?.name;
      this.logger.warn(`Supabase token rejected: ${code || error?.message}`);
      throw new UnauthorizedException(
        code === 'ERR_JWT_EXPIRED'
          ? 'Token has expired'
          : 'Invalid token',
      );
    }
  }
}
