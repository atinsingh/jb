import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateChannelDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  spend?: number;

  @IsOptional()
  @IsEnum(['live', 'paused', 'off'])
  status?: string;
}
