import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsMongoId,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HARNESS_IDS, HarnessId } from '../harness/harness.types';

/**
 * Knob choices, as `knobKey -> optionValue`.
 *
 * Left as a free-form object here and validated in `ResumeTemplateService`
 * against the knobs the *selected template* declares — the valid set differs
 * per template, so it cannot be an enum on a DTO without hardcoding the
 * catalogue into code the seed is supposed to own.
 */
export type VibeDto = Record<string, string>;

export class RenameSessionDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}

export class StartSessionDto {
  @ApiProperty({ description: 'Model id offered by the options endpoint.' })
  @IsString()
  @MaxLength(200)
  model: string;

  @ApiProperty({ description: 'Effort offered for the selected model.' })
  @IsString()
  @MaxLength(40)
  effort: string;

  @ApiPropertyOptional({
    description:
      'Session whose resume should seed this one. This is the supported way ' +
      'to continue in a newly routed session.',
  })
  @IsOptional()
  @IsMongoId()
  carryFromSessionId?: string;

  /**
   * The role this résumé targets. Per-résumé, so it is asked for here rather
   * than read from the profile.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  targetRole?: string;

  /**
   * A pasted job description to tailor against. Also per-résumé.
   *
   * Note what is deliberately NOT here: name, location, seniority, work
   * authorisation, LinkedIn. Those live in Settings and Preferences and are
   * injected from there — a second copy on this screen would eventually
   * disagree with the first, and the candidate would not know which one their
   * résumé was built from.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  jobDescription?: string;

  @ApiPropertyOptional({
    description:
      'Public job-posting URL used when no description is pasted. Fetch and extraction failures are non-blocking.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  jobUrl?: string;

  @ApiPropertyOptional({
    description:
      'Template to write to. Omitted means the carried session’s template, ' +
      'then the catalogue default.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  templateKey?: string;

  @ApiPropertyOptional({
    description: 'Initial look, as knobKey -> optionValue.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  vibe?: VibeDto;
}

export class SelectTemplateDto {
  @ApiProperty({ description: 'Key of a seeded template.' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  templateKey: string;

  @ApiPropertyOptional({
    description: 'Look to apply along with the switch.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  vibe?: VibeDto;
}

export class ApplyVibeDto {
  @ApiProperty({
    description: 'Knob choices to apply, as knobKey -> optionValue.',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject()
  @IsNotEmptyObject()
  vibe: VibeDto;
}

export class RunTurnDto {
  @ApiProperty({ description: 'What the harness should do to the resume.' })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  instruction: string;

  @ApiPropertyOptional({
    enum: HARNESS_IDS,
    description:
      'Client assertion of the session harness. A mismatch is rejected — ' +
      'harness is immutable for the life of a session.',
  })
  @IsOptional()
  @IsIn(HARNESS_IDS as unknown as string[])
  harness?: HarnessId;
}
