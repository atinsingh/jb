import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ScreeningQuestionDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
