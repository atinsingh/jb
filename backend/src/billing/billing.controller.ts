import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  RawBodyRequest,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserDocument } from '../schemas/user.schema';
import {
  CreateCheckoutSessionDto,
  CreateBillingPortalDto,
  CancelSubscriptionDto,
} from './dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of plans' })
  async getPlans() {
    const plans = await this.billingService.getPlans();
    return { plans };
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
    const subscription = await this.billingService.getUserSubscription(
      user._id.toString(),
    );
    return { subscription };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session URL' })
  async createCheckoutSession(
    @Request() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const user = req.user as UserDocument;
    return this.billingService.createCheckoutSession(user, dto);
  }

  @Post('portal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe billing portal session' })
  @ApiResponse({ status: 200, description: 'Portal session URL' })
  async createPortalSession(
    @Request() req: any,
    @Body() dto: CreateBillingPortalDto,
  ) {
    const user = req.user as UserDocument;
    return this.billingService.createBillingPortalSession(user, dto.returnUrl);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled' })
  async cancelSubscription(
    @Request() req: any,
    @Body() dto: CancelSubscriptionDto,
  ) {
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
  async getUsage(
    @Request() req: any,
    @Param('featureKey') featureKey: string,
  ) {
    const user = req.user as UserDocument;
    const usage = await this.billingService.getUsage(
      user._id.toString(),
      featureKey,
    );
    return { featureKey, usage };
  }

  // ==================== WEBHOOK ====================

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = req.rawBody;
    if (!payload) {
      return { received: false, error: 'No payload' };
    }
    return this.billingService.handleStripeWebhook(payload, signature);
  }
}
