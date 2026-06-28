import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'SecurePassword123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'User role',
    example: 'ROLE_CANDIDATE',
    enum: ['ROLE_CANDIDATE', 'ROLE_EMPLOYER', 'ROLE_AGENT', 'ROLE_ADMIN'],
    required: false,
    default: 'ROLE_CANDIDATE',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ROLE_CANDIDATE', 'ROLE_EMPLOYER', 'ROLE_AGENT', 'ROLE_ADMIN'])
  role?: string;
}

