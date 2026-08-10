import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerApprovalsController } from './employer-approvals.controller';
import { EmployerApprovalsService } from './employer-approvals.service';
import {
  EmployerApproval,
  EmployerApprovalSchema,
} from './schemas/employer-approval.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerApproval.name, schema: EmployerApprovalSchema },
    ]),
  ],
  controllers: [EmployerApprovalsController],
  providers: [EmployerApprovalsService],
  exports: [EmployerApprovalsService, MongooseModule],
})
export class EmployerApprovalsModule {}
