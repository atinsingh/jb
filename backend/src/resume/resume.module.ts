import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeParserService } from './resume-parser.service';
import { User, UserSchema } from '../schemas/user.schema';
import { AiServicesModule } from '../ai-services/ai-services.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AiServicesModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService, ResumeParserService],
  exports: [ResumeService, ResumeParserService],
})
export class ResumeModule {}

