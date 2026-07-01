import { Module } from '@nestjs/common';
import { EmployerPipelineModule } from '../employer-pipeline/employer-pipeline.module';
import { AiRecruiterController } from './ai-recruiter.controller';
import { AiRecruiterService } from './ai-recruiter.service';

/**
 * AiRecruiterModule
 *
 * Reuses the canonical EmployerApplicant model registered by
 * EmployerPipelineModule (which re-exports MongooseModule), so no duplicate
 * model is compiled on the connection.
 */
@Module({
  imports: [EmployerPipelineModule],
  controllers: [AiRecruiterController],
  providers: [AiRecruiterService],
  exports: [AiRecruiterService],
})
export class AiRecruiterModule {}
