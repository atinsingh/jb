import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerTalentController } from './employer-talent.controller';
import { EmployerTalentService } from './employer-talent.service';
import {
  EmployerTalentCandidate,
  EmployerTalentCandidateSchema,
} from './schemas/employer-talent-candidate.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EmployerTalentCandidate.name,
        schema: EmployerTalentCandidateSchema,
      },
    ]),
  ],
  controllers: [EmployerTalentController],
  providers: [EmployerTalentService],
  exports: [EmployerTalentService, MongooseModule],
})
export class EmployerTalentModule {}
