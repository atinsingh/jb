import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerIntegrationsController } from './employer-integrations.controller';
import { EmployerIntegrationsService } from './employer-integrations.service';
import {
  EmployerIntegration,
  EmployerIntegrationSchema,
} from './schemas/employer-integration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerIntegration.name, schema: EmployerIntegrationSchema },
    ]),
  ],
  controllers: [EmployerIntegrationsController],
  providers: [EmployerIntegrationsService],
  exports: [EmployerIntegrationsService, MongooseModule],
})
export class EmployerIntegrationsModule {}
