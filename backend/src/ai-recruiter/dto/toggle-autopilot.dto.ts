import { IsBoolean } from 'class-validator';

export class ToggleAutopilotDto {
  @IsBoolean()
  enabled: boolean;
}
