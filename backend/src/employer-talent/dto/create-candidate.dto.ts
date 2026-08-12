import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class CreateCandidateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  headline?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsEnum(['saved', 'silver', 'future'])
  segment?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  candidateId?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
