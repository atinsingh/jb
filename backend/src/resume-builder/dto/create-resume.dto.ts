import { IsString, IsOptional, IsArray, IsObject, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Used when the caller supplies no template — the generate page has no picker. */
export const DEFAULT_RESUME_TEMPLATE = 'modern';

export class CreateResumeDto {
  @ApiPropertyOptional({
    description: `Template name. Defaults to "${DEFAULT_RESUME_TEMPLATE}".`,
    example: 'modern',
  })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ description: 'Resume name', example: 'Software Engineer Resume' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Import from existing user profile' })
  @IsBoolean()
  @IsOptional()
  importFromProfile?: boolean;

  // ---- Generated content ------------------------------------------------
  //
  // "Save to library" on /app/resume-generate posts the accepted draft here.
  // Before these fields existed the DTO rejected all of them: main.ts runs
  // ValidationPipe with `forbidNonWhitelisted: true`, so an unknown property is
  // a hard 400 rather than a silent drop — every save failed, and the page's
  // empty .catch() hid it.
  //
  // Content is optional so a blank template-only resume still works.

  @ApiPropertyOptional({ description: 'Professional summary' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ description: 'Experience entries', type: [Object] })
  @IsArray()
  @IsOptional()
  experience?: Array<Record<string, any>>;

  @ApiPropertyOptional({ description: 'Skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ description: 'Education entries', type: [Object] })
  @IsArray()
  @IsOptional()
  education?: Array<Record<string, any>>;

  // ---- Provenance -------------------------------------------------------

  @ApiPropertyOptional({ description: 'Role this resume was tailored toward' })
  @IsString()
  @IsOptional()
  targetRole?: string;

  @ApiPropertyOptional({ description: 'Company this resume was tailored toward' })
  @IsString()
  @IsOptional()
  targetCompany?: string;

  @ApiPropertyOptional({
    description: 'How this resume came to exist. Recorded so generated documents stay auditable.',
    enum: ['manual', 'generated', 'imported', 'upload'],
  })
  @IsString()
  @IsIn(['manual', 'generated', 'imported', 'upload'])
  @IsOptional()
  source?: string;
}

export class UpdateResumeSectionDto {
  @ApiProperty({ description: 'Section name', example: 'summary' })
  @IsString()
  section: string;

  @ApiProperty({ description: 'Section data' })
  @IsObject()
  data: any;
}

export class RegenerateSectionDto {
  @ApiProperty({ description: 'Section to regenerate', example: 'summary' })
  @IsString()
  section: string;

  @ApiPropertyOptional({ description: 'Job description for context' })
  @IsString()
  @IsOptional()
  jobDescription?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsString()
  @IsOptional()
  context?: string;
}

