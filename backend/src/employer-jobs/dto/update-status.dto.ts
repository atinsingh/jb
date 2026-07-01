import { IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(['draft', 'active', 'paused', 'closed'])
  status: string;
}
