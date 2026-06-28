import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementService, EntitlementCheckOptions } from './entitlement.service';

export const ENTITLEMENT_KEY = 'entitlement';

export interface EntitlementMetadata {
  featureKey: string;
  requiredValue?: boolean | number | string;
  incrementUsage?: boolean;
}

/**
 * Decorator to require a specific entitlement on an endpoint
 * 
 * @example
 * // Boolean check - requires AI resume optimization feature
 * @RequireEntitlement({ featureKey: 'ai_resume_optimization' })
 * 
 * @example
 * // Limit check - checks and increments usage
 * @RequireEntitlement({ 
 *   featureKey: 'job_applications_per_month',
 *   incrementUsage: true 
 * })
 * 
 * @example
 * // Tier check - requires specific tier level
 * @RequireEntitlement({ 
 *   featureKey: 'agent_type',
 *   requiredValue: 'human' 
 * })
 */
export const RequireEntitlement = (metadata: EntitlementMetadata) =>
  SetMetadata(ENTITLEMENT_KEY, metadata);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private entitlementService: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const entitlementMetadata = this.reflector.getAllAndOverride<EntitlementMetadata>(
      ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No entitlement requirement on this endpoint
    if (!entitlementMetadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const options: EntitlementCheckOptions = {
      featureKey: entitlementMetadata.featureKey,
      requiredValue: entitlementMetadata.requiredValue,
      incrementUsage: entitlementMetadata.incrementUsage,
    };

    const result = await this.entitlementService.checkEntitlement(
      user._id.toString(),
      options,
    );

    if (!result.allowed) {
      throw new ForbiddenException(
        result.message || `Feature "${options.featureKey}" not available on your plan`,
      );
    }

    // Attach entitlement info to request for downstream use
    request.entitlementCheck = result;

    return true;
  }
}
