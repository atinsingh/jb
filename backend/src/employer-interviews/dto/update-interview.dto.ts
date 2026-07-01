import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdateInterviewDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  durationMins?: number;

  @IsOptional()
  @IsEnum(['scheduled', 'completed', 'cancelled'])
  status?: string;
}
