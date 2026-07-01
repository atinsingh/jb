import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsMongoId,
  IsArray,
} from 'class-validator';

export class CreateApplicantDto {
  @IsMongoId()
  jobId: string;

  @IsOptional()
  @IsMongoId()
  candidateId?: string;

  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsOptional()
  @IsString()
  candidateHeadline?: string;

  @IsOptional()
  @IsString()
  candidateEmail?: string;

  @IsOptional()
  @IsString()
  candidateLocation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsNumber()
  yearsExperience?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsNumber()
  aiScore?: number;

  @IsOptional()
  @IsEnum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'])
  stage?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}
