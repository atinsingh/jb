import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerSecurityController } from './employer-security.controller';
import { EmployerSecurityService } from './employer-security.service';
import {
  EmployerSecuritySettings,
  EmployerSecuritySettingsSchema,
} from './schemas/employer-security-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EmployerSecuritySettings.name,
        schema: EmployerSecuritySettingsSchema,
      },
    ]),
  ],
  controllers: [EmployerSecurityController],
  providers: [EmployerSecurityService],
  exports: [EmployerSecurityService, MongooseModule],
})
export class EmployerSecurityModule {}
