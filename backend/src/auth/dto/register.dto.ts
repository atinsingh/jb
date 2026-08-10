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
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'User role (self-registration is limited to candidate or employer)',
    example: 'ROLE_CANDIDATE',
    enum: ['ROLE_CANDIDATE', 'ROLE_EMPLOYER'],
    required: false,
    default: 'ROLE_CANDIDATE',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ROLE_CANDIDATE', 'ROLE_EMPLOYER'])
  role?: string;
}

