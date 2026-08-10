import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerDistributionController } from './employer-distribution.controller';
import { EmployerDistributionService } from './employer-distribution.service';
import {
  EmployerDistributionChannel,
  EmployerDistributionChannelSchema,
} from './schemas/employer-distribution-channel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EmployerDistributionChannel.name,
        schema: EmployerDistributionChannelSchema,
      },
    ]),
  ],
  controllers: [EmployerDistributionController],
  providers: [EmployerDistributionService],
  exports: [EmployerDistributionService, MongooseModule],
})
export class EmployerDistributionModule {}
