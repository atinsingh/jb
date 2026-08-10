import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerBillingService } from './employer-billing.service';
import { UpgradeDto } from './dto/upgrade.dto';

@ApiTags('employer-billing')
@Controller('employer/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerBillingController {
  constructor(private readonly employerBillingService: EmployerBillingService) {}

  @Get('subscription')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get or create the employer subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSubscription(@Request() req) {
    const ownerId = req.user._id.toString();
    const subscription = await this.employerBillingService.getOrCreateSubscription(ownerId);
    return { subscription };
  }

  @Get('usage')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current usage meters' })
  @ApiResponse({ status: 200, description: 'Usage retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsage(@Request() req) {
    const ownerId = req.user._id.toString();
    const usage = await this.employerBillingService.getUsage(ownerId);
    return { usage };
  }

  @Post('upgrade')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Start a plan change — returns a Stripe Checkout URL to redirect to',
    description:
      'Does NOT grant the plan. The plan changes only once Stripe confirms payment ' +
      'via webhook. Sales-led plans (enterprise) are rejected with 400.',
  })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiResponse({ status: 400, description: 'Plan is not self-serve purchasable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upgrade(@Body() upgradeDto: UpgradeDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.employerBillingService.upgrade(
      ownerId,
      upgradeDto,
      req.user.email,
    );
  }

  @Post('portal')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a Stripe billing-portal session (payment method, cancel, invoices)',
  })
  @ApiResponse({ status: 201, description: 'Portal session created' })
  @ApiResponse({ status: 400, description: 'No billing information found' })
  async portal(@Request() req, @Body() body: { returnUrl?: string }) {
    const ownerId = req.user._id.toString();
    return this.employerBillingService.createBillingPortalSession(
      ownerId,
      body?.returnUrl,
    );
  }

  @Get('plans')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get the plan catalog with the current plan flagged' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPlans(@Request() req) {
    const ownerId = req.user._id.toString();
    return this.employerBillingService.getPlans(ownerId);
  }

  @Get('invoices')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get billing invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInvoices(@Request() req) {
    const ownerId = req.user._id.toString();
    const invoices = await this.employerBillingService.getInvoices(ownerId);
    return { invoices };
  }
}
