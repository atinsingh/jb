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
import { EmployerBillingModule } from '../employer-billing/employer-billing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: UsageRecord.name, schema: UsageRecordSchema },
    ]),
    ConfigModule,
    // Supplies EmployerBillingService so the shared webhook endpoint can route
    // employer-tagged Stripe events. EmployerBillingModule does not import this
    // module back, so there is no cycle.
    EmployerBillingModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}

