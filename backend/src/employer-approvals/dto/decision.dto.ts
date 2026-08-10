import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class DecisionDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsNumber()
  step?: number;

  @IsEnum(['approve', 'reject', 'changes'])
  decision: string;

  @IsOptional()
  @IsString()
  note?: string;
}
