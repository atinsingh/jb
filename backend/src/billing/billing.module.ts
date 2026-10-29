import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { User, UserSchema } from '../schemas/user.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from '../schemas/subscription-plan.schema';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../schemas/user-subscription.schema';
import { UsageRecord, UsageRecordSchema } from '../schemas/usage-record.schema';
import { ConciergeBooking, ConciergeBookingSchema } from './schemas/concierge-booking.schema';
import { ConciergeMessage, ConciergeMessageSchema } from './schemas/concierge-message.schema';
import { ConciergeSession, ConciergeSessionSchema } from './schemas/concierge-session.schema';
import { ConciergeMessagesService } from './concierge-messages.service';
import { ConciergeMessagesGateway } from './concierge-messages.gateway';
import { ConciergeScheduleService } from './concierge-schedule.service';
import { ConciergePayoutService } from './concierge-payout.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: UsageRecord.name, schema: UsageRecordSchema },
      { name: ConciergeBooking.name, schema: ConciergeBookingSchema },
      { name: ConciergeMessage.name, schema: ConciergeMessageSchema },
      { name: ConciergeSession.name, schema: ConciergeSessionSchema },
    ]),
    ConfigModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, ConciergeMessagesService, ConciergeMessagesGateway, ConciergeScheduleService, ConciergePayoutService],
  exports: [BillingService, ConciergeMessagesService, ConciergeScheduleService, ConciergePayoutService],
})
export class BillingModule {}

