import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsNumber, IsEmail } from 'class-validator';

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
}

