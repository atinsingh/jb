import { Module } from '@nestjs/common';
import { JobMatchingService } from './job-matching.service';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [LLMModule],
  providers: [JobMatchingService],
  exports: [JobMatchingService],
})
export class JobMatchingModule {}

