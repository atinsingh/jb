import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ActivateProfileDto {
  @ApiProperty({
    description: 'Activate or deactivate the profile',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  active: boolean;
}

