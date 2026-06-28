import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCoverLetterDto {
  @ApiProperty({ description: 'Job title', example: 'Senior Software Engineer' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({ description: 'Company name', example: 'Tech Corp' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Job description and requirements' })
  @IsString()
  @IsNotEmpty()
  jobDescription: string;

  @ApiPropertyOptional({ description: 'Additional information to include' })
  @IsString()
  @IsOptional()
  additionalInfo?: string;

  @ApiProperty({ 
    description: 'Template style',
    enum: ['professional', 'modern', 'concise', 'enthusiastic', 'storytelling'],
    example: 'professional'
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['professional', 'modern', 'concise', 'enthusiastic', 'storytelling'])
  template: string;
}

