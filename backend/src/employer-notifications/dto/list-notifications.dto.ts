import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListNotificationsDto {
  @ApiPropertyOptional({
    description: "Filter by type ('applicants'|'interviews'|'offers'|'ai'|'all')",
  })
  @IsOptional()
  @IsString()
  type?: string;
}
