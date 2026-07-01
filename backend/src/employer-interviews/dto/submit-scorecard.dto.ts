import { Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CompetencyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}

export class SubmitScorecardDto {
  @IsOptional()
  @IsMongoId()
  interviewerId?: string;

  @IsOptional()
  @IsString()
  interviewerName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompetencyDto)
  competencies?: CompetencyDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;
}
