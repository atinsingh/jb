import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AiBudgetPolicyService } from './ai-budget-policy.service';
import { AiBudgetSecretCodec } from './ai-budget-secret.codec';
import { LiteLlmBudgetClient } from './litellm-budget.client';
import {
  AiBudgetAccount,
  AiBudgetAccountSchema,
} from './schemas/ai-budget-account.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AiBudgetAccount.name, schema: AiBudgetAccountSchema },
    ]),
  ],
  providers: [AiBudgetPolicyService, AiBudgetSecretCodec, LiteLlmBudgetClient],
  exports: [
    AiBudgetPolicyService,
    AiBudgetSecretCodec,
    LiteLlmBudgetClient,
    MongooseModule,
  ],
})
export class AiBudgetModule {}
