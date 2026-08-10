import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  candidateName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  candidateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}
