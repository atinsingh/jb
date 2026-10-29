import { Controller, Get, Post, Body, UseGuards, Req, RawBodyRequest, Headers, HttpCode, HttpStatus, Param, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserDocument } from '../schemas/user.schema';
import { CreateCheckoutSessionDto, CreateBillingPortalDto, CancelSubscriptionDto, BuyConciergeHoursDto, SendConciergeMessageDto } from './dto';
import { conciergePlatformFeeRate } from './concierge-fee';
import { ConciergeMessagesService } from './concierge-messages.service';
import { ConciergeScheduleService } from './concierge-schedule.service';
import { ConciergePayoutService } from './concierge-payout.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly messages: ConciergeMessagesService,
    private readonly schedule: ConciergeScheduleService,
    private readonly payouts: ConciergePayoutService,
  ) {}

  @Get('concierge/coaches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Published concierge coaches who can be paid' })
  async conciergeCoaches() {
    return { coaches: await this.billingService.listPayableConcierges(), feeRate: conciergePlatformFeeRate() };
  }

  @Post('concierge/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buy one concierge duration. The charge stays on Jobocate until the monthly payout.' })
  async conciergeCheckout(@Request() req: any, @Body() dto: BuyConciergeHoursDto) {
    return this.billingService.createConciergeCheckout(req.user as UserDocument, dto.employerId, dto.minutes);
  }

  @Post('concierge/bookings/:id/scheduled')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Candidate confirms they booked this paid session on the calendar link' })
  async markConciergeBookingScheduled(@Request() req: any, @Param('id') id: string) {
    return this.billingService.markConciergeBookingScheduled(req.user._id.toString(), id);
  }

  @Post('concierge/bookings/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a concierge session that has not started and return the payment' })
  async cancelConciergeBooking(@Request() req: any, @Param('id') id: string) {
    return this.payouts.cancelBooking(req.user, id);
  }

  @Post('concierge/bookings/:id/missed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Candidate reports, within one day of the end, that the session did not happen' })
  async reportConciergeMissed(@Request() req: any, @Param('id') id: string) {
    return this.payouts.reportMissed(req.user, id);
  }

  @Post('concierge/calendly/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async calendlyWebhook(@Req() req: RawBodyRequest<ExpressRequest>, @Headers('calendly-webhook-signature') signature: string) {
    return this.payouts.handleCalendlyWebhook(req.rawBody?.toString('utf8') || '', signature);
  }

  @Get('concierge/bookings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Concierge hours this candidate has bought' })
  async conciergeBookings(@Request() req: any) {
    return { bookings: await this.billingService.listConciergeBookings(req.user._id.toString(), 'candidate'), sessions: await this.schedule.list(req.user._id.toString(), 'candidate') };
  }

  @Get('concierge/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Messages with a concierge the candidate has paid' })
  async listConciergeMessages(@Request() req: any, @Query('with') otherId: string) {
    return { messages: await this.messages.list(req.user, otherId) };
  }

  @Post('concierge/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to a concierge the candidate has paid' })
  async sendConciergeMessage(@Request() req: any, @Body() dto: SendConciergeMessageDto) {
    return this.messages.send(req.user, dto.with, dto.body);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of plans' })
  async getPlans() {
    const plans = await this.billingService.getPlans();
    return { plans };
  }

  @Get('employer-plans')
  @ApiOperation({ summary: 'Get the public employer plan catalog from Stripe' })
  async getEmployerPlans() {
    const result = await this.billingService.getEmployerPlansCatalog();
    return { plans: result };
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a specific plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  async getPlan(@Param('id') id: string) {
    const plan = await this.billingService.getPlanById(id);
    return { plan };
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'User subscription details' })
  async getSubscription(@Request() req: any) {
    const user = req.user as UserDocument;
    return this.billingService.getReconciledSubscription(user);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session URL' })
  async createCheckoutSession(@Request() req: any, @Body() dto: CreateCheckoutSessionDto) {
    const user = req.user as UserDocument;
    return this.billingService.createCheckoutSession(user, dto);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  @ApiResponse({ status: 200, description: 'Portal session URL' })
  async createPortalSession(@Request() req: any, @Body() dto: CreateBillingPortalDto) {
    const user = req.user as UserDocument;
    return this.billingService.createBillingPortalSession(user, dto.returnUrl);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled' })
  async cancelSubscription(@Request() req: any, @Body() dto: CancelSubscriptionDto) {
    const user = req.user as UserDocument;
    return this.billingService.cancelSubscription(user, dto);
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a subscription set to cancel' })
  @ApiResponse({ status: 200, description: 'Subscription reactivated' })
  async reactivateSubscription(@Request() req: any) {
    const user = req.user as UserDocument;
    return this.billingService.reactivateSubscription(user);
  }

  @Get('usage/:featureKey')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get usage for a specific feature' })
  @ApiResponse({ status: 200, description: 'Feature usage' })
  async getUsage(@Request() req: any, @Param('featureKey') featureKey: string) {
    const user = req.user as UserDocument;
    const usage = await this.billingService.getUsage(user._id.toString(), featureKey);
    return { featureKey, usage };
  }

  // ==================== WEBHOOK ====================

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(@Req() req: RawBodyRequest<ExpressRequest>, @Headers('stripe-signature') signature: string) {
    const payload = req.rawBody;
    if (!payload) {
      return { received: false, error: 'No payload' };
    }
    return this.billingService.handleStripeWebhook(payload, signature);
  }
}
