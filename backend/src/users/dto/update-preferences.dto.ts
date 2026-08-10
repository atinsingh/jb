import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Current work country (ISO2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Current region/state/province' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Willing to relocate' })
  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @ApiPropertyOptional({ description: 'Open to international relocation' })
  @IsOptional()
  @IsBoolean()
  internationalRelocation?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Countries authorized to work in (ISO2)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workAuthCountries?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  workplaceTypes?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  remoteScope?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  employmentTypes?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  salaryPeriod?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  preferredIndustries?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  excludedIndustries?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  excludedTitles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  excludedKeywords?: string[];

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  minMatchScore?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  autoApplyEnabled?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString()
  autoApplyReviewMode?: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  autoApplyMinScore?: number;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0)
  autoApplyMaxDaily?: number;

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

  @ApiPropertyOptional({ description: 'Notification toggles (matches, interviews, weekly, product)' })
  @IsOptional()
  @IsObject()
  notifications?: Record<string, boolean>;
}
