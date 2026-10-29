import { Controller, Get, Post, Body, UseGuards, Request, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerBillingService } from './employer-billing.service';
import { UpgradeDto } from './dto/upgrade.dto';
import { CreateBillingPortalDto, SendConciergeMessageDto } from '../billing/dto';
import { conciergePlatformFeeRate } from '../billing/concierge-fee';
import { ConciergeMessagesService } from '../billing/concierge-messages.service';
import { ConciergeScheduleService } from '../billing/concierge-schedule.service';
import { ConciergePayoutService } from '../billing/concierge-payout.service';
import { summarizeConciergePayouts } from '../billing/concierge-payout';

@ApiTags('employer-billing')
@Controller('employer/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerBillingController {
  constructor(
    private readonly employerBillingService: EmployerBillingService,
    private readonly messages: ConciergeMessagesService,
    private readonly schedule: ConciergeScheduleService,
    private readonly payouts: ConciergePayoutService,
  ) {}

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
      'via webhook. The Free plan cannot be purchased through checkout.',
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
  async portal(@Request() req, @Body() body: CreateBillingPortalDto) {
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

  @Get('concierge/bookings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hours candidates have bought from this concierge profile' })
  async conciergeBookings(@Request() req) {
    const bookings = await this.employerBillingService.conciergeBookings(req.user._id.toString());
    return { bookings, ...summarizeConciergePayouts(bookings, new Date()), sessions: await this.schedule.list(req.user._id.toString(), 'employer'), feeRate: conciergePlatformFeeRate() };
  }

  @Post('concierge/bookings/:id/cancel')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel a concierge session that has not started' })
  async cancelConciergeBooking(@Request() req, @Param('id') id: string) {
    return this.payouts.cancelBooking(req.user, id);
  }

  @Get('concierge/messages')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Messages with a candidate who has paid this concierge' })
  async conciergeMessages(@Request() req, @Query('with') otherId: string) {
    return { messages: await this.messages.list(req.user, otherId) };
  }

  @Post('concierge/messages')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reply to a candidate who has paid this concierge' })
  async sendConciergeMessage(@Request() req, @Body() dto: SendConciergeMessageDto) {
    return this.messages.send(req.user, dto.with, dto.body);
  }

  @Get('connect')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Whether this employer can receive concierge payouts' })
  async connectStatus(@Request() req) {
    return this.employerBillingService.getConnectStatus(req.user._id.toString());
  }

  @Post('connect/onboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Stripe Express onboarding link for a Canadian concierge payout account' })
  async connectOnboard(@Request() req) {
    return this.employerBillingService.createConnectOnboarding(req.user._id.toString());
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
