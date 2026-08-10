import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApprovalFieldDto {
  @IsString()
  label: string;

  @IsString()
  value: string;
}

export class ApprovalChainStepDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateApprovalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  requester?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalFieldDto)
  fields?: ApprovalFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalChainStepDto)
  chain?: ApprovalChainStepDto[];
}
