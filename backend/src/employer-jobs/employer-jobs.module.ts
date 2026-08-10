import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerJobsController } from './employer-jobs.controller';
import { EmployerJobsService } from './employer-jobs.service';
import {
  EmployerJob,
  EmployerJobSchema,
} from './schemas/employer-job.schema';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerJob.name, schema: EmployerJobSchema },
    ]),
    IngestionModule,
  ],
  controllers: [EmployerJobsController],
  providers: [EmployerJobsService],
  exports: [EmployerJobsService],
})
export class EmployerJobsModule {}
