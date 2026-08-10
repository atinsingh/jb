import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';
import { User, UserSchema } from '../schemas/user.schema';
import { Job, JobSchema } from '../schemas/job.schema';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { EmployerOrg, EmployerOrgSchema } from '../schemas/employer-org.schema';
import {
  EmployerSubscription,
  EmployerSubscriptionSchema,
} from '../employer-billing/schemas/employer-subscription.schema';
import {
  UserSubscription,
  UserSubscriptionSchema,
} from '../schemas/user-subscription.schema';
import {
  IngestionSource,
  IngestionSourceSchema,
} from '../ingestion/schemas/ingestion-source.schema';
import { AdminUsersController } from './admin-users.controller';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminMetricsController } from './admin-metrics.controller';
import { AdminMetricsService } from './admin-metrics.service';

@Module({
  imports: [
    // User-management + job-moderation endpoints reuse the existing services.
    UsersModule,
    JobsModule,
    // Read-only models the metrics aggregator needs. Schemas are imported from
    // their owning modules — never redefined here.
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: EmployerOrg.name, schema: EmployerOrgSchema },
      { name: EmployerSubscription.name, schema: EmployerSubscriptionSchema },
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: IngestionSource.name, schema: IngestionSourceSchema },
    ]),
  ],
  controllers: [AdminUsersController, AdminJobsController, AdminMetricsController],
  providers: [AdminMetricsService],
})
export class AdminModule {}
