import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerOffersController } from './employer-offers.controller';
import { EmployerOffersService } from './employer-offers.service';
import {
  EmployerOffer,
  EmployerOfferSchema,
} from './schemas/employer-offer.schema';
import { EmployerPipelineModule } from '../employer-pipeline/employer-pipeline.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerOffer.name, schema: EmployerOfferSchema },
    ]),
    // Provides the EmployerApplicant model used to resolve candidateId.
    EmployerPipelineModule,
  ],
  controllers: [EmployerOffersController],
  providers: [EmployerOffersService],
  exports: [EmployerOffersService],
})
export class EmployerOffersModule {}
