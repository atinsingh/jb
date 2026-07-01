import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerInterviewsController } from './employer-interviews.controller';
import { EmployerInterviewsService } from './employer-interviews.service';
import {
  EmployerInterview,
  EmployerInterviewSchema,
} from './schemas/employer-interview.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerInterview.name, schema: EmployerInterviewSchema },
    ]),
  ],
  controllers: [EmployerInterviewsController],
  providers: [EmployerInterviewsService],
  exports: [EmployerInterviewsService],
})
export class EmployerInterviewsModule {}
