import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateResumeDto {
    @ApiPropertyOptional({ description: 'Resume name' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'Full resume content (sections)' })
    @IsObject()
    @IsOptional()
    content?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Optimistic locking version', example: 1 })
    @IsNumber()
    @IsOptional()
    version?: number;
}

export class UpdateThemeDto {
    @ApiProperty({ example: '#000000' })
    @IsString()
    color: string;

    @ApiProperty({ example: 'inter' })
    @IsString()
    font: string;

    @ApiProperty({ example: 'normal', enum: ['compact', 'normal', 'loose'] })
    @IsString()
    spacing: string;
}

export class CreateShareLinkDto {
    @ApiPropertyOptional({ default: true })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean;

    @ApiPropertyOptional({ description: 'Optional password protection' })
    @IsString()
    @IsOptional()
    password?: string;

    @ApiPropertyOptional({ description: 'Expiration in days' })
    @IsNumber()
    @IsOptional()
    @Min(1)
    expiresInDays?: number;
}
