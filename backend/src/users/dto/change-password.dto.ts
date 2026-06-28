import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (minimum 6 characters)',
    example: 'NewSecurePassword123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  newPassword: string;
}

