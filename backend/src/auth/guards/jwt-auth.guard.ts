import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import { AppLoggerService } from '../../common/logger/logger.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { SupabaseTokenService } from '../supabase-token.service';

/**
 * The guard every protected controller in the backend already uses.
 *
 * The name, the `@Public()` behaviour, the 401 messages and the shape of
 * `request.user` (a hydrated Mongoose `UserDocument`) are all unchanged from the
 * self-signed-JWT version — that is the whole point. Only what happens between
 * "read the header" and "set request.user" moved to Supabase.
 *
 * No longer extends `AuthGuard('jwt')`: `passport-jwt` verifies the token itself
 * before any hook of ours runs, so it cannot be pointed at Supabase's JWKS.
 * This guard was the strategy's only consumer.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /*
   * SupabaseTokenService is resolved through ModuleRef rather than injected.
   *
   * This guard is applied by ~44 controllers across most feature modules, and
   * dozens of unit specs build a TestingModule containing just their controller
   * and a few mocks. A required constructor dependency makes every one of those
   * fail at .compile() with "Nest can't resolve dependencies of the
   * JwtAuthGuard", even when the spec never exercises the guard.
   *
   * Before the Supabase swap every dependency here was @Optional(), so the guard
   * instantiated anywhere. Resolving lazily restores that property without
   * making the verifier itself optional, which would risk a guard that quietly
   * does nothing. strict:false looks it up in the global AuthModule.
   */
  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly logger?: AppLoggerService,
    @Optional() private readonly reflector?: Reflector,
  ) {
    this.logger?.setContext('JwtAuthGuard');
  }

  private get supabaseTokens(): SupabaseTokenService {
    return this.moduleRef.get(SupabaseTokenService, { strict: false });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.bearerFrom(request.headers?.authorization);

    if (!token) {
      this.logger?.warn('Access token missing or malformed in Authorization header');
      throw new UnauthorizedException('Authentication required');
    }

    // Any UnauthorizedException raised in here already carries the right
    // message ('Token has expired' / 'Invalid token' / 'This account is no
    // longer active'), so it propagates untouched.
    request.user = await this.supabaseTokens.authenticate(token);

    this.logger?.debug(
      `Authenticated ${request.user.email || request.user._id}`,
    );
    return true;
  }

  private bearerFrom(header?: string): string | null {
    if (!header || !header.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token.length ? token : null;
  }
}
