import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerDeveloperController } from './employer-developer.controller';
import { EmployerDeveloperService } from './employer-developer.service';
import {
  EmployerApiKey,
  EmployerApiKeySchema,
} from './schemas/employer-api-key.schema';
import {
  EmployerWebhook,
  EmployerWebhookSchema,
} from './schemas/employer-webhook.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerApiKey.name, schema: EmployerApiKeySchema },
      { name: EmployerWebhook.name, schema: EmployerWebhookSchema },
    ]),
  ],
  controllers: [EmployerDeveloperController],
  providers: [EmployerDeveloperService],
  exports: [EmployerDeveloperService, MongooseModule],
})
export class EmployerDeveloperModule {}
