import { IsString, IsOptional, IsIn, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// A job description is untrusted, candidate-pasted free text that goes
// straight into an LLM prompt. Bounding its length caps worst-case prompt
// size/cost and shrinks the surface available to a prompt-injection attempt.
// The actual grounding guarantee is enforced structurally in
// resume-generation.util.ts regardless of what the text says — this bound is
// a cheap, unrelated second layer, not the guarantee itself.
const JOB_DESCRIPTION_MAX_LENGTH = 8000;

export class GenerateResumeDto {
  @ApiProperty({ description: 'Target role to tailor the résumé toward', example: 'Senior Product Designer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  role: string;

  @ApiPropertyOptional({
    description: 'Target job description. Treated as untrusted data for keyword/coverage matching, never as instructions.',
    maxLength: JOB_DESCRIPTION_MAX_LENGTH,
  })
  @IsString()
  @IsOptional()
  @MaxLength(JOB_DESCRIPTION_MAX_LENGTH)
  jobDescription?: string;

  @ApiPropertyOptional({
    description:
      "Where the candidate says their base facts come from. Informational only — the server " +
      "always grounds generation on the candidate's own stored résumé/profile regardless of this value.",
    enum: ['profile', 'upload', 'linkedin'],
    example: 'profile',
  })
  @IsString()
  @IsOptional()
  @IsIn(['profile', 'upload', 'linkedin'])
  source?: string;

  @ApiPropertyOptional({
    description: 'Writing register (e.g. confident/warm/concise) — adjusts phrasing only, never adds claims',
    example: 'confident',
  })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  tone?: string;

  @ApiPropertyOptional({
    description: 'Seniority register (e.g. mid/senior/staff) — adjusts phrasing only, never adds claims',
    example: 'senior',
  })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  seniority?: string;
}

export class GenerateSectionDto {
  @ApiProperty({
    description: 'Section to regenerate — exactly this section is touched, nothing else',
    enum: ['summary', 'experience', 'skills'],
    example: 'summary',
  })
  @IsString()
  @IsIn(['summary', 'experience', 'skills'])
  section: 'summary' | 'experience' | 'skills';

  @ApiPropertyOptional({ description: 'Target role', example: 'Senior Product Designer' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  role?: string;

  @ApiPropertyOptional({
    description: 'Target job description. Treated as untrusted data, never as instructions.',
    maxLength: JOB_DESCRIPTION_MAX_LENGTH,
  })
  @IsString()
  @IsOptional()
  @MaxLength(JOB_DESCRIPTION_MAX_LENGTH)
  jobDescription?: string;

  @ApiPropertyOptional({ description: 'Writing register — adjusts phrasing only, never adds claims', example: 'confident' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  tone?: string;

  @ApiPropertyOptional({ description: 'Seniority register — adjusts phrasing only, never adds claims', example: 'senior' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  seniority?: string;
}
