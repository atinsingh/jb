import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerCompanyController } from './employer-company.controller';
import { EmployerCompanyService } from './employer-company.service';
import {
  EmployerCompany,
  EmployerCompanySchema,
} from './schemas/employer-company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployerCompany.name, schema: EmployerCompanySchema },
    ]),
  ],
  controllers: [EmployerCompanyController],
  providers: [EmployerCompanyService],
  exports: [EmployerCompanyService, MongooseModule],
})
export class EmployerCompanyModule {}
