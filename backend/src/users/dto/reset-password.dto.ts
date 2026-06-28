import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'reset-token-here',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

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

