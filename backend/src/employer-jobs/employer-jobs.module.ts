import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerJobsController } from './employer-jobs.controller';
import { EmployerJobsService } from './employer-jobs.service';
import {
  EmployerJob,
  EmployerJobSchema,
} from './schemas/employer-job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerJob.name, schema: EmployerJobSchema },
    ]),
  ],
  controllers: [EmployerJobsController],
  providers: [EmployerJobsService],
  exports: [EmployerJobsService],
})
export class EmployerJobsModule {}
