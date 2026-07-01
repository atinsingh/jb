import { IsEnum } from 'class-validator';

export class UpdateStageDto {
  @IsEnum(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'])
  stage: string;
}
