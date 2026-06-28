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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulletRewriteService } from './features/bullet-rewrite.service';
import { ResumeTailoringService } from './features/resume-tailoring.service';
import { CoverLetterGeneratorService } from './features/cover-letter-generator.service';
import { LLMAccountingService } from './llm-accounting.service';
import { LLMQuotaService } from './llm-quota.service';
import { ClaimsReviewService } from './claims-review.service';
import { LLMFeature } from './llm-routing.service';

export class RewriteBulletsDto {
  bullets: string[];
  roleTarget?: string;
}

export class TailorResumeDto {
  resumeJson: Record<string, any>;
  jobDescription: string;
}

export class GenerateCoverLetterDto {
  candidateInfo: {
    name: string;
    email: string;
    skills: string[];
    experience?: string;
    summary?: string;
  };
  jobInfo: {
    title: string;
    companyName: string;
    description: string;
    requirements?: string[];
  };
}

export class ReviewClaimDto {
  decision: 'approve' | 'reject' | 'modify';
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

