import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EmployerAuditController,
  EmployerComplianceController,
} from './employer-audit.controller';
import { EmployerAuditService } from './employer-audit.service';
import {
  EmployerAuditEvent,
  EmployerAuditEventSchema,
} from './schemas/employer-audit-event.schema';
import {
  EmployerDataRequest,
  EmployerDataRequestSchema,
} from './schemas/employer-data-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerAuditEvent.name, schema: EmployerAuditEventSchema },
      { name: EmployerDataRequest.name, schema: EmployerDataRequestSchema },
    ]),
  ],
  controllers: [EmployerAuditController, EmployerComplianceController],
  providers: [EmployerAuditService],
  exports: [EmployerAuditService, MongooseModule],
})
export class EmployerAuditModule {}
