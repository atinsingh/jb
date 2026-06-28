import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { LLMUsage, LLMUsageSchema } from './schemas/llm-usage.schema';
import {
  ClaimsReview,
  ClaimsReviewSchema,
} from './schemas/claims-review.schema';
import { OpenAIProvider } from './providers/openai.provider';
import { MockProvider } from './providers/mock.provider';
import { LLMRoutingService } from './llm-routing.service';
import { LLMAccountingService } from './llm-accounting.service';
import { LLMQuotaService } from './llm-quota.service';
import { ClaimsReviewService } from './claims-review.service';
import { BulletRewriteService } from './features/bullet-rewrite.service';
import { ResumeTailoringService } from './features/resume-tailoring.service';
import { CoverLetterGeneratorService } from './features/cover-letter-generator.service';
import { LLMController } from './llm.controller';
import { EntitlementModule } from '../entitlement/entitlement.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LLMUsage.name, schema: LLMUsageSchema },
      { name: ClaimsReview.name, schema: ClaimsReviewSchema },
    ]),
    ConfigModule,
    EntitlementModule,
  ],
  providers: [
    OpenAIProvider,
    MockProvider,
    LLMRoutingService,
    LLMAccountingService,
    LLMQuotaService,
    ClaimsReviewService,
    BulletRewriteService,
    ResumeTailoringService,
    CoverLetterGeneratorService,
  ],
  controllers: [LLMController],
  exports: [
    LLMRoutingService,
    LLMAccountingService,
    LLMQuotaService,
    ClaimsReviewService,
    BulletRewriteService,
    ResumeTailoringService,
    CoverLetterGeneratorService,
  ],
})
export class LLMModule {}

