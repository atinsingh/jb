import { IsOptional, IsString } from 'class-validator';

export class ScreenDto {
  @IsOptional()
  @IsString()
  jobId?: string;
}
