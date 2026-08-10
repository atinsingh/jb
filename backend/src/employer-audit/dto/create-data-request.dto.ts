import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateDataRequestDto {
  @IsString()
  name: string;

  @IsEnum(['export', 'delete'])
  type: string;

  @IsOptional()
  @IsString()
  detail?: string;
}
