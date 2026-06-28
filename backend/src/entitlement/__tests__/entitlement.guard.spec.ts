import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementGuard, EntitlementMetadata, ENTITLEMENT_KEY } from '../entitlement.guard';
import { EntitlementService } from '../entitlement.service';
import { FeatureKeys } from '@jobocate/contracts';

describe('EntitlementGuard', () => {
  let guard: EntitlementGuard;
  let reflector: Reflector;
  let entitlementService: EntitlementService;

  const mockEntitlementService = {
    checkEntitlement: jest.fn(),
  };

  const createMockExecutionContext = (user: any = null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          entitlementCheck: undefined,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitlementGuard,
        Reflector,
        { provide: EntitlementService, useValue: mockEntitlementService },
      ],
    }).compile();

    guard = module.get<EntitlementGuard>(EntitlementGuard);
    reflector = module.get<Reflector>(Reflector);
    entitlementService = module.get<EntitlementService>(EntitlementService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no entitlement metadata is set', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({ _id: 'user123' });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockEntitlementService.checkEntitlement).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when no user in request', async () => {
      const metadata: EntitlementMetadata = {
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(metadata);

      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required');
    });

    it('should allow access when entitlement check passes', async () => {
      const metadata: EntitlementMetadata = {
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(metadata);

      mockEntitlementService.checkEntitlement.mockResolvedValue({
        allowed: true,
        currentValue: true,
      });

      const context = createMockExecutionContext({
        _id: { toString: () => 'user123' },
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockEntitlementService.checkEntitlement).toHaveBeenCalledWith(
        'user123',
        {
          featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
          requiredValue: undefined,
          incrementUsage: undefined,
        },
      );
    });

    it('should throw ForbiddenException when entitlement check fails', async () => {
      const metadata: EntitlementMetadata = {
        featureKey: FeatureKeys.AI_RESUME_OPTIMIZATION,
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(metadata);

      mockEntitlementService.checkEntitlement.mockResolvedValue({
        allowed: false,
        message: 'Feature requires upgrade from Free plan',
      });

      const context = createMockExecutionContext({
        _id: { toString: () => 'user123' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Feature requires upgrade from Free plan',
      );
    });

    it('should pass incrementUsage option to service', async () => {
      const metadata: EntitlementMetadata = {
        featureKey: FeatureKeys.JOB_APPLICATIONS_PER_MONTH,
        incrementUsage: true,
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(metadata);

      mockEntitlementService.checkEntitlement.mockResolvedValue({
        allowed: true,
        limit: 50,
        usage: 10,
        remaining: 40,
      });

      const context = createMockExecutionContext({
        _id: { toString: () => 'user123' },
      });
      await guard.canActivate(context);

      expect(mockEntitlementService.checkEntitlement).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          incrementUsage: true,
        }),
      );
    });

    it('should pass requiredValue option for tier checks', async () => {
      const metadata: EntitlementMetadata = {
        featureKey: FeatureKeys.AGENT_TYPE,
        requiredValue: 'human',
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(metadata);

      mockEntitlementService.checkEntitlement.mockResolvedValue({
        allowed: true,
        currentValue: 'human',
      });

      const context = createMockExecutionContext({
        _id: { toString: () => 'user123' },
      });
      await guard.canActivate(context);

      expect(mockEntitlementService.checkEntitlement).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          requiredValue: 'human',
        }),
      );
    });

    it('should attach entitlement result to request', async () => {
      const metadata: EntitlementMetadata = {
        featureKey: FeatureKeys.AI_CREDITS_PER_MONTH,
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(metadata);

      const checkResult = {
        allowed: true,
        limit: 100,
        usage: 50,
        remaining: 50,
      };
      mockEntitlementService.checkEntitlement.mockResolvedValue(checkResult);

      const request = {
        user: { _id: { toString: () => 'user123' } },
        entitlementCheck: undefined as any,
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      await guard.canActivate(context);

      expect(request.entitlementCheck).toEqual(checkResult);
    });
  });
});

