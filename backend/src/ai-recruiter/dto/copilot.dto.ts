import { IsString } from 'class-validator';

export class CopilotDto {
  @IsString()
  message: string;
}
