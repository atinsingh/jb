import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateSecurityDto {
  @IsOptional()
  @IsEnum(['okta', 'azure', 'google', ''])
  idp?: string;

  @IsOptional()
  @IsString()
  ssoMetadataUrl?: string;

  @IsOptional()
  @IsBoolean()
  enforceSso?: boolean;

  @IsOptional()
  @IsBoolean()
  scimEnabled?: boolean;

  @IsOptional()
  @IsString()
  scimToken?: string;

  @IsOptional()
  @IsEnum(['1h', '8h', '30d'])
  idleTimeout?: string;

  @IsOptional()
  @IsBoolean()
  twoFactorRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  autoDeleteEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowlist?: string[];
}
