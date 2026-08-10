import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  EmployerNotification,
  EmployerNotificationSchema,
} from '../employer-notifications/schemas/employer-notification.schema';
import {
  CandidateNotification,
  CandidateNotificationSchema,
} from './schemas/candidate-notification.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerNotification.name, schema: EmployerNotificationSchema },
      { name: CandidateNotification.name, schema: CandidateNotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService, MongooseModule],
})
export class NotificationsModule {}
