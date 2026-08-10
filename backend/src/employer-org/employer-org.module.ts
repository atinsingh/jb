import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerOrgController } from './employer-org.controller';
import { EmployerOrgService } from './employer-org.service';
import { EmployerOrg, EmployerOrgSchema } from '../schemas/employer-org.schema';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerOrg.name, schema: EmployerOrgSchema },
    ]),
  ],
  controllers: [EmployerOrgController],
  providers: [EmployerOrgService, EmailService],
  exports: [EmployerOrgService],
})
export class EmployerOrgModule {}
