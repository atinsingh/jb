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
import { ModelAliasModule } from '../resume-harness/model-alias.module';
import { AiBudgetService } from './ai-budget.service';
import { EmployerBillingModule } from '../employer-billing/employer-billing.module';

@Module({
  imports: [
    ConfigModule,
    EmployerBillingModule,
    ModelAliasModule,
    MongooseModule.forFeature([
      { name: AiBudgetAccount.name, schema: AiBudgetAccountSchema },
    ]),
  ],
  providers: [
    AiBudgetPolicyService,
    AiBudgetSecretCodec,
    LiteLlmBudgetClient,
    AiBudgetService,
  ],
  exports: [
    AiBudgetPolicyService,
    AiBudgetSecretCodec,
    LiteLlmBudgetClient,
    AiBudgetService,
    MongooseModule,
  ],
})
export class AiBudgetModule {}
