import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateAuditEventDto {
  @IsOptional()
  @IsString()
  actor?: string;

  @IsOptional()
  @IsString()
  actorRole?: string;

  @IsOptional()
  @IsBoolean()
  ai?: boolean;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  ip?: string;
}
