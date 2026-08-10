import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const INTERVIEW_MODES = ['PRACTICE', 'CONSENT', 'LIVE_NOTES'] as const;
export const ROLE_FAMILIES = ['SWE_BACKEND', 'DEVOPS_CLOUD', 'PM', 'DATA'] as const;
export const SENIORITIES = ['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'MANAGER'] as const;
export const INTERVIEW_TYPES = ['BEHAVIORAL', 'TECHNICAL', 'SYSTEM_DESIGN', 'CODING', 'CASE', 'MIXED'] as const;

export class CreateInterviewSessionDto {
  @ApiProperty({ enum: INTERVIEW_MODES })
  @IsIn(INTERVIEW_MODES as unknown as string[])
  mode: (typeof INTERVIEW_MODES)[number];

  @ApiProperty({ example: 'Senior Backend Engineer' })
  @IsString()
  @MaxLength(140)
  roleTitle: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(140)
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Résumé to ground coaching in' })
  @IsString()
  @IsOptional()
  resumeVersionId?: string;

  @ApiPropertyOptional({ enum: ROLE_FAMILIES })
  @IsIn(ROLE_FAMILIES as unknown as string[])
  @IsOptional()
  roleFamily?: (typeof ROLE_FAMILIES)[number];

  @ApiPropertyOptional({ enum: SENIORITIES })
  @IsIn(SENIORITIES as unknown as string[])
  @IsOptional()
  seniority?: (typeof SENIORITIES)[number];

  @ApiPropertyOptional({ enum: INTERVIEW_TYPES })
  @IsIn(INTERVIEW_TYPES as unknown as string[])
  @IsOptional()
  interviewType?: (typeof INTERVIEW_TYPES)[number];
}

/**
 * Consent acknowledgement for live capture.
 *
 * Live capture records SECOND-PARTY audio — the interviewer's voice. In
 * two-party-consent jurisdictions that engages wiretap law, so this is a
 * deliberate, explicit act rather than a flag buried in settings. Without it
 * the gateway refuses to start capture at all.
 */
export class AcknowledgeConsentDto {
  @ApiProperty({ description: 'The candidate confirms they may record this conversation' })
  @IsBoolean()
  acknowledged: boolean;

  @ApiPropertyOptional({
    description:
      'Keep the transcript after the session ends. Defaults to FALSE — interview ' +
      'transcripts are unusually sensitive, so retention is opt-in per session.',
  })
  @IsBoolean()
  @IsOptional()
  retainTranscript?: boolean;
}
