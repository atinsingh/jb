import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDemoRequestDto {
  @ApiProperty({ example: 'Alex Rivera' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'alex@company.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(200)
  email: string;

  @ApiPropertyOptional({ example: 'Acme Inc.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @ApiPropertyOptional({ example: '51-200' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  companySize?: string;

  @ApiPropertyOptional({ example: 'Head of Talent' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @ApiPropertyOptional({ example: '10-50 hires' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  hiringVolume?: string;

  @ApiPropertyOptional({ example: 'Screening is our bottleneck this quarter.' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;
}

export class CreateContactMessageDto {
  @ApiProperty({ example: 'Alex Rivera' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'alex@company.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(200)
  email: string;

  @ApiPropertyOptional({ example: 'Billing question' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ example: 'I have a question about the Pro plan.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;
}
