import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EntitlementService } from './entitlement.service';
import { EntitlementController } from './entitlement.controller';
import { EntitlementGuard } from './entitlement.guard';
import { User, UserSchema } from '../schemas/user.schema';
import {
  PlanEntitlement,
  PlanEntitlementSchema,
} from '../schemas/plan-entitlement.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from '../schemas/subscription-plan.schema';
import { UsageRecord, UsageRecordSchema } from '../schemas/usage-record.schema';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../schemas/user-subscription.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PlanEntitlement.name, schema: PlanEntitlementSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: UsageRecord.name, schema: UsageRecordSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
    ]),
  ],
  controllers: [EntitlementController],
  providers: [EntitlementService, EntitlementGuard],
  exports: [EntitlementService, EntitlementGuard],
})
export class EntitlementModule {}
