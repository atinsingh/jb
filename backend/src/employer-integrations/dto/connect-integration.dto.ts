import { IsOptional, IsString } from 'class-validator';

export class ConnectIntegrationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
