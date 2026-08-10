import { IsEnum } from 'class-validator';

export class UpdateDataRequestDto {
  @IsEnum(['pending', 'fulfilled', 'rejected'])
  status: string;
}
