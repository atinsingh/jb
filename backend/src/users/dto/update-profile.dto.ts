import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';

export class ConciergeDurationDto {
  @IsInt()
  @Min(15)
  @Max(480)
  minutes: number;

  @IsString()
  @MaxLength(500)
  @Matches(/^https?:\/\/(?:www\.)?(?:calendly\.com|meet\.google\.com|calendar\.google\.com|calendar\.app\.google)(?:\/[^\s"'<>]*)?$/i)
  url: string;
}

export class ConciergeProfileDto {
  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  headline?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  bio?: string;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @IsOptional()
  specialties?: string[];

  @IsInt()
  @Min(0)
  @Max(60)
  @IsOptional()
  yearsExperience?: number;

  @IsInt()
  @Min(10)
  @Max(1000)
  @IsOptional()
  hourlyRate?: number;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @IsOptional()
  languages?: string[];

  @IsString()
  @MaxLength(64)
  @IsOptional()
  timezone?: string;

  @IsArray()
  @ArrayMaxSize(32)
  @ValidateNested({ each: true })
  @Type(() => ConciergeDurationDto)
  @IsOptional()
  durations?: ConciergeDurationDto[];
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'User full name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Location', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Short professional headline', required: false })
  @IsString()
  @IsOptional()
  headline?: string;

  @ApiProperty({ description: 'LinkedIn profile URL', required: false })
  @IsString()
  @IsOptional()
  linkedin?: string;

  @ApiProperty({ description: 'Professional summary', required: false })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({ description: 'Skills array', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiProperty({ description: 'Experience array', required: false })
  @IsArray()
  @IsOptional()
  experience?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;

  @ApiProperty({ description: 'Education array', required: false })
  @IsArray()
  @IsOptional()
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;

  /**
   * Optional résumé enrichment, added alongside experience and education.
   *
   * The résumé generator reads these from the account rather than asking for
   * them on its own screen, so this DTO is the only way they get set. Absent is
   * a valid state — a thinner résumé, never a blocked one.
   */
  @ApiProperty({ description: 'Certifications array', required: false })
  @IsArray()
  @IsOptional()
  certifications?: Array<{
    name?: string;
    issuer?: string;
    year?: string;
    credentialId?: string;
  }>;

  @ApiProperty({
    description: 'Standalone achievements not tied to one role',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  achievements?: string[];

  @ApiProperty({ description: 'Auto-apply setting', required: false })
  @IsBoolean()
  @IsOptional()
  autoApply?: boolean;

  @ApiProperty({ description: 'Minimum match score', required: false })
  @IsNumber()
  @IsOptional()
  minMatchScore?: number;

  @ApiProperty({ description: 'Preferred locations', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLocations?: string[];

  @ApiProperty({ description: 'Preferred job types', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredJobTypes?: string[];

  @ApiProperty({ description: 'Employer concierge profile', required: false, type: ConciergeProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConciergeProfileDto)
  conciergeProfile?: ConciergeProfileDto;
}

