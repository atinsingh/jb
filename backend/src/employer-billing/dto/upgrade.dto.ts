import { IsEnum, IsOptional } from 'class-validator';

export class UpgradeDto {
  @IsEnum(['starter', 'growth', 'scale', 'enterprise'])
  plan: string;

  @IsOptional()
  @IsEnum(['monthly', 'annual'])
  billingCycle?: string;
}
