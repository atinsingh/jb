import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUrl, IsBoolean, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

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
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['http', 'https'] })
  returnUrl?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Cancel at period end instead of immediately', default: true })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean = true;
}

export class BuyConciergeHoursDto {
  @ApiProperty({ description: 'Employer whose concierge profile is being booked' })
  @IsString()
  employerId: string;

  @ApiProperty({ description: 'Meeting length in minutes. Must be one the concierge offers, in 15-minute steps.' })
  @IsInt()
  @Min(15)
  @Max(480)
  minutes: number;
}

export class SendConciergeMessageDto {
  @ApiProperty({ description: 'The other person in the concierge thread' })
  @IsString()
  with: string;

  @ApiProperty({ description: 'Message text' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}

export class ChangePlanDto {
  @ApiProperty({ description: 'New plan ID' })
  @IsString()
  planId: string;

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsEnum(['monthly', 'yearly'])
  billingCycle: BillingCycle;
}
