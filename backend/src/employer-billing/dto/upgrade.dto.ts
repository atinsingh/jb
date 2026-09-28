import { IsEnum, IsOptional } from 'class-validator';

export class UpgradeDto {
  @IsEnum(['paid'])
  plan: string;

  @IsOptional()
  @IsEnum(['monthly', 'annual'])
  billingCycle?: string;
}
