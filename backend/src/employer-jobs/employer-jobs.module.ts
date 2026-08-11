import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerJobsController } from './employer-jobs.controller';
import { EmployerJobsService } from './employer-jobs.service';
import {
  EmployerJob,
  EmployerJobSchema,
} from './schemas/employer-job.schema';
import { IngestionModule } from '../ingestion/ingestion.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerJob.name, schema: EmployerJobSchema },
    ]),
    IngestionModule,
    // Supplies JobDescriptionGeneratorService for the AI-drafted JD endpoint.
    LLMModule,
  ],
  controllers: [EmployerJobsController],
  providers: [EmployerJobsService],
  exports: [EmployerJobsService],
})
export class EmployerJobsModule {}
