import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerBillingController } from './employer-billing.controller';
import { EmployerBillingService } from './employer-billing.service';
import {
  EmployerSubscription,
  EmployerSubscriptionSchema,
} from './schemas/employer-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerSubscription.name, schema: EmployerSubscriptionSchema },
    ]),
  ],
  controllers: [EmployerBillingController],
  providers: [EmployerBillingService],
  exports: [EmployerBillingService],
})
export class EmployerBillingModule {}
