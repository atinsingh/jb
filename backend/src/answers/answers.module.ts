import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnswerProfile, AnswerProfileSchema } from '../schemas/answer-profile.schema';
import { AnswerBank, AnswerBankSchema } from '../schemas/answer-bank.schema';
import { QuestionCatalog, QuestionCatalogSchema } from '../schemas/question-catalog.schema';
import { LLMModule } from '../llm/llm.module';
import { AnswerProfileService } from './answer-profile.service';
import { AnswerBankService } from './answer-bank.service';
import { QuestionCatalogService } from './question-catalog.service';
import { OptionMapperService } from './option-mapper.service';
import { AnswerResolverService } from './answer-resolver.service';

/**
 * The answer engine.
 *
 * Turns an introspected ATS form into resolved answers plus the blockers a
 * candidate must clear. Global because both the apply-runner (preparing an
 * application) and the approval queue (learning from a candidate's answer) need
 * it, and neither should have to thread it through a module graph.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnswerProfile.name, schema: AnswerProfileSchema },
      { name: AnswerBank.name, schema: AnswerBankSchema },
      { name: QuestionCatalog.name, schema: QuestionCatalogSchema },
    ]),
    LLMModule,
  ],
  providers: [
    AnswerProfileService,
    AnswerBankService,
    QuestionCatalogService,
    OptionMapperService,
    AnswerResolverService,
  ],
  exports: [
    AnswerProfileService,
    AnswerBankService,
    QuestionCatalogService,
    OptionMapperService,
    AnswerResolverService,
  ],
})
export class AnswersModule {}
