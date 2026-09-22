import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ResumeExperienceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() startDate?: string;
  @IsString() @IsOptional() endDate?: string;
  @IsBoolean() @IsOptional() current?: boolean;
  @IsString() @IsOptional() description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  achievements?: string[];
}

export class ResumeCertificationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString() @IsOptional() issuer?: string;
  @IsString() @IsOptional() date?: string;
  @IsString() @IsOptional() expiryDate?: string;
  @IsString() @IsOptional() credentialId?: string;
  @IsString() @IsOptional() credentialUrl?: string;
}

/** Validated document fields shared by manual Compare imports and edits. */
export class UpdateResumeDocumentDto {
  @IsString() @IsOptional() template?: string;
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() fullName?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() website?: string;
  @IsString() @IsOptional() linkedin?: string;
  @IsString() @IsOptional() github?: string;
  @IsString() @IsOptional() headline?: string;
  @IsString() @IsOptional() summary?: string;
  @IsString() @IsOptional() profileSummary?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeExperienceDto)
  @IsOptional()
  experience?: ResumeExperienceDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  achievements?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationDto)
  @IsOptional()
  certifications?: ResumeCertificationDto[];

  @IsArray() @IsOptional() education?: Record<string, any>[];
  @IsArray() @IsOptional() projects?: Record<string, any>[];
  @IsArray() @IsOptional() languages?: Record<string, any>[];
  @IsArray() @IsOptional() customSections?: Record<string, any>[];
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];

  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() creationMethod?: string;
  @IsString() @IsOptional() targetRole?: string;
  @IsString() @IsOptional() targetCompany?: string;
  @IsString() @IsOptional() sourceResumeId?: string;
  @IsString() @IsOptional() pdfUrl?: string;
  @IsBoolean() @IsOptional() isPrimary?: boolean;
  @IsNumber() @IsOptional() atsScore?: number;
  @IsNumber() @IsOptional() applicationCount?: number;
  @IsNumber() @IsOptional() version?: number;
  @IsObject() @IsOptional() source?: Record<string, any>;
}

export class ImportResumeDto extends UpdateResumeDocumentDto {
  @IsString()
  @IsOptional()
  importMode?: string;
}
