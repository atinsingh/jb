import { IsString } from 'class-validator';

export class SourcingDto {
  @IsString()
  brief: string;
}
