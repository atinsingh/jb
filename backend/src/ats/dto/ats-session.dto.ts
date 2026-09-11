import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsMongoId, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class StartAtsSessionDto {
  @ApiProperty()
  @IsMongoId()
  resumeSessionId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  sourceRevision: number;

  @ApiProperty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  jobDescription: string;
}
