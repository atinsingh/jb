import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean, Min, Max } from 'class-validator';
import { JobType } from '../../schemas/job-profile.schema';

export class UpdateJobProfileDto {
  @ApiProperty({ description: 'Profile name', required: false })
  @IsString()
  @IsOptional()
  profileName?: string;

  @ApiProperty({ description: 'Job role/title', required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ 
    description: 'Experience level',
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'staff', 'director'],
    required: false 
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiProperty({ description: 'Preferred location', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Job type preference', enum: JobType, required: false })
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @ApiProperty({ description: 'Minimum salary', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salaryMin?: number;

  @ApiProperty({ description: 'Maximum salary', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salaryMax?: number;

  @ApiProperty({ description: 'Skills array', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiProperty({ description: 'Experience array', required: false })
  @IsArray()
  @IsOptional()
  experience?: Array<{
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;

  @ApiProperty({ description: 'Education array', required: false })
  @IsArray()
  @IsOptional()
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;

  @ApiProperty({ description: 'Preferred locations', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLocations?: string[];

  @ApiProperty({ description: 'Preferred job types', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredJobTypes?: string[];

  @ApiProperty({ description: 'Minimum match score', required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minMatchScore?: number;

  @ApiProperty({ description: 'Auto-apply setting', required: false })
  @IsBoolean()
  @IsOptional()
  autoApply?: boolean;
}

