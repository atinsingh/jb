import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerPipelineController } from './employer-pipeline.controller';
import { EmployerPipelineService } from './employer-pipeline.service';
import {
  EmployerApplicant,
  EmployerApplicantSchema,
} from './schemas/employer-applicant.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerApplicant.name, schema: EmployerApplicantSchema },
    ]),
  ],
  controllers: [EmployerPipelineController],
  providers: [EmployerPipelineService],
  exports: [EmployerPipelineService, MongooseModule],
})
export class EmployerPipelineModule {}
