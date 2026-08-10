import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateWebhookDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}
