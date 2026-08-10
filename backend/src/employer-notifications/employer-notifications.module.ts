import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerNotificationsController } from './employer-notifications.controller';
import { EmployerNotificationsService } from './employer-notifications.service';
import {
  EmployerNotification,
  EmployerNotificationSchema,
} from './schemas/employer-notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerNotification.name, schema: EmployerNotificationSchema },
    ]),
  ],
  controllers: [EmployerNotificationsController],
  providers: [EmployerNotificationsService],
  exports: [EmployerNotificationsService, MongooseModule],
})
export class EmployerNotificationsModule {}
