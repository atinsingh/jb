import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ type: [String], description: 'Target job titles' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  titles?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Preferred locations' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @ApiPropertyOptional({ description: 'Minimum salary expectation' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Remote only preference' })
  @IsOptional()
  @IsBoolean()
  remoteOnly?: boolean;

  @ApiPropertyOptional({ description: 'Visa sponsorship required' })
  @IsOptional()
  @IsBoolean()
  visaSponsorshipNeeded?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Company blocklist' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyBlocklist?: string[];

  @ApiPropertyOptional({ description: 'Speed-first auto-apply toggle' })
  @IsOptional()
  @IsBoolean()
  speedFirst?: boolean;

  @ApiPropertyOptional({ description: 'Privacy mode toggle' })
  @IsOptional()
  @IsBoolean()
  privacyMode?: boolean;
}
