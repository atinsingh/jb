import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoverLettersController } from './cover-letters.controller';
import { CoverLettersService } from './cover-letters.service';
import { CoverLetter, CoverLetterSchema } from '../schemas/cover-letter.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CoverLetter.name, schema: CoverLetterSchema },
      { name: User.name, schema: UserSchema },
    ]),
    LLMModule,
  ],
  controllers: [CoverLettersController],
  providers: [CoverLettersService],
  exports: [CoverLettersService],
})
export class CoverLettersModule {}

