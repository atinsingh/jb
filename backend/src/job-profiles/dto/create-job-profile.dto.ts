import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsArray, Min, Max } from 'class-validator';
import { JobType } from '../../schemas/job-profile.schema';

export class CreateJobProfileDto {
  @ApiProperty({
    description: 'Profile name',
    example: 'Software Engineer Profile',
  })
  @IsString()
  profileName: string;

  @ApiProperty({
    description: 'Job role/title',
    example: 'Senior Software Engineer',
    required: false,
  })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({
    description: 'Experience level',
    example: 'senior',
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'staff', 'director'],
    required: false,
  })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiProperty({
    description: 'Preferred location',
    example: 'San Francisco, CA',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'Job type preference',
    enum: JobType,
    example: JobType.REMOTE,
    required: false,
  })
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @ApiProperty({
    description: 'Minimum salary',
    example: 100000,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salaryMin?: number;

  @ApiProperty({
    description: 'Maximum salary',
    example: 150000,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  salaryMax?: number;

  @ApiProperty({
    description: 'Preferred locations',
    type: [String],
    example: ['San Francisco', 'New York', 'Remote'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredLocations?: string[];

  @ApiProperty({
    description: 'Preferred job types',
    type: [String],
    enum: JobType,
    example: [JobType.REMOTE, JobType.HYBRID],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredJobTypes?: string[];
}

