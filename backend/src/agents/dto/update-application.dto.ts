import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class UpdateApplicationDto {
  @ApiProperty({
    description: 'Application status',
    enum: ['pending', 'submitted', 'reviewing', 'interviewed', 'rejected', 'accepted'],
    required: false,
  })
  @IsEnum(['pending', 'submitted', 'reviewing', 'interviewed', 'rejected', 'accepted'])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Agent notes', required: false })
  @IsString()
  @IsOptional()
  agentNotes?: string;

  @ApiProperty({ description: 'General notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

