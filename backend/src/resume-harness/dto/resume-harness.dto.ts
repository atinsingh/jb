import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HARNESS_IDS, HarnessId } from '../harness/harness.types';

export class StartSessionDto {
  @ApiProperty({ enum: HARNESS_IDS })
  @IsIn(HARNESS_IDS as unknown as string[])
  harness: HarnessId;

  @ApiPropertyOptional({
    description:
      'Model+effort alias to run at. Must be one the caller tier permits; ' +
      'omitted means the tier default.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alias?: string;

  @ApiPropertyOptional({
    description:
      'Session whose resume should seed this one. This is the supported way ' +
      'to change harness.',
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
