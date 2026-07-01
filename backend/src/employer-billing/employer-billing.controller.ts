import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployerBillingService } from './employer-billing.service';
import { UpgradeDto } from './dto/upgrade.dto';

@ApiTags('employer-billing')
@Controller('employer/billing')
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Upgrade the employer plan / billing cycle' })
  @ApiResponse({ status: 201, description: 'Subscription upgraded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upgrade(@Body() upgradeDto: UpgradeDto, @Request() req) {
    const ownerId = req.user._id.toString();
    const subscription = await this.employerBillingService.upgrade(ownerId, upgradeDto);
    return { message: 'Subscription upgraded successfully', subscription };
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
