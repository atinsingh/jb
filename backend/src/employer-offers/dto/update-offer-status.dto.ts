import { IsEnum } from 'class-validator';

export class UpdateOfferStatusDto {
  @IsEnum(['draft', 'sent', 'negotiating', 'accepted', 'declined'])
  status: string;
}
