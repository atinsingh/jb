import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ScreeningQuestionDto } from './screening-question.dto';

export class CreateJobDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(['Full-time', 'Part-time', 'Contract', 'Internship'])
  type?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @IsOptional()
  @IsEnum(['year', 'hour'])
  salaryPeriod?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScreeningQuestionDto)
  screeningQuestions?: ScreeningQuestionDto[];

  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'closed'])
  status?: string;

  @IsOptional()
  @IsEnum(['public', 'private'])
  visibility?: string;
}
