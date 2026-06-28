import { Module } from '@nestjs/common';
import { JobMatchingService } from './job-matching.service';
import { AiServicesModule } from '../ai-services/ai-services.module';

@Module({
  imports: [AiServicesModule],
  providers: [JobMatchingService],
  exports: [JobMatchingService],
})
export class JobMatchingModule {}

