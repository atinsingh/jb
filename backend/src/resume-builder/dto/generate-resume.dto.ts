import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Job descriptions arrive as untrusted free text and go straight into a prompt.
 * Bounding the length is both a memory guard and a prompt-injection guard: a
 * 50KB "job description" is not a job description.
 */
const MAX_JD_CHARS = 20000;

export class GenerateResumeDto {
  @ApiProperty({ description: 'Target role the résumé is being tailored for', example: 'Senior Backend Engineer' })
  @IsString()
  @MaxLength(200)
  role: string;

  @ApiPropertyOptional({ description: 'Job description to tailor against' })
  @IsString()
  @MaxLength(MAX_JD_CHARS)
  @IsOptional()
  jobDescription?: string;

  @ApiPropertyOptional({ description: 'Résumé id to draw facts from. Defaults to the primary résumé.' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Register of the writing. Adjusts tone only, never claims.', example: 'professional' })
  @IsString()
  @IsOptional()
  tone?: string;

  @ApiPropertyOptional({ description: 'Seniority register', example: 'senior' })
  @IsString()
  @IsOptional()
  seniority?: string;
}

export const GENERATABLE_SECTIONS = ['summary', 'experience', 'skills'] as const;
export type GeneratableSection = (typeof GENERATABLE_SECTIONS)[number];

export class GenerateSectionDto {
  @ApiProperty({ enum: GENERATABLE_SECTIONS })
  @IsIn(GENERATABLE_SECTIONS as unknown as string[])
  section: GeneratableSection;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  @IsOptional()
  role?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(MAX_JD_CHARS)
  @IsOptional()
  jobDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seniority?: string;
}
