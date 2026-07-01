import { IsOptional, IsString } from 'class-validator';

export class ScorecardDto {
  @IsOptional()
  @IsString()
  transcript?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
