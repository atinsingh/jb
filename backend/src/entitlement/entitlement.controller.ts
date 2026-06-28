import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EntitlementService } from './entitlement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserDocument } from '../schemas/user.schema';

type PlanType = 'FREE' | 'PRO' | 'ELITE' | 'INTERVIEW';

@ApiTags('entitlements')
@Controller('entitlements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EntitlementController {
  constructor(private readonly entitlementService: EntitlementService) {}

  @Get()
  @ApiOperation({ summary: 'Get all entitlements for current user' })
  @ApiResponse({ status: 200, description: 'User entitlements' })
  async getUserEntitlements(@Request() req: any) {
    const user = req.user as UserDocument;
    const entitlements = await this.entitlementService.getEntitlementsForUser(
      user._id.toString(),
    );
    return {
      planType: user.currentPlanType || 'FREE',
      entitlements,
    };
  }

  @Get('check/:featureKey')
  @ApiOperation({ summary: 'Check if user has access to a feature' })
  @ApiResponse({ status: 200, description: 'Entitlement check result' })
  async checkEntitlement(
    @Request() req: any,
    @Param('featureKey') featureKey: string,
  ) {
    const user = req.user as UserDocument;
    const result = await this.entitlementService.checkEntitlement(
      user._id.toString(),
      { featureKey },
    );
    return result;
  }

  @Get('plans/:planType')
  @ApiOperation({ summary: 'Get entitlements for a specific plan' })
  @ApiResponse({ status: 200, description: 'Plan entitlements' })
  async getPlanEntitlements(@Param('planType') planType: PlanType) {
    const entitlements = await this.entitlementService.getEntitlementsForPlan(planType);
    return {
      planType,
      entitlements,
    };
  }
}
