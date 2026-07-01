import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class KitItemDto {
  @IsString()
  question: string;
}

export class ScheduleInterviewDto {
  @IsOptional()
  @IsMongoId()
  jobId?: string;

  @IsOptional()
  @IsMongoId()
  applicantId?: string;

  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interviewers?: string[];

  @IsOptional()
  @IsEnum(['phone', 'video', 'onsite'])
  type?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  durationMins?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitItemDto)
  kit?: KitItemDto[];
}
