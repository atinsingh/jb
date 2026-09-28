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
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { LiteLLMProvider } from './providers/litellm.provider';
import { JobDescriptionGeneratorService } from './features/job-description-generator.service';
import { LLMRoutingService } from './llm-routing.service';
import { LLMAccountingService } from './llm-accounting.service';
import { LLMQuotaService } from './llm-quota.service';
import { OwnerLlmService } from './owner-llm.service';
import { AiBudgetModule } from '../ai-budget/ai-budget.module';
import { ModelAliasModule } from '../resume-harness/model-alias.module';
import { ClaimsReviewService } from './claims-review.service';
import { BulletRewriteService } from './features/bullet-rewrite.service';
import { ResumeTailoringService } from './features/resume-tailoring.service';
import { CoverLetterGeneratorService } from './features/cover-letter-generator.service';
import { MatchCalculatorService } from './features/match-calculator.service';
import { ResumeParserAIService } from './features/resume-parser-ai.service';
import { InterviewChatService } from './features/interview-chat.service';
import { LLMController } from './llm.controller';
import { EntitlementModule } from '../entitlement/entitlement.module';
import {
  EmployerSubscription,
  EmployerSubscriptionSchema,
} from '../employer-billing/schemas/employer-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LLMUsage.name, schema: LLMUsageSchema },
      { name: ClaimsReview.name, schema: ClaimsReviewSchema },
      { name: EmployerSubscription.name, schema: EmployerSubscriptionSchema },
    ]),
    ConfigModule,
    AiBudgetModule,
    ModelAliasModule,
    EntitlementModule,
  ],
  providers: [
    OpenAIProvider,
    MockProvider,
    AnthropicProvider,
    OpenRouterProvider,
    LiteLLMProvider,
    LLMRoutingService,
    LLMAccountingService,
    LLMQuotaService,
    OwnerLlmService,
    ClaimsReviewService,
    BulletRewriteService,
    ResumeTailoringService,
    CoverLetterGeneratorService,
    MatchCalculatorService,
    ResumeParserAIService,
    InterviewChatService,
    JobDescriptionGeneratorService,
  ],
  controllers: [LLMController],
  exports: [
    OwnerLlmService,
    LLMRoutingService,
    LLMAccountingService,
    LLMQuotaService,
    ClaimsReviewService,
    BulletRewriteService,
    ResumeTailoringService,
    CoverLetterGeneratorService,
    MatchCalculatorService,
    ResumeParserAIService,
    InterviewChatService,
    JobDescriptionGeneratorService,
  ],
})
export class LLMModule {}

