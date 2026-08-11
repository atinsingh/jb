import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulletRewriteService } from './features/bullet-rewrite.service';
import { ResumeTailoringService } from './features/resume-tailoring.service';
import { CoverLetterGeneratorService } from './features/cover-letter-generator.service';
import { LLMAccountingService } from './llm-accounting.service';
import { LLMQuotaService } from './llm-quota.service';
import { ClaimsReviewService } from './claims-review.service';
import { LLMFeature } from './llm-routing.service';

/**
 * These DTOs carry class-validator decorators for a reason that is easy to miss:
 * `main.ts` runs ValidationPipe with `whitelist` + `forbidNonWhitelisted`, and
 * that pipe decides what a DTO contains from decorator METADATA, not from the
 * TypeScript types (which are erased at runtime). An undecorated property is
 * therefore not "an unvalidated property" — it is an unknown one, and the pipe
 * rejects the whole request with "property X should not exist".
 *
 * Every DTO in this file was previously plain TypeScript, so all three POST
 * routes below returned 400 for every well-formed request. The endpoints were
 * unreachable, not merely unvalidated.
 */

export class RewriteBulletsDto {
  @IsArray()
  @IsString({ each: true })
  bullets: string[];

  @IsOptional()
  @IsString()
  roleTarget?: string;
}

export class TailorResumeDto {
  @IsObject()
  resumeJson: Record<string, any>;

  @IsString()
  jobDescription: string;
}

export class CandidateInfoDto {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}

export class JobInfoDto {
  @IsString()
  title: string;

  @IsString()
  companyName: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];
}

export class GenerateCoverLetterDto {
  // Nested objects need BOTH @ValidateNested and @Type: without @Type the pipe
  // has no class to validate the plain object against, so the nested contents
  // pass unchecked.
  @ValidateNested()
  @Type(() => CandidateInfoDto)
  candidateInfo: CandidateInfoDto;

  @ValidateNested()
  @Type(() => JobInfoDto)
  jobInfo: JobInfoDto;
}

export class ReviewClaimDto {
  @IsIn(['approve', 'reject', 'modify'])
  decision: 'approve' | 'reject' | 'modify';

  @IsOptional()
  @IsString()
  modifiedContent?: string;
}

@ApiTags('llm')
@Controller('llm')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LLMController {
  constructor(
    private readonly bulletRewriteService: BulletRewriteService,
    private readonly resumeTailoringService: ResumeTailoringService,
    private readonly coverLetterGeneratorService: CoverLetterGeneratorService,
    private readonly accountingService: LLMAccountingService,
    private readonly quotaService: LLMQuotaService,
    private readonly claimsReviewService: ClaimsReviewService,
  ) {}

  @Post('rewrite-bullets')
  @ApiOperation({ summary: 'Rewrite resume bullets with improvements' })
  async rewriteBullets(@Body() dto: RewriteBulletsDto, @Request() req) {
    return this.bulletRewriteService.rewriteBullets(
      req.user._id.toString(),
      dto.bullets,
      dto.roleTarget,
    );
  }

  @Post('tailor-resume')
  @ApiOperation({ summary: 'Tailor resume to job description' })
  async tailorResume(@Body() dto: TailorResumeDto, @Request() req) {
    return this.resumeTailoringService.tailorResume(
      req.user._id.toString(),
      dto.resumeJson,
      dto.jobDescription,
    );
  }

  @Post('generate-cover-letter')
  @ApiOperation({ summary: 'Generate cover letter with structured sections' })
  async generateCoverLetter(
    @Body() dto: GenerateCoverLetterDto,
    @Request() req,
  ) {
    return this.coverLetterGeneratorService.generateCoverLetter(
      req.user._id.toString(),
      dto.candidateInfo,
      dto.jobInfo,
    );
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get LLM usage statistics' })
  async getUsage(@Request() req) {
    return this.accountingService.getUserUsageStats(req.user._id.toString());
  }

  @Get('quota/:feature')
  @ApiOperation({ summary: 'Get quota information for a feature' })
  async getQuota(@Param('feature') feature: LLMFeature, @Request() req) {
    return this.quotaService.getQuotaInfo(req.user._id.toString(), feature);
  }

  @Get('claims-review/pending')
  @ApiOperation({ summary: 'Get pending claims reviews' })
  async getPendingReviews(@Request() req) {
    return this.claimsReviewService.getPendingReviews(req.user._id.toString());
  }

  @Patch('claims-review/:id')
  @ApiOperation({ summary: 'Review a claim (approve/reject/modify)' })
  async reviewClaim(
    @Param('id') reviewId: string,
    @Body() dto: ReviewClaimDto,
    @Request() req,
  ) {
    if (dto.decision === 'approve') {
      return this.claimsReviewService.approveClaim(reviewId, req.user._id.toString());
    } else if (dto.decision === 'reject') {
      return this.claimsReviewService.rejectClaim(reviewId, req.user._id.toString());
    } else if (dto.decision === 'modify') {
      if (!dto.modifiedContent) {
        throw new Error('modifiedContent required for modify decision');
      }
      return this.claimsReviewService.modifyClaim(
        reviewId,
        req.user._id.toString(),
        dto.modifiedContent,
      );
    }
    throw new Error('Invalid decision');
  }
}

