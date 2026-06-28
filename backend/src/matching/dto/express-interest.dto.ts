import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsNotEmpty } from 'class-validator';

export enum InterestStatus {
  INTERESTED = 'interested',
  NOT_INTERESTED = 'not_interested',
  NOT_A_MATCH = 'not_a_match',
}

export class ExpressInterestDto {
  @ApiProperty({
    description: 'Job match IDs to update',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  matchIds: string[];

  @ApiProperty({
    description: 'Interest status',
    enum: InterestStatus,
    example: InterestStatus.INTERESTED,
  })
  @IsEnum(InterestStatus)
  @IsNotEmpty()
  status: InterestStatus;
}

