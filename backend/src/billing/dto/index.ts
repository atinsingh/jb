import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUrl, IsBoolean } from 'class-validator';

type BillingCycle = 'monthly' | 'yearly';

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: 'Plan ID to subscribe to' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: ['monthly', 'yearly'], default: 'monthly' })
  @IsEnum(['monthly', 'yearly'])
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ description: 'Success redirect URL' })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL' })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}

export class CreateBillingPortalDto {
  @ApiPropertyOptional({ description: 'Return URL after portal session' })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Cancel at period end instead of immediately', default: true })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean = true;
}

export class ChangePlanDto {
  @ApiProperty({ description: 'New plan ID' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsEnum(['monthly', 'yearly'])
  billingCycle: BillingCycle;
}
