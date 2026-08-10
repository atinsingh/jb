import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';

/**
 * Enforces role requirements declared with @Roles(...).
 *
 * Modelled on EntitlementGuard (src/entitlement/entitlement.guard.ts). The
 * @Roles() decorator already existed but nothing consumed it — this closes that
 * gap so ROLE_ADMIN endpoints can actually be protected. Must be used AFTER
 * JwtAuthGuard so `request.user` is populated, e.g.:
 *
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('ROLE_ADMIN')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() on this route -> nothing to enforce.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this resource');
    }

    return true;
  }
}
