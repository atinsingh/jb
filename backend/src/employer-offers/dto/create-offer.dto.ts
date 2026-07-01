import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsMongoId,
} from 'class-validator';

export class CreateOfferDto {
  @IsOptional()
  @IsMongoId()
  jobId?: string;

  @IsOptional()
  @IsMongoId()
  applicantId?: string;

  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsOptional()
  @IsNumber()
  base?: number;

  @IsOptional()
  @IsNumber()
  equityPerYear?: number;

  @IsOptional()
  @IsNumber()
  signOnBonus?: number;

  @IsOptional()
  @IsNumber()
  targetBonus?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsEnum(['draft', 'sent', 'negotiating', 'accepted', 'declined'])
  status?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
