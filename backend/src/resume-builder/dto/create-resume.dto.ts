import { IsString, IsOptional, IsArray, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResumeDto {
  @ApiProperty({ description: 'Template name', example: 'modern' })
  @IsString()
  template: string;

  @ApiPropertyOptional({ description: 'Resume name', example: 'Software Engineer Resume' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Import from existing user profile' })
  @IsBoolean()
  @IsOptional()
  importFromProfile?: boolean;
}

export class UpdateResumeSectionDto {
  @ApiProperty({ description: 'Section name', example: 'summary' })
  @IsString()
  section: string;

  @ApiProperty({ description: 'Section data' })
  @IsObject()
  data: any;
}

export class RegenerateSectionDto {
  @ApiProperty({ description: 'Section to regenerate', example: 'summary' })
  @IsString()
  section: string;

  @ApiPropertyOptional({ description: 'Job description for context' })
  @IsString()
  @IsOptional()
  jobDescription?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsString()
  @IsOptional()
  context?: string;
}

