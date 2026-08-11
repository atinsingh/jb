import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Every field below MUST carry a class-validator decorator. main.ts runs
 * ValidationPipe with `whitelist` + `forbidNonWhitelisted`, which determines a
 * DTO's shape from decorator metadata, not from TypeScript types — an
 * undecorated property is rejected as unknown, not merely unvalidated. An
 * earlier DTO in this codebase shipped without decorators and made its entire
 * endpoint return 400 for every request.
 */
export class GenerateJobDescriptionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsString()
  jobType?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
